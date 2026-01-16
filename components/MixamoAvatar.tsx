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

// Mapeo de animaciones disponibles (nombres URL-encoded)
const ANIMATIONS = {
  idle: `${SUPABASE_STORAGE_URL}/De%20pie%20con%20maletin%20inactivo`,
  walk: `${SUPABASE_STORAGE_URL}/Caminata%20desarmada%20hacia%20adelante`,
  salute: `${SUPABASE_STORAGE_URL}/Saludo`,
  run: `${SUPABASE_STORAGE_URL}/Ejecutar%20para%20detener`,
  walkLeft: `${SUPABASE_STORAGE_URL}/Walk%20Strafe%20Left`,
  startWalk: `${SUPABASE_STORAGE_URL}/Empieza%20a%20caminar`,
  turn: `${SUPABASE_STORAGE_URL}/Giro%20hacia%20atras%20a%20la%20derecha`,
};

// Altura objetivo del avatar en unidades de Three.js (metros)
const TARGET_HEIGHT = 1.8;

interface MixamoAvatarProps {
  animation?: keyof typeof ANIMATIONS;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  isMoving?: boolean;
  direction?: string;
  targetHeight?: number;
}

// Escala estándar para modelos Mixamo (cm a m)
const MIXAMO_SCALE = 0.01;

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
  
  // Cargar el modelo GLB con DRACOLoader
  const gltf = useLoader(GLTFLoader, modelUrl, (loader) => {
    loader.setDRACOLoader(dracoLoader);
  });
  
  const { actions } = useAnimations(gltf.animations, groupRef);
  
  // Clonar la escena y aplicar escala Mixamo estándar (0.01)
  const clonedScene = useMemo(() => {
    const scene = gltf.scene.clone();
    // Mixamo exporta en centímetros, Three.js usa metros
    // Escala 0.01 convierte cm a m (avatar ~170-180cm = 1.7-1.8 unidades)
    scene.scale.set(MIXAMO_SCALE, MIXAMO_SCALE, MIXAMO_SCALE);
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
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={clonedScene} />
    </group>
  );
};

export default MixamoAvatar;
