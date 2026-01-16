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

// URLs de animaciones en Supabase Storage
const ANIMATIONS_URLS = {
  idle: `${SUPABASE_STORAGE_URL}/Standing%20W_Briefcase%20Idle`,
  walk: `${SUPABASE_STORAGE_URL}/Unarmed%20Walk%20Forward`,
  salute: `${SUPABASE_STORAGE_URL}/Salute`,
  run: `${SUPABASE_STORAGE_URL}/Run%20To%20Stop`,
  walkLeft: `${SUPABASE_STORAGE_URL}/Walk%20Strafe%20Left`,
  startWalk: `${SUPABASE_STORAGE_URL}/Start%20Walking`,
  turn: `${SUPABASE_STORAGE_URL}/Backward%20Right%20Turn`,
};

// Escala correcta para el avatar
const AVATAR_SCALE = 0.0077;

interface MixamoAvatarProps {
  animation?: keyof typeof ANIMATIONS_URLS;
  position?: [number, number, number];
  rotation?: [number, number, number];
  isMoving?: boolean;
  direction?: string;
}

export const MixamoAvatar: React.FC<MixamoAvatarProps> = ({
  animation = 'idle',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isMoving = false,
  direction = 'front',
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // 1. CARGA ESTÁTICA: Siempre cargamos el modelo 'idle' como base
  // Esto evita recargas constantes que causan Context Lost
  const gltf = useLoader(GLTFLoader, ANIMATIONS_URLS.idle, (loader) => {
    loader.setDRACOLoader(getDracoLoader());
  });

  const { animations: loadedAnimations } = gltf;
  const { actions, names } = useAnimations(loadedAnimations, groupRef);

  // 2. CLONACIÓN Y ESCALA EN OBJETO RAÍZ
  const scene = useMemo(() => {
    const clone = gltf.scene.clone();
    
    // 1. Aplicar escala al OBJETO RAÍZ del GLTF
    clone.scale.set(AVATAR_SCALE, AVATAR_SCALE, AVATAR_SCALE);
    
    // 2. Forzar actualización de matrices para que las hijas se enteren
    clone.updateMatrixWorld(true);
    
    // 3. Configurar sombras en meshes
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    console.log(`[MixamoAvatar] Escala en raíz: ${AVATAR_SCALE}`);
    return clone;
  }, [gltf.scene]);

  // 3. CONTROL DE ANIMACIÓN (usa animaciones del archivo base)
  useEffect(() => {
    // Buscar animación por nombre (idle o walk si existe)
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
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={scene} />
      
      {/* CUBO DE REFERENCIA 1 METRO - TEMPORAL PARA DIAGNÓSTICO */}
      <mesh position={[1, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" wireframe />
      </mesh>
    </group>
  );
};

export default MixamoAvatar;
