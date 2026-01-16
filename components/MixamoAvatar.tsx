'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const SUPABASE_STORAGE_URL = 'https://lcryrsdyrzotjqdxcwtp.supabase.co/storage/v1/object/public/avatars';

// Configurar DRACOLoader (singleton para evitar múltiples instancias)
let dracoLoader: DRACOLoader | null = null;

const getDracoLoader = () => {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });
  }
  return dracoLoader;
};

// URL del modelo base Meshy AI (liviano ~315KB)
const MODEL_URL = `${SUPABASE_STORAGE_URL}/Meshy_AI_Character_output.glb`;

// Escala del avatar Meshy AI - 0.01 para convertir de cm a metros
const AVATAR_SCALE = 0.01;

// Colores por defecto para el avatar
const DEFAULT_COLORS = {
  piel: '#f5d0c5',
  ojos: '#4a90d9',
  cabello: '#3d2314',
  ropa_principal: '#2563eb',
  ropa_secundario: '#1e40af',
  zapatos: '#1f2937',
};

// Mapeo de nombres de materiales/meshes a partes del cuerpo
// Ajustar según los nombres reales en el modelo Meshy AI
const MATERIAL_MAPPING: Record<string, keyof typeof DEFAULT_COLORS> = {
  'skin': 'piel',
  'body': 'piel',
  'head': 'piel',
  'face': 'piel',
  'eye': 'ojos',
  'eyes': 'ojos',
  'hair': 'cabello',
  'shirt': 'ropa_principal',
  'top': 'ropa_principal',
  'torso': 'ropa_principal',
  'pants': 'ropa_secundario',
  'bottom': 'ropa_secundario',
  'legs': 'ropa_secundario',
  'shoes': 'zapatos',
  'feet': 'zapatos',
  'foot': 'zapatos',
};

export interface AvatarColores {
  piel?: string;
  ojos?: string;
  cabello?: string;
  ropa_principal?: string;
  ropa_secundario?: string;
  zapatos?: string;
}

interface MeshyAvatarProps {
  isMoving?: boolean;
  direction?: string;
  colores?: AvatarColores;
}

export const MixamoAvatar: React.FC<MeshyAvatarProps> = ({
  isMoving = false,
  direction = 'front',
  colores = {},
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Referencia estable para colores (evita re-renders)
  const coloresRef = useRef(colores);
  const [coloresKey, setColoresKey] = useState(0);
  
  // Solo actualizar cuando los colores realmente cambian
  useEffect(() => {
    const prev = coloresRef.current;
    const changed = Object.keys({ ...prev, ...colores }).some(
      key => prev[key as keyof AvatarColores] !== colores[key as keyof AvatarColores]
    );
    if (changed) {
      coloresRef.current = colores;
      setColoresKey(k => k + 1);
      console.log('[MeshyAvatar] Colores actualizados');
    }
  }, [colores]);

  // 1. CARGA ESTÁTICA del modelo base Meshy AI
  const gltf = useLoader(GLTFLoader, MODEL_URL, (loader) => {
    loader.setDRACOLoader(getDracoLoader());
  });

  const { animations: loadedAnimations } = gltf;
  const { actions, names } = useAnimations(loadedAnimations, groupRef);

  // 2. CLONACIÓN del modelo y debug de estructura
  const scene = useMemo(() => {
    const clone = gltf.scene.clone();
    
    console.log('[MeshyAvatar] === DEBUG ESTRUCTURA ===');
    console.log('[MeshyAvatar] Scene position:', clone.position.x, clone.position.y, clone.position.z);
    console.log('[MeshyAvatar] Scene children:', clone.children.length);
    
    // Explorar jerarquía
    clone.traverse((child) => {
      console.log('[MeshyAvatar] Child:', child.type, child.name, 
                  'pos:', child.position.x.toFixed(2), child.position.y.toFixed(2), child.position.z.toFixed(2));
      
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
      }
    });
    
    console.log('[MeshyAvatar] === FIN DEBUG ===');
    return clone;
  }, [gltf.scene]);
  
  // Calcular offset de centrado (solo una vez)
  const centerOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    console.log('[MeshyAvatar] BoundingBox center:', center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2));
    console.log('[MeshyAvatar] BoundingBox size:', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2));
    
    // Offset para centrar: mover X y Z al origen, Y al suelo
    const offset = new THREE.Vector3(-center.x, -box.min.y, -center.z);
    console.log('[MeshyAvatar] Offset aplicado:', offset.x.toFixed(2), offset.y.toFixed(2), offset.z.toFixed(2));
    
    return offset;
  }, [gltf.scene]);
  
  // 3. APLICACIÓN DE COLORES (solo cuando cambian)
  useEffect(() => {
    const finalColors = { ...DEFAULT_COLORS, ...coloresRef.current };
    
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const meshName = mesh.name.toLowerCase();
        const materialName = (mesh.material as THREE.Material)?.name?.toLowerCase() || '';
        
        let colorKey: keyof typeof DEFAULT_COLORS | null = null;
        
        for (const [pattern, key] of Object.entries(MATERIAL_MAPPING)) {
          if (meshName.includes(pattern) || materialName.includes(pattern)) {
            colorKey = key;
            break;
          }
        }
        
        if (colorKey && mesh.material) {
          const color = finalColors[colorKey];
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => {
              if ((mat as THREE.MeshStandardMaterial).color) {
                (mat as THREE.MeshStandardMaterial).color.set(color);
              }
            });
          } else if ((mesh.material as THREE.MeshStandardMaterial).color) {
            (mesh.material as THREE.MeshStandardMaterial).color.set(color);
          }
        }
      }
    });
    
    console.log('[MeshyAvatar] Colores aplicados al modelo');
  }, [scene, coloresKey]);

  // 4. CONTROL DE ANIMACIÓN
  useEffect(() => {
    const actionName = names.find(n => 
      n.toLowerCase().includes(isMoving ? 'walk' : 'idle')
    ) || names[0];

    if (actionName && actions[actionName]) {
      actions[actionName].reset().fadeIn(0.2).play();
      return () => {
        actions[actionName]?.fadeOut(0.2);
      };
    }
  }, [actions, names, isMoving]);

  // 5. Rotación según dirección + Log de posición del grupo padre
  useFrame(() => {
    if (!groupRef.current) return;
    
    // Log para debug - ver posición del grupo
    const worldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldPos);
    
    // Solo log cada 60 frames para no saturar
    if (Math.random() < 0.02) {
      console.log('[MixamoAvatar DEBUG] WorldPos:', worldPos.x.toFixed(2), worldPos.y.toFixed(2), worldPos.z.toFixed(2));
    }
    
    const rotations: Record<string, number> = {
      left: -Math.PI / 2,
      right: Math.PI / 2,
      up: Math.PI,
      front: 0,
      down: 0,
    };
    const targetRotation = rotations[direction] || 0;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotation,
      0.1
    );
  });

  return (
    <group ref={groupRef}>
      {/* CUBO DE DEBUG: 0.5m de ancho/profundidad, 1.7m de alto (altura humana aprox) */}
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1.7, 0.5]} />
        <meshStandardMaterial color="cyan" wireframe={false} />
      </mesh>
      
      {/* Flecha para indicar frente */}
      <mesh position={[0, 1.5, 0.4]} rotation={[Math.PI/2, 0, 0]}>
        <coneGeometry args={[0.1, 0.4, 8]} />
        <meshStandardMaterial color="yellow" />
      </mesh>
    </group>
  );
};

export default MixamoAvatar;
