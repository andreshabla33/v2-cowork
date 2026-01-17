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

// URLs de animaciones separadas
const ANIMATION_URLS = {
  idle: `${SUPABASE_STORAGE_URL}/Meshy_AI_Animation_Hip_Hop_Dance_2_withSkin.glb`, // Fallback temporal para Idle
  walk: `${SUPABASE_STORAGE_URL}/Meshy_AI_Animation_Walking_withSkin.glb`,
  run: `${SUPABASE_STORAGE_URL}/Meshy_AI_Animation_Running_withSkin.glb`,
  sit: `${SUPABASE_STORAGE_URL}/Meshy_AI_Animation_Stand_to_Sit_Transition_M_withSkin.glb`,
  cheer: `${SUPABASE_STORAGE_URL}/Meshy_AI_Animation_Cheer_with_Both_Hands_withSkin.glb`,
  dance: `${SUPABASE_STORAGE_URL}/Meshy_AI_Animation_Hip_Hop_Dance_2_withSkin.glb`,
};

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
  isRunning?: boolean; // Nuevo prop
  isSitting?: boolean;
  direction?: string;
  reaction?: string | null;
  colores?: AvatarColores;
}

export const MixamoAvatar: React.FC<MeshyAvatarProps> = ({
  isMoving = false,
  isRunning = false,
  isSitting = false,
  direction = 'front',
  reaction = null,
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

  // 1. Cargar Modelo Base
  const gltf = useLoader(GLTFLoader, MODEL_URL, (loader) => {
    loader.setDRACOLoader(getDracoLoader());
  });

  // 2. Cargar Animaciones Externas
  const animGltfs = useLoader(GLTFLoader, Object.values(ANIMATION_URLS) as string[], (loader) => {
    loader.setDRACOLoader(getDracoLoader());
  });

  // 3. Clonado del modelo base (SkinnedMesh)
  const scene = useMemo(() => {
    const clonedScene = clone(gltf.scene);
    return clonedScene;
  }, [gltf.scene]);

  // 4. Preparar Animaciones
  const animations = useMemo(() => {
    const clips: THREE.AnimationClip[] = [];
    const keys = Object.keys(ANIMATION_URLS) as (keyof typeof ANIMATION_URLS)[];

    // Al pasar un array de URLs a useLoader, devuelve un array de GLTFs
    if (Array.isArray(animGltfs)) {
      animGltfs.forEach((animGltf, index) => {
        const key = keys[index];
        if (animGltf.animations && animGltf.animations.length > 0) {
          const clip = animGltf.animations[0].clone();
          clip.name = key;
          clips.push(clip);
        }
      });
    }

    return clips;
  }, [animGltfs]);

  // 5. Setup Animation Hook
  const { actions } = useAnimations(animations, groupRef);

  // ... (Cálculo de offset igual)
  const { centerOffset, autoScale } = useMemo(() => {
    const box = new THREE.Box3();
    let hasMeshes = false;

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.computeBoundingBox();
          if (mesh.geometry.boundingBox) {
            box.union(mesh.geometry.boundingBox);
            hasMeshes = true;
          }
        }
      }
    });

    if (!hasMeshes || box.isEmpty()) {
      box.setFromObject(scene);
    }

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Auto-escalado: Objetivo 1.5m
    const TARGET_HEIGHT = 1.5;
    let scale = 1;

    if (size.y > 0.01) {
      scale = TARGET_HEIGHT / size.y;
      if (scale > 1000 || scale < 0.001) scale = 1;
    }

    const offset = new THREE.Vector3(-center.x, -box.min.y, -center.z);

    return { centerOffset: offset, autoScale: scale };
  }, [scene]);

  // ... (Aplicación de colores igual)
  useEffect(() => {
    const finalColors = { ...DEFAULT_COLORS, ...coloresRef.current };

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // @ts-ignore
        const material = mesh.material as THREE.MeshStandardMaterial;
        const matName = material?.name || 'sin_nombre';

        const hasTexture = !!material.map || !!material.emissiveMap;
        const hasVertexColors = material.vertexColors === true;

        if (hasTexture || hasVertexColors) {
          material.color.set(0xffffff);
          material.needsUpdate = true;
          return;
        }

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

  // 6. Lógica de Reproducción de Animaciones
  useEffect(() => {
    // Prioridad: Reacción > Sentado > Moviendo > Idle
    let actionName = 'idle';

    if (reaction) {
      if (reaction === '👍' || reaction.includes('cheer')) actionName = 'cheer';
      else if (reaction === '🔥' || reaction.includes('dance')) actionName = 'dance';
      else actionName = 'cheer'; // Default reaction fallback
    } else if (isSitting) {
      actionName = 'sit';
    } else if (isMoving) {
      actionName = isRunning ? 'run' : 'walk';
    }

    const currentAction = actions[actionName];

    if (currentAction) {
      // Transición suave
      currentAction.reset().fadeIn(0.2).play();

      // Configuración de loop
      if (actionName === 'sit') {
        currentAction.setLoop(THREE.LoopOnce, 1);
        currentAction.clampWhenFinished = true;
      } else if (actionName === 'cheer' || actionName === 'dance') {
        currentAction.setLoop(THREE.LoopRepeat, Infinity); // O LoopOnce si prefieres que termine
      } else {
        currentAction.setLoop(THREE.LoopRepeat, Infinity);
      }

      // Detener otras animaciones
      return () => {
        currentAction.fadeOut(0.2);
      };
    }
  }, [actions, isMoving, isSitting, reaction]);

  // 7. Rotación del grupo
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
