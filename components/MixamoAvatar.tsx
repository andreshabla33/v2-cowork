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

// Mapeo de animaciones disponibles (nombres actuales en Supabase Storage)
const ANIMATIONS = {
  idle: `${SUPABASE_STORAGE_URL}/Standing%20W_Briefcase%20Idle`,
  walk: `${SUPABASE_STORAGE_URL}/Unarmed%20Walk%20Forward`,
  salute: `${SUPABASE_STORAGE_URL}/Salute`,
  run: `${SUPABASE_STORAGE_URL}/Run%20To%20Stop`,
  walkLeft: `${SUPABASE_STORAGE_URL}/Walk%20Strafe%20Left`,
  startWalk: `${SUPABASE_STORAGE_URL}/Start%20Walking`,
  turn: `${SUPABASE_STORAGE_URL}/Backward%20Right%20Turn`,
};

interface MixamoAvatarProps {
  animation?: keyof typeof ANIMATIONS;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  isMoving?: boolean;
  direction?: string;
  targetHeight?: number;
}

// Altura objetivo del avatar en unidades Three.js (metros)
const TARGET_HEIGHT = 1.8;

export const MixamoAvatar: React.FC<MixamoAvatarProps> = ({
  animation = 'idle',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isMoving = false,
  direction = 'front',
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Determinar qué animación usar basado en el movimiento
  const currentAnimation = isMoving ? 'walk' : animation;
  const modelUrl = ANIMATIONS[currentAnimation];
  
  // Cargar el modelo GLB con DRACOLoader (singleton)
  const gltf = useLoader(GLTFLoader, modelUrl, (loader) => {
    loader.setDRACOLoader(getDracoLoader());
  });
  
  const { actions } = useAnimations(gltf.animations, groupRef);
  
  // Escala para que el avatar mida ~1.4 unidades (igual que el chibi)
  // El modelo original mide ~182 unidades, queremos ~1.4
  const AVATAR_SCALE = 1.4 / 182; // ≈ 0.0077
  
  // Clonar la escena sin modificar la escala interna
  const clonedScene = useMemo(() => {
    const scene = gltf.scene.clone();
    console.log(`[MixamoAvatar] Escala aplicada al grupo: ${AVATAR_SCALE.toFixed(6)}`);
    return scene;
  }, [gltf.scene]);
  
  // Reproducir la animación
  useEffect(() => {
    if (actions && gltf.animations.length > 0) {
      const actionName = gltf.animations[0]?.name;
      if (actionName && actions[actionName]) {
        actions[actionName].reset().fadeIn(0.3).play();
        return () => {
          actions[actionName]?.fadeOut(0.3);
        };
      }
    }
  }, [actions, gltf.animations, currentAnimation]);

  // Rotación según dirección
  useFrame(() => {
    if (!groupRef.current) return;
    
    const rotations: Record<string, number> = {
      left: -Math.PI / 2,
      right: Math.PI / 2,
      up: Math.PI,
      front: 0,
      down: 0,
    };
    
    // Interpolación suave de rotación
    const targetRotation = rotations[direction] || 0;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotation,
      0.1
    );
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={[AVATAR_SCALE, AVATAR_SCALE, AVATAR_SCALE]}>
      <primitive object={clonedScene} />
    </group>
  );
};

export default MixamoAvatar;
