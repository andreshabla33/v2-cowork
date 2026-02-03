'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useGraph } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { supabase } from '../lib/supabase';

// ============== TIPOS ==============
interface AnimationConfig {
  id: string;
  nombre: string;
  url: string;
  loop: boolean;
  orden: number;
}

interface Avatar3DConfig {
  id: string;
  nombre: string;
  modelo_url: string;
  escala: number;
  animaciones?: AnimationConfig[];
}

// Estados de animación disponibles
export type AnimationState = 'idle' | 'walk' | 'run' | 'cheer' | 'dance' | 'sit' | 'wave' | 'jump' | 'victory';

interface GLTFAvatarProps {
  avatarConfig?: Avatar3DConfig | null;
  animationState?: AnimationState;
  direction?: string;
  skinColor?: string;
  clothingColor?: string;
  scale?: number;
}

// URL base de Supabase Storage
const STORAGE_BASE = 'https://lcryrsdyrzotjqdxcwtp.supabase.co/storage/v1/object/public/avatars';

// URLs de animaciones desde Supabase Storage
const ANIMATION_URLS: Record<AnimationState, string> = {
  idle: `${STORAGE_BASE}/Meshy_AI_Animation_Short_Breathe_and_Look_Around_withSkin.glb`,
  walk: `${STORAGE_BASE}/Meshy_AI_Animation_Walking_withSkin.glb`,
  run: `${STORAGE_BASE}/Meshy_AI_Animation_Running_withSkin.glb`,
  cheer: `${STORAGE_BASE}/Meshy_AI_Animation_Cheer_with_Both_Hands_withSkin.glb`,
  dance: `${STORAGE_BASE}/Meshy_AI_Animation_Hip_Hop_Dance_2_withSkin.glb`,
  sit: `${STORAGE_BASE}/Meshy_AI_Animation_Stand_to_Sit_Transition_M_withSkin.glb`,
  wave: `${STORAGE_BASE}/Meshy_AI_Animation_Agree_Gesture_withSkin.glb`,
  jump: `${STORAGE_BASE}/Meshy_AI_Animation_Happy_jump_f_withSkin.glb`,
  victory: `${STORAGE_BASE}/Meshy_AI_Animation_Victory_Cheer_withSkin.glb`,
};

// URL del modelo base (sin animación)
const BASE_MODEL_URL = `${STORAGE_BASE}/Meshy_AI_Character_output.glb`;

// Animaciones que hacen loop
const LOOP_ANIMATIONS: AnimationState[] = ['idle', 'walk', 'run', 'dance'];

// ============== COMPONENTE PRINCIPAL AVATAR GLTF ==============
export const GLTFAvatar: React.FC<GLTFAvatarProps> = ({ 
  avatarConfig,
  animationState = 'idle',
  direction = 'front',
  skinColor,
  clothingColor,
  scale = 1
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationState>('idle');
  
  // URL del modelo base
  const modelUrl = avatarConfig?.modelo_url || ANIMATION_URLS.idle;
  
  // Cargar modelo principal
  const { scene, animations: baseAnimations } = useGLTF(modelUrl);
  
  // Clonar la escena correctamente para soportar SkinnedMesh
  const clone = useMemo(() => {
    const clonedScene = SkeletonUtils.clone(scene);
    return clonedScene;
  }, [scene]);

  // Obtener nodos del grafo clonado (necesario para animated components si los hubiera)
  const { nodes } = useGraph(clone);

  // Cargar todas las animaciones
  const walkGltf = useGLTF(ANIMATION_URLS.walk);
  const runGltf = useGLTF(ANIMATION_URLS.run);
  const cheerGltf = useGLTF(ANIMATION_URLS.cheer);
  const danceGltf = useGLTF(ANIMATION_URLS.dance);
  const sitGltf = useGLTF(ANIMATION_URLS.sit);
  const waveGltf = useGLTF(ANIMATION_URLS.wave);
  const jumpGltf = useGLTF(ANIMATION_URLS.jump);
  const victoryGltf = useGLTF(ANIMATION_URLS.victory);
  
  // Combinar todas las animaciones con nombres únicos
  const allAnimations = useMemo(() => {
    const anims: THREE.AnimationClip[] = [];
    
    // Agregar animación base como idle (ahora viene con animación de respirar)
    if (baseAnimations.length > 0) {
      const idleAnim = baseAnimations[0].clone();
      idleAnim.name = 'idle';
      anims.push(idleAnim);
    }
    
    // Agregar walk
    if (walkGltf.animations.length > 0) {
      const walkAnim = walkGltf.animations[0].clone();
      walkAnim.name = 'walk';
      anims.push(walkAnim);
    }
    
    // Agregar run
    if (runGltf.animations.length > 0) {
      const runAnim = runGltf.animations[0].clone();
      runAnim.name = 'run';
      anims.push(runAnim);
    }
    
    // Agregar cheer
    if (cheerGltf.animations.length > 0) {
      const cheerAnim = cheerGltf.animations[0].clone();
      cheerAnim.name = 'cheer';
      anims.push(cheerAnim);
    }
    
    // Agregar dance
    if (danceGltf.animations.length > 0) {
      const danceAnim = danceGltf.animations[0].clone();
      danceAnim.name = 'dance';
      anims.push(danceAnim);
    }
    
    // Agregar sit
    if (sitGltf.animations.length > 0) {
      const sitAnim = sitGltf.animations[0].clone();
      sitAnim.name = 'sit';
      anims.push(sitAnim);
    }
    
    // Agregar wave
    if (waveGltf.animations.length > 0) {
      const waveAnim = waveGltf.animations[0].clone();
      waveAnim.name = 'wave';
      anims.push(waveAnim);
    }
    
    // Agregar jump
    if (jumpGltf.animations.length > 0) {
      const jumpAnim = jumpGltf.animations[0].clone();
      jumpAnim.name = 'jump';
      anims.push(jumpAnim);
    }
    
    // Agregar victory
    if (victoryGltf.animations.length > 0) {
      const victoryAnim = victoryGltf.animations[0].clone();
      victoryAnim.name = 'victory';
      anims.push(victoryAnim);
    }
    
    return anims;
  }, [baseAnimations, walkGltf.animations, runGltf.animations, cheerGltf.animations, danceGltf.animations, sitGltf.animations, waveGltf.animations, jumpGltf.animations, victoryGltf.animations]);
  
  // Configurar animaciones usando el ref del grupo raíz
  const { actions } = useAnimations(allAnimations, groupRef);

  // Cambiar animación según estado
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return;
    
    const targetAnim = animationState;
    
    if (currentAnimation !== targetAnim) {
      // Fade out animación actual
      const current = actions[currentAnimation];
      if (current) {
        current.fadeOut(0.2);
      }
      
      // Fade in nueva animación
      const next = actions[targetAnim];
      if (next) {
        next.reset();
        next.setLoop(
          LOOP_ANIMATIONS.includes(targetAnim) ? THREE.LoopRepeat : THREE.LoopOnce,
          LOOP_ANIMATIONS.includes(targetAnim) ? Infinity : 1
        );
        next.clampWhenFinished = !LOOP_ANIMATIONS.includes(targetAnim);
        next.fadeIn(0.2).play();
        setCurrentAnimation(targetAnim);
      }
    }
  }, [animationState, actions, currentAnimation]);

  // Iniciar animación idle por defecto
  useEffect(() => {
    if (actions && actions['idle']) {
      actions['idle'].play();
    }
  }, [actions]);

  // Aplicar colores personalizados
  useEffect(() => {
    if (clone && (skinColor || clothingColor)) {
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (clothingColor && child.name.toLowerCase().includes('body')) {
            material.color = new THREE.Color(clothingColor);
          }
          if (skinColor && (child.name.toLowerCase().includes('skin') || child.name.toLowerCase().includes('head'))) {
            material.color = new THREE.Color(skinColor);
          }
        }
      });
    }
  }, [clone, skinColor, clothingColor]);

  // Rotación según dirección
  useFrame(() => {
    if (!groupRef.current) return;
    
    const rotations: Record<string, number> = {
      left: -Math.PI / 2,
      right: Math.PI / 2,
      up: Math.PI,
      back: Math.PI,
      front: 0,
      down: 0,
    };
    
    const targetRotation = rotations[direction] || 0;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotation,
      0.15
    );
  });

  const avatarScale = (avatarConfig?.escala || 1) * scale;

  return (
    <group ref={groupRef} scale={[avatarScale, avatarScale, avatarScale]}>
      <primitive object={clone} />
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

// ============== HOOK PARA CARGAR AVATAR Y ANIMACIONES ==============
export const useAvatar3D = (userId?: string) => {
  const [avatarConfig, setAvatarConfig] = useState<Avatar3DConfig | null>(null);
  const [animaciones, setAnimaciones] = useState<AnimationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAvatar = async () => {
      try {
        setLoading(true);
        
        let avatarId: string | null = null;
        
        // Si hay userId, buscar el avatar asignado
        if (userId) {
          const { data: usuario } = await supabase
            .from('usuarios')
            .select('avatar_3d_id')
            .eq('id', userId)
            .single();
          
          avatarId = usuario?.avatar_3d_id || null;
        }
        
        // Si no hay avatar asignado, obtener el default
        if (!avatarId) {
          const { data: defaultAvatar } = await supabase
            .from('avatares_3d')
            .select('id')
            .eq('activo', true)
            .order('orden', { ascending: true })
            .limit(1)
            .single();
          
          avatarId = defaultAvatar?.id || null;
        }
        
        if (avatarId) {
          // Cargar avatar
          const { data: avatar } = await supabase
            .from('avatares_3d')
            .select('*')
            .eq('id', avatarId)
            .single();
          
          // Cargar animaciones del avatar
          const { data: anims } = await supabase
            .from('avatar_animaciones')
            .select('*')
            .eq('avatar_id', avatarId)
            .eq('activo', true)
            .order('orden', { ascending: true });
          
          if (avatar) {
            setAvatarConfig({
              ...avatar,
              animaciones: anims || []
            } as Avatar3DConfig);
          }
          
          if (anims) {
            setAnimaciones(anims as AnimationConfig[]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando avatar');
      } finally {
        setLoading(false);
      }
    };

    loadAvatar();
  }, [userId]);

  return { avatarConfig, animaciones, loading, error };
};

// ============== HOOK PARA CONTROLES DE TECLADO ==============
export const useAvatarControls = () => {
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [direction, setDirection] = useState<string>('front');
  const [isMoving, setIsMoving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const keysPressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable);
      if (isTyping) return;
      
      keysPressed.current.add(e.code);
      
      // Shift para correr
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setIsRunning(true);
      }
      
      // Teclas de acción especiales
      if (e.code === 'KeyE') setAnimationState('cheer');
      if (e.code === 'KeyQ') setAnimationState('dance');
      if (e.code === 'KeyC') setAnimationState('sit');
      
      // Flechas y WASD para movimiento
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
      
      // Soltar shift
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setIsRunning(false);
      }
      
      // Volver a idle cuando se sueltan teclas de acción
      if (['KeyE', 'KeyQ', 'KeyC'].includes(e.code)) {
        setAnimationState('idle');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Actualizar estado de movimiento
  const updateMovement = (dx: number, dy: number) => {
    const moving = dx !== 0 || dy !== 0;
    setIsMoving(moving);
    
    if (moving) {
      // Determinar dirección
      if (Math.abs(dx) > Math.abs(dy)) {
        setDirection(dx > 0 ? 'right' : 'left');
      } else {
        setDirection(dy > 0 ? 'up' : 'front');
      }
      
      // Cambiar animación según si corre o camina
      setAnimationState(isRunning ? 'run' : 'walk');
    } else if (animationState === 'walk' || animationState === 'run') {
      setAnimationState('idle');
    }
  };

  return {
    animationState,
    setAnimationState,
    direction,
    setDirection,
    isMoving,
    isRunning,
    keysPressed,
    updateMovement
  };
};

// Precargar todos los modelos
Object.values(ANIMATION_URLS).forEach(url => {
  useGLTF.preload(url);
});

// ============== AVATAR PROCEDURAL CHIBI (FALLBACK) ==============
interface ProceduralAvatarProps {
  config: {
    skinColor?: string;
    clothingColor?: string;
    hairColor?: string;
    hairStyle?: string;
    accessory?: string;
    eyeColor?: string;
  };
  isMoving?: boolean;
  direction?: string;
}

export const ProceduralChibiAvatar: React.FC<ProceduralAvatarProps> = ({ 
  config, 
  isMoving = false, 
  direction = 'front' 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(0);

  const { 
    skinColor = '#fcd34d', 
    clothingColor = '#6366f1', 
    hairColor = '#4b2c20', 
    hairStyle = 'default', 
    accessory = 'none', 
    eyeColor = '#3b82f6' 
  } = config || {};

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    time.current += delta;
    
    // Animación de bounce
    const bounceSpeed = isMoving ? 12 : 2;
    const bounceHeight = isMoving ? 0.15 : 0.05;
    groupRef.current.position.y = Math.sin(time.current * bounceSpeed) * bounceHeight;
    
    // Rotación según dirección (invertido para vista isométrica)
    const rotations: Record<string, number> = {
      left: -Math.PI / 2,
      right: Math.PI / 2,
      up: Math.PI,
      front: 0,
      down: 0,
    };
    groupRef.current.rotation.y = rotations[direction] || 0;
  });

  return (
    <group ref={groupRef}>
      {/* === CUERPO === */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.35, 12, 24]} />
        <meshStandardMaterial color={clothingColor} roughness={0.6} />
      </mesh>
      
      {/* Detalle de ropa - cuello */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.1, 16]} />
        <meshStandardMaterial color={clothingColor} roughness={0.6} />
      </mesh>

      {/* === CABEZA === */}
      <group position={[0, 1.05, 0]}>
        {/* Cabeza base */}
        <mesh castShadow>
          <sphereGeometry args={[0.38, 24, 24]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>
        
        {/* Orejas */}
        <mesh position={[-0.35, 0, 0]} castShadow>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>
        <mesh position={[0.35, 0, 0]} castShadow>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} />
        </mesh>

        {/* === CABELLO === */}
        {hairStyle === 'default' && (
          <>
            <mesh position={[0, 0.15, 0]} castShadow>
              <sphereGeometry args={[0.36, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={hairColor} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.1, 0.25]} castShadow>
              <boxGeometry args={[0.5, 0.15, 0.15]} />
              <meshStandardMaterial color={hairColor} roughness={0.8} />
            </mesh>
          </>
        )}
        
        {hairStyle === 'spiky' && (
          <>
            <mesh position={[0, 0.25, 0]} castShadow>
              <coneGeometry args={[0.25, 0.4, 8]} />
              <meshStandardMaterial color={hairColor} roughness={0.8} />
            </mesh>
            <mesh position={[0.15, 0.2, 0]} rotation={[0, 0, -0.4]} castShadow>
              <coneGeometry args={[0.12, 0.25, 6]} />
              <meshStandardMaterial color={hairColor} roughness={0.8} />
            </mesh>
            <mesh position={[-0.15, 0.2, 0]} rotation={[0, 0, 0.4]} castShadow>
              <coneGeometry args={[0.12, 0.25, 6]} />
              <meshStandardMaterial color={hairColor} roughness={0.8} />
            </mesh>
          </>
        )}
        
        {hairStyle === 'long' && (
          <>
            <mesh position={[0, 0.1, 0]} castShadow>
              <sphereGeometry args={[0.4, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={hairColor} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.2, -0.15]} castShadow>
              <capsuleGeometry args={[0.25, 0.5, 8, 16]} />
              <meshStandardMaterial color={hairColor} roughness={0.8} />
            </mesh>
          </>
        )}
        
        {hairStyle === 'ponytail' && (
          <>
            <mesh position={[0, 0.15, 0]} castShadow>
              <sphereGeometry args={[0.36, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={hairColor} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.1, -0.35]} rotation={[0.5, 0, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.4, 8, 12]} />
              <meshStandardMaterial color={hairColor} roughness={0.8} />
            </mesh>
          </>
        )}

        {/* === CARA === */}
        <group position={[0, 0, 0.32]}>
          {/* Ojo izquierdo */}
          <mesh position={[-0.12, 0, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.12, 0, 0.05]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshBasicMaterial color={eyeColor} />
          </mesh>
          <mesh position={[-0.12, 0, 0.08]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          
          {/* Ojo derecho */}
          <mesh position={[0.12, 0, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.12, 0, 0.05]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshBasicMaterial color={eyeColor} />
          </mesh>
          <mesh position={[0.12, 0, 0.08]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </group>
        
        {/* Cejas */}
        <mesh position={[-0.12, 0.12, 0.33]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.1, 0.02, 0.02]} />
          <meshBasicMaterial color={hairColor} />
        </mesh>
        <mesh position={[0.12, 0.12, 0.33]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.1, 0.02, 0.02]} />
          <meshBasicMaterial color={hairColor} />
        </mesh>
        
        {/* Boca */}
        <mesh position={[0, -0.12, 0.34]}>
          <torusGeometry args={[0.06, 0.015, 8, 16, Math.PI]} />
          <meshBasicMaterial color="#d97706" />
        </mesh>
        
        {/* Mejillas */}
        <mesh position={[-0.22, -0.05, 0.28]}>
          <circleGeometry args={[0.05, 16]} />
          <meshBasicMaterial color="#fca5a5" transparent opacity={0.5} />
        </mesh>
        <mesh position={[0.22, -0.05, 0.28]}>
          <circleGeometry args={[0.05, 16]} />
          <meshBasicMaterial color="#fca5a5" transparent opacity={0.5} />
        </mesh>
      </group>

      {/* === BRAZOS === */}
      <mesh position={[-0.42, 0.5, 0]} rotation={[0, 0, 0.4]} castShadow>
        <capsuleGeometry args={[0.08, 0.25, 8, 12]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.42, 0.5, 0]} rotation={[0, 0, -0.4]} castShadow>
        <capsuleGeometry args={[0.08, 0.25, 8, 12]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>
      
      {/* Manos */}
      <mesh position={[-0.52, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.52, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>

      {/* === PIERNAS === */}
      <mesh position={[-0.12, 0, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.2, 8, 12]} />
        <meshStandardMaterial color={clothingColor} roughness={0.6} />
      </mesh>
      <mesh position={[0.12, 0, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.2, 8, 12]} />
        <meshStandardMaterial color={clothingColor} roughness={0.6} />
      </mesh>
      
      {/* Zapatos */}
      <mesh position={[-0.12, -0.18, 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.18]} />
        <meshStandardMaterial color="#1f2937" roughness={0.5} />
      </mesh>
      <mesh position={[0.12, -0.18, 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.18]} />
        <meshStandardMaterial color="#1f2937" roughness={0.5} />
      </mesh>

      {/* === ACCESORIOS === */}
      {accessory === 'glasses' && (
        <group position={[0, 1.05, 0.35]}>
          <mesh position={[-0.12, 0, 0]}>
            <torusGeometry args={[0.08, 0.015, 8, 16]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0.12, 0, 0]}>
            <torusGeometry args={[0.08, 0.015, 8, 16]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.08, 0.015, 0.015]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )}
      
      {accessory === 'hat' && (
        <group position={[0, 1.45, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.05, 24]} />
            <meshStandardMaterial color="#7c3aed" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.25, 0.25, 24]} />
            <meshStandardMaterial color="#7c3aed" roughness={0.7} />
          </mesh>
        </group>
      )}
      
      {accessory === 'headphones' && (
        <group position={[0, 1.15, 0]}>
          <mesh position={[0, 0.25, 0]}>
            <torusGeometry args={[0.32, 0.03, 8, 24, Math.PI]} />
            <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[-0.35, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.08, 16]} />
            <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0.35, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.08, 16]} />
            <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      )}

      {/* Sombra */}
      <mesh position={[0, -0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>
    </group>
  );
};

export default ProceduralChibiAvatar;
