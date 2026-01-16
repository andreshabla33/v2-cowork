'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const SUPABASE_STORAGE_URL = 'https://lcryrsdyrzotjqdxcwtp.supabase.co/storage/v1/object/public/avatars';

// Configurar DRACOLoader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' });

// Mapeo de animaciones disponibles
const ANIMATIONS = {
  idle: `${SUPABASE_STORAGE_URL}/3dpea.com_Standing W_Briefcase Idle.glb`,
  walk: `${SUPABASE_STORAGE_URL}/3dpea.com_Unarmed Walk Forward.glb`,
  salute: `${SUPABASE_STORAGE_URL}/3dpea.com_Salute.glb`,
  run: `${SUPABASE_STORAGE_URL}/3dpea.com_Run To Stop.glb`,
  walkLeft: `${SUPABASE_STORAGE_URL}/3dpea.com_Walk Strafe Left.glb`,
  startWalk: `${SUPABASE_STORAGE_URL}/3dpea.com_Start Walking.glb`,
  turn: `${SUPABASE_STORAGE_URL}/3dpea.com_Backward Right Turn.glb`,
};

interface MixamoAvatarProps {
  animation?: keyof typeof ANIMATIONS;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  isMoving?: boolean;
  direction?: string;
}

export const MixamoAvatar: React.FC<MixamoAvatarProps> = ({
  animation = 'idle',
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isMoving = false,
  direction = 'front',
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Determinar qué animación usar basado en el movimiento
  const currentAnimation = isMoving ? 'walk' : animation;
  const modelUrl = ANIMATIONS[currentAnimation];
  
  // Cargar el modelo GLB con DRACOLoader
  const gltf = useLoader(GLTFLoader, modelUrl, (loader) => {
    loader.setDRACOLoader(dracoLoader);
  });
  
  const { actions } = useAnimations(gltf.animations, groupRef);
  
  // Clonar la escena para evitar problemas con múltiples instancias
  const clonedScene = useMemo(() => gltf.scene.clone(), [gltf.scene]);
  
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
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
};

export default MixamoAvatar;
