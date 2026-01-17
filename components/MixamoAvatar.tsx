'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useLoader, useGraph } from '@react-three/fiber';
import { useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const SUPABASE_STORAGE_URL = 'https://lcryrsdyrzotjqdxcwtp.supabase.co/storage/v1/object/public/avatars';

// Configurar DRACOLoader
let dracoLoader: DRACOLoader | null = null;
const getDracoLoader = () => {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });
  }
  return dracoLoader;
};

const MODEL_URL = `${SUPABASE_STORAGE_URL}/Meshy_AI_Character_output.glb`;
const AVATAR_SCALE = 0.01;

// ... (resto de constantes de colores igual)
const DEFAULT_COLORS = {
  piel: '#f5d0c5',
  ojos: '#4a90d9',
  cabello: '#3d2314',
  ropa_principal: '#2563eb',
  ropa_secundario: '#1e40af',
  zapatos: '#1f2937',
};

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
  const coloresRef = useRef(colores);
  const [coloresKey, setColoresKey] = useState(0);

  useEffect(() => {
    const prev = coloresRef.current;
    const changed = Object.keys({ ...prev, ...colores }).some(
      key => prev[key as keyof AvatarColores] !== colores[key as keyof AvatarColores]
    );
    if (changed) {
      coloresRef.current = colores;
      setColoresKey(k => k + 1);
    }
  }, [colores]);

  const gltf = useLoader(GLTFLoader, MODEL_URL, (loader) => {
    loader.setDRACOLoader(getDracoLoader());
  });

  // 1. Clonado CORRECTO para SkinnedMesh usando SkeletonUtils.clone
  const scene = useMemo(() => {
    const clonedScene = clone(gltf.scene);
    return clonedScene;
  }, [gltf.scene]);

  // Necesario para useAnimations con SkeletonUtils clone
  const { nodes } = useGraph(scene);
  const { animations: loadedAnimations } = gltf;
  const { actions, names } = useAnimations(loadedAnimations, groupRef);

  // 2. Cálculo de offset para centrar
  const centerOffset = useMemo(() => {
    // Asegurar que la caja se calcule considerando todo (incluyendo skinned meshes)
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    console.log('[MeshyAvatar] BoundingBox Size:', size.x.toFixed(4), size.y.toFixed(4), size.z.toFixed(4));
    console.log('[MeshyAvatar] BoundingBox Center:', center.x.toFixed(4), center.y.toFixed(4), center.z.toFixed(4));
    
    // Si el tamaño es muy pequeño (ej. < 2m), NO aplicar escala 0.01
    // Si el tamaño es grande (ej. > 100m), aplicar escala 0.01
    
    return new THREE.Vector3(-center.x, -box.min.y, -center.z);
  }, [scene]);

  // 3. Aplicación de colores
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
  }, [scene, coloresKey]);

  // 4. Animaciones
  useEffect(() => {
    const actionName = names.find(n => 
      n.toLowerCase().includes(isMoving ? 'walk' : 'idle')
    ) || names[0];

    if (actionName && actions[actionName]) {
      const action = actions[actionName];
      action.reset().fadeIn(0.2).play();
      
      // IMPORTANTE: Si la animación tiene root motion (mueve el personaje),
      // necesitamos desactivarlo o compensarlo si queremos que el control sea manual.
      // Sin embargo, para Mixamo/Meshy generalmente queremos que sigan el hueso root
      // pero si el hueso root se desplaza, se separará del collider.
      
      return () => {
        action.fadeOut(0.2);
      };
    }
  }, [actions, names, isMoving]);

  // 5. Rotación del grupo
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
    <group ref={groupRef}>
      {/* Grupo interno para aplicar escala y offset de centrado */}
      <group 
        scale={[AVATAR_SCALE, AVATAR_SCALE, AVATAR_SCALE]}
        position={[centerOffset.x * AVATAR_SCALE, 0, centerOffset.z * AVATAR_SCALE]}
      >
        <primitive object={scene} />
      </group>
      {/* Ayuda visual: Ejes (1m de largo) */}
      <axesHelper args={[1]} />
      {/* Ayuda visual: Caja envolvente del avatar (debug visual) */}
      <mesh position={[0, 1, 0]} visible={false}>
        <boxGeometry args={[0.5, 2, 0.5]} />
        <meshBasicMaterial color="red" wireframe />
      </mesh>
    </group>
  );
};

export default MixamoAvatar;
