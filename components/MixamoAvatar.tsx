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
  
  // Clonar y normalizar automáticamente basado en bounding box
  const clonedScene = useMemo(() => {
    const scene = gltf.scene.clone();
    
    // Calcular bounding box del modelo original
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Calcular escala para que altura = TARGET_HEIGHT
    const currentHeight = size.y;
    const scale = TARGET_HEIGHT / currentHeight;
    
    console.log(`[MixamoAvatar] Altura original: ${currentHeight.toFixed(2)}, Escala aplicada: ${scale.toFixed(6)}`);
    
    // Aplicar escala normalizada
    scene.scale.set(scale, scale, scale);
    
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
