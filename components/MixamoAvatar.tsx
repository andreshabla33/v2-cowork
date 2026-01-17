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

  // 2. Cálculo de offset para centrar y ESCALA AUTOMÁTICA
  const { centerOffset, autoScale } = useMemo(() => {
    // Asegurar que la caja se calcule considerando todo (incluyendo skinned meshes)
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    console.log('[MeshyAvatar] BoundingBox Size:', size.x.toFixed(4), size.y.toFixed(4), size.z.toFixed(4));
    console.log('[MeshyAvatar] BoundingBox Center:', center.x.toFixed(4), center.y.toFixed(4), center.z.toFixed(4));
    
    // Calcular escala para normalizar altura a ~1.75m (altura humana promedio)
    // Si la altura es 0 o muy pequeña (error), usar 1
    const targetHeight = 1.75;
    let scale = 1;
    
    if (size.y > 0.001) {
      scale = targetHeight / size.y;
    } else {
      console.warn('[MeshyAvatar] Altura no detectada (0), usando escala 1');
    }

    // Offset para centrar (se aplicará al grupo escalado, así que usamos coordenadas locales relativas al centro)
    // El objetivo es que (0,0,0) del mundo coincida con (center.x, min.y, center.z) del modelo
    const offset = new THREE.Vector3(-center.x, -box.min.y, -center.z);
    
    return { centerOffset: offset, autoScale: scale };
  }, [scene]);

  // 3. Aplicación de colores con Debug
  useEffect(() => {
    const finalColors = { ...DEFAULT_COLORS, ...coloresRef.current };
    console.log('[MeshyAvatar] Aplicando colores:', JSON.stringify(finalColors));
    
    let meshesFound = 0;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshesFound++;
        const mesh = child as THREE.Mesh;
        const meshName = mesh.name.toLowerCase();
        const materialName = (mesh.material as THREE.Material)?.name?.toLowerCase() || 'unknown';
        
        console.log(`[MeshyAvatar Debug] Mesh encontrada: "${mesh.name}" Material: "${materialName}"`);
        
        let colorKey: keyof typeof DEFAULT_COLORS | null = null;
        for (const [pattern, key] of Object.entries(MATERIAL_MAPPING)) {
          if (meshName.includes(pattern) || materialName.includes(pattern)) {
            colorKey = key;
            break;
          }
        }
        
        if (colorKey && mesh.material) {
          const color = finalColors[colorKey];
          console.log(`  -> Aplicando color ${colorKey} (${color}) a ${mesh.name}`);
          
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => {
              if ((mat as THREE.MeshStandardMaterial).color) {
                (mat as THREE.MeshStandardMaterial).color.set(color);
              }
            });
          } else if ((mesh.material as THREE.MeshStandardMaterial).color) {
            (mesh.material as THREE.MeshStandardMaterial).color.set(color);
          }
        } else {
          console.log(`  -> No match found for mapping`);
        }
      }
    });
    console.log(`[MeshyAvatar] Total meshes processed: ${meshesFound}`);
  }, [scene, coloresKey]);

  // 4. Animaciones
  useEffect(() => {
    const actionName = names.find(n => 
      n.toLowerCase().includes(isMoving ? 'walk' : 'idle')
    ) || names[0];

    if (actionName && actions[actionName]) {
      const action = actions[actionName];
      action.reset().fadeIn(0.2).play();
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
      {/* Usamos autoScale en lugar de AVATAR_SCALE fijo */}
      <group 
        scale={[autoScale, autoScale, autoScale]}
        position={[centerOffset.x * autoScale, 0, centerOffset.z * autoScale]}
      >
        <primitive object={scene} />
      </group>
      {/* Ayuda visual: Ejes (1m de largo) */}
      <axesHelper args={[0.5]} />
    </group>
  );
};

export default MixamoAvatar;
