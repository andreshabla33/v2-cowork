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
  // Eliminado fallback agresivo para evitar teñir todo de azul
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

  // 2. Cálculo de offset para centrar y ESCALA AUTOMÁTICA ROBUSTA
  const { centerOffset, autoScale } = useMemo(() => {
    // Calcular bounding box iterando geometrías para mayor precisión en SkinnedMesh
    const box = new THREE.Box3();
    let hasMeshes = false;
    
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Usar la geometría base para el tamaño, ya que la caja del objeto puede estar mal en T-pose
        if (mesh.geometry) {
          mesh.geometry.computeBoundingBox();
          if (mesh.geometry.boundingBox) {
            // Transformar la caja de la geometría al espacio del mundo (o local del root)
            // Nota: Esto asume escala 1 en los hijos, lo cual suele ser cierto.
            box.union(mesh.geometry.boundingBox);
            hasMeshes = true;
          }
        }
      }
    });

    // Fallback si no hay meshes o cálculo falló
    if (!hasMeshes || box.isEmpty()) {
      box.setFromObject(scene);
    }

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    console.log('[MeshyAvatar] Robust BoundingBox Size:', size.x.toFixed(4), size.y.toFixed(4), size.z.toFixed(4));
    
    // Auto-escalado: Objetivo 1.5m (Estilo Avatar/Chibi equilibrado)
    const TARGET_HEIGHT = 1.5;
    let scale = 1;
    
    // Lógica de seguridad para el escalado
    if (size.y > 0.01) {
      scale = TARGET_HEIGHT / size.y;
      
      // Evitar escalas extremas (errores de medición)
      if (scale > 1000 || scale < 0.001) {
        console.warn(`[MeshyAvatar] Escala calculada extrema (${scale}), forzando 1.0`);
        scale = 1;
      } else {
        console.log(`[MeshyAvatar] Auto-Scale: ${size.y.toFixed(4)}m -> ${TARGET_HEIGHT}m (Factor: ${scale.toFixed(4)})`);
      }
    } else {
      console.warn('[MeshyAvatar] Altura detectada inválida, usando escala 1');
    }

    // Offset para centrar en (0,0,0)
    // El offset se calcula inverso al centro de la caja original
    const offset = new THREE.Vector3(-center.x, -box.min.y, -center.z);
    
    return { centerOffset: offset, autoScale: scale };
  }, [scene]);

  // 3. Aplicación de colores con Debug Extendido
  useEffect(() => {
    const finalColors = { ...DEFAULT_COLORS, ...coloresRef.current };
    
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // @ts-ignore
        const material = mesh.material as THREE.MeshStandardMaterial;
        const matName = material?.name || 'sin_nombre';
        
        // Verificar texturas y Vertex Colors
        const hasTexture = !!material.map || !!material.emissiveMap;
        const hasVertexColors = material.vertexColors === true;
        
        console.log(`[MeshyAvatar Debug] Mesh: "${mesh.name}" | Map: ${hasTexture} | VColors: ${hasVertexColors}`);

        if (hasTexture || hasVertexColors) {
          console.log(`  -> Preservando apariencia original de ${mesh.name}`);
          material.color.set(0xffffff);
          material.needsUpdate = true;
          return;
        }

        // Solo colorear si no tiene ni textura ni vertex colors
        let colorKey: keyof typeof DEFAULT_COLORS | null = null;
        for (const [pattern, key] of Object.entries(MATERIAL_MAPPING)) {
          if (mesh.name.toLowerCase().includes(pattern) || matName.toLowerCase().includes(pattern)) {
            colorKey = key;
            break;
          }
        }
        
        if (colorKey) {
          const color = finalColors[colorKey];
          material.color.set(color);
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
    </group>
  );
};

export default MixamoAvatar;
