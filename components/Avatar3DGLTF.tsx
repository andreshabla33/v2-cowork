'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Text } from '@react-three/drei';
import * as THREE from 'three';
import { PresenceStatus } from '@/types';

// URLs de modelos GLTF gratuitos (Quaternius CC0 / Mixamo)
// Puedes reemplazar estos con tus propios modelos
const AVATAR_MODELS = {
  // Avatares predefinidos estilo chibi
  knight: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
  casual: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
  business: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
  // Fallback a procedural si no hay modelo
  procedural: null,
};

// Colores de estado
const statusColors: Record<PresenceStatus, string> = {
  [PresenceStatus.AVAILABLE]: '#22c55e',
  [PresenceStatus.BUSY]: '#ef4444',
  [PresenceStatus.AWAY]: '#eab308',
  [PresenceStatus.DND]: '#a855f7',
};

// ============== AVATAR PROCEDURAL MEJORADO (CHIBI STYLE) ==============
interface ProceduralAvatarProps {
  config: {
    skinColor: string;
    clothingColor: string;
    hairColor: string;
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

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    time.current += delta;
    
    // Animación de bounce
    const bounceSpeed = isMoving ? 12 : 2;
    const bounceHeight = isMoving ? 0.15 : 0.05;
    groupRef.current.position.y = Math.sin(time.current * bounceSpeed) * bounceHeight;
    
    // Rotación según dirección
    const rotations: Record<string, number> = {
      left: Math.PI / 2,
      right: -Math.PI / 2,
      up: Math.PI,
      front: 0,
      down: 0,
    };
    groupRef.current.rotation.y = rotations[direction] || 0;
  });

  const { skinColor, clothingColor, hairColor, hairStyle = 'default', accessory = 'none', eyeColor = '#3b82f6' } = config;

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
            {/* Flequillo */}
            <mesh position={[0, 0.1, 0.25]} castShadow>
              <boxGeometry args={[0.5, 0.15, 0.15]} />
              <meshStandardMaterial color={hairColor} roughness={0.8} />
            </mesh>
          </>
        )}
        
        {hairStyle === 'spiky' && (
          <>
            <mesh position={[0, 0.25, 0]} rotation={[0, 0, 0]} castShadow>
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
            {/* Cabello largo atrás */}
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
            {/* Coleta */}
            <mesh position={[0, 0.1, -0.35]} rotation={[0.5, 0, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.4, 8, 12]} />
              <meshStandardMaterial color={hairColor} roughness={0.8} />
            </mesh>
          </>
        )}

        {/* === CARA === */}
        {/* Ojos */}
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
        
        {/* Boca (sonrisa) */}
        <mesh position={[0, -0.12, 0.34]}>
          <torusGeometry args={[0.06, 0.015, 8, 16, Math.PI]} />
          <meshBasicMaterial color="#d97706" />
        </mesh>
        
        {/* Mejillas sonrojadas */}
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
          {/* Marco de gafas */}
          <mesh position={[-0.12, 0, 0]}>
            <torusGeometry args={[0.08, 0.015, 8, 16]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0.12, 0, 0]}>
            <torusGeometry args={[0.08, 0.015, 8, 16]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Puente */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.08, 0.015, 0.015]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Cristales */}
          <mesh position={[-0.12, 0, 0]}>
            <circleGeometry args={[0.07, 16]} />
            <meshStandardMaterial color="#93c5fd" transparent opacity={0.3} />
          </mesh>
          <mesh position={[0.12, 0, 0]}>
            <circleGeometry args={[0.07, 16]} />
            <meshStandardMaterial color="#93c5fd" transparent opacity={0.3} />
          </mesh>
        </group>
      )}
      
      {accessory === 'hat' && (
        <group position={[0, 1.45, 0]}>
          {/* Base del sombrero */}
          <mesh castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.05, 24]} />
            <meshStandardMaterial color="#7c3aed" roughness={0.7} />
          </mesh>
          {/* Copa del sombrero */}
          <mesh position={[0, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.25, 0.25, 24]} />
            <meshStandardMaterial color="#7c3aed" roughness={0.7} />
          </mesh>
          {/* Cinta */}
          <mesh position={[0, 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.05, 24]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.5} />
          </mesh>
        </group>
      )}
      
      {accessory === 'headphones' && (
        <group position={[0, 1.15, 0]}>
          {/* Banda superior */}
          <mesh position={[0, 0.25, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.32, 0.03, 8, 24, Math.PI]} />
            <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Auricular izquierdo */}
          <mesh position={[-0.35, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.08, 16]} />
            <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[-0.38, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.08, 16]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          {/* Auricular derecho */}
          <mesh position={[0.35, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.08, 16]} />
            <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0.38, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <circleGeometry args={[0.08, 16]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        </group>
      )}

      {/* Sombra bajo el avatar */}
      <mesh position={[0, -0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>
    </group>
  );
};

// ============== AVATAR COMPLETO CON NOMBRE Y ESTADO ==============
interface Avatar3DGLTFProps {
  position: [number, number, number];
  config: {
    skinColor: string;
    clothingColor: string;
    hairColor: string;
    hairStyle?: string;
    accessory?: string;
    eyeColor?: string;
    modelUrl?: string;
  };
  name: string;
  status: PresenceStatus;
  isCurrentUser?: boolean;
  isMoving?: boolean;
  direction?: string;
}

export const Avatar3DGLTF: React.FC<Avatar3DGLTFProps> = ({
  position,
  config,
  name,
  status,
  isCurrentUser = false,
  isMoving = false,
  direction = 'front',
}) => {
  return (
    <group position={position}>
      <ProceduralChibiAvatar
        config={config}
        isMoving={isMoving}
        direction={direction}
      />
      
      {/* Indicador de estado */}
      <mesh position={[0.4, 1.55, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={statusColors[status]} />
      </mesh>
      
      {/* Nombre flotante */}
      <Text
        position={[0, 1.85, 0]}
        fontSize={0.22}
        color={isCurrentUser ? '#60a5fa' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.025}
        outlineColor="#000000"
      >
        {name}
      </Text>
    </group>
  );
};

export default Avatar3DGLTF;
