'use client';

import React, { useRef, useEffect, useMemo } from 'react';
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
  position?: [number, number, number];
  rotation?: [number, number, number];
  isMoving?: boolean;
  direction?: string;
  colores?: AvatarColores;
}

export const MixamoAvatar: React.FC<MeshyAvatarProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isMoving = false,
  direction = 'front',
  colores = {},
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Combinar colores por defecto con los personalizados
  const finalColors = useMemo(() => ({
    ...DEFAULT_COLORS,
    ...colores,
  }), [colores]);

  // 1. CARGA ESTÁTICA del modelo base Meshy AI
  const gltf = useLoader(GLTFLoader, MODEL_URL, (loader) => {
    loader.setDRACOLoader(getDracoLoader());
  });

  const { animations: loadedAnimations } = gltf;
  const { actions, names } = useAnimations(loadedAnimations, groupRef);

  // 2. CLONACIÓN Y APLICACIÓN DE COLORES
  const scene = useMemo(() => {
    const clone = gltf.scene.clone();
    
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        
        // Intentar determinar qué parte del cuerpo es este mesh
        const meshName = mesh.name.toLowerCase();
        const materialName = (mesh.material as THREE.Material)?.name?.toLowerCase() || '';
        
        // Buscar coincidencia en el mapeo
        let colorKey: keyof typeof DEFAULT_COLORS | null = null;
        
        for (const [pattern, key] of Object.entries(MATERIAL_MAPPING)) {
          if (meshName.includes(pattern) || materialName.includes(pattern)) {
            colorKey = key;
            break;
          }
        }
        
        // Aplicar color si encontramos coincidencia
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

    console.log(`[MeshyAvatar] Modelo cargado con colores aplicados`);
    return clone;
  }, [gltf.scene, finalColors]);

  // 3. CONTROL DE ANIMACIÓN
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

  // 4. Rotación según dirección
  useFrame(() => {
    if (!groupRef.current) return;
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
      position={position} 
      rotation={rotation}
      scale={[AVATAR_SCALE, AVATAR_SCALE, AVATAR_SCALE]}
    >
      <primitive object={scene} />
    </group>
  );
};

export default MixamoAvatar;
