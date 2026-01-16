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

// Escala del avatar Meshy AI (ajustar según el modelo)
const AVATAR_SCALE = 1.0;

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

  // 2. CLONACIÓN del modelo y CENTRADO usando bounding box
  const scene = useMemo(() => {
    const clone = gltf.scene.clone();
    
    // Calcular bounding box para centrar el modelo
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    console.log('[MeshyAvatar] BoundingBox center:', center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2));
    console.log('[MeshyAvatar] BoundingBox size:', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2));
    
    // Mover el modelo para que su centro esté en el origen (solo X y Z, Y en el suelo)
    clone.position.set(-center.x, -box.min.y, -center.z);
    
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
      }
    });

    console.log('[MeshyAvatar] Modelo centrado - nueva pos:', clone.position.x.toFixed(2), clone.position.y.toFixed(2), clone.position.z.toFixed(2));
    return clone;
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
      console.log('[MeshyAvatar] WorldPos:', worldPos.x.toFixed(2), worldPos.y.toFixed(2), worldPos.z.toFixed(2));
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
    <group 
      ref={groupRef} 
      scale={[AVATAR_SCALE, AVATAR_SCALE, AVATAR_SCALE]}
    >
      <primitive object={scene} />
    </group>
  );
};

export default MixamoAvatar;
