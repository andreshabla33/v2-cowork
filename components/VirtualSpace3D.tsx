'use client';

import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Grid, Text, Environment } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { User, PresenceStatus, AvatarConfig } from '@/types';
import { Avatar3DGLTF, ProceduralChibiAvatar } from './Avatar3DGLTF';

// Constantes
const MOVE_SPEED = 5;
const WORLD_SIZE = 50;

// Colores por tema
const themeColors = {
  dark: '#1a1d21',
  light: '#f5f5f5',
  purple: '#2d1b4e',
  arcade: '#0a0a0a',
};

// Colores de estado
const statusColors: Record<PresenceStatus, string> = {
  [PresenceStatus.AVAILABLE]: '#22c55e',
  [PresenceStatus.BUSY]: '#ef4444',
  [PresenceStatus.AWAY]: '#eab308',
  [PresenceStatus.DND]: '#a855f7',
};

// ============== AVATAR 3D CHIBI ==============
interface Avatar3DProps {
  position: [number, number, number];
  avatarConfig: {
    skinColor: string;
    clothingColor: string;
    hairColor: string;
    accessory?: string;
  };
  name: string;
  status: PresenceStatus;
  isCurrentUser?: boolean;
  isMoving?: boolean;
  direction?: string;
}

const Avatar3D: React.FC<Avatar3DProps> = ({ 
  position, 
  avatarConfig, 
  name, 
  status, 
  isCurrentUser = false,
  isMoving = false,
  direction = 'front'
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  // Animación de idle y caminar
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    time.current += delta;
    
    // Bounce animation
    const bounceSpeed = isMoving ? 12 : 2;
    const bounceHeight = isMoving ? 0.15 : 0.05;
    groupRef.current.position.y = Math.sin(time.current * bounceSpeed) * bounceHeight;
    
    // Rotación según dirección
    if (direction === 'left') groupRef.current.rotation.y = Math.PI / 2;
    else if (direction === 'right') groupRef.current.rotation.y = -Math.PI / 2;
    else if (direction === 'up') groupRef.current.rotation.y = Math.PI;
    else groupRef.current.rotation.y = 0;
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Cuerpo */}
        <mesh ref={bodyRef} position={[0, 0.5, 0]} castShadow>
          <capsuleGeometry args={[0.3, 0.4, 8, 16]} />
          <meshStandardMaterial color={avatarConfig.clothingColor} />
        </mesh>
        
        {/* Cabeza */}
        <mesh position={[0, 1.1, 0]} castShadow>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshStandardMaterial color={avatarConfig.skinColor} />
        </mesh>
        
        {/* Cabello */}
        <mesh position={[0, 1.3, 0]} castShadow>
          <sphereGeometry args={[0.32, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={avatarConfig.hairColor} />
        </mesh>
        
        {/* Ojos */}
        <mesh position={[-0.12, 1.1, 0.28]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
        <mesh position={[0.12, 1.1, 0.28]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
        
        {/* Brazos */}
        <mesh position={[-0.45, 0.5, 0]} rotation={[0, 0, 0.3]} castShadow>
          <capsuleGeometry args={[0.1, 0.3, 4, 8]} />
          <meshStandardMaterial color={avatarConfig.skinColor} />
        </mesh>
        <mesh position={[0.45, 0.5, 0]} rotation={[0, 0, -0.3]} castShadow>
          <capsuleGeometry args={[0.1, 0.3, 4, 8]} />
          <meshStandardMaterial color={avatarConfig.skinColor} />
        </mesh>
        
        {/* Piernas */}
        <mesh position={[-0.15, 0, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.25, 4, 8]} />
          <meshStandardMaterial color={avatarConfig.clothingColor} />
        </mesh>
        <mesh position={[0.15, 0, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.25, 4, 8]} />
          <meshStandardMaterial color={avatarConfig.clothingColor} />
        </mesh>
        
        {/* Indicador de estado */}
        <mesh position={[0.35, 1.5, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={statusColors[status]} />
        </mesh>
        
        {/* Sombra circular bajo el avatar */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.5, 32]} />
          <meshBasicMaterial color="#000000" opacity={0.3} transparent />
        </mesh>
      </group>
      
      {/* Nombre flotante */}
      <Text
        position={[0, 2, 0]}
        fontSize={0.25}
        color={isCurrentUser ? '#60a5fa' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {name}
      </Text>
    </group>
  );
};

// ============== ZONA DE REUNIÓN ==============
interface MeetingZoneProps {
  position: [number, number, number];
  size: [number, number, number];
  name: string;
  onEnter: () => void;
  onExit: () => void;
}

const MeetingZone: React.FC<MeetingZoneProps> = ({ position, size, name, onEnter, onExit }) => {
  return (
    <group position={position}>
      {/* Piso de la zona */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size[0], size[2]]} />
        <meshStandardMaterial 
          color="#3b82f6" 
          opacity={0.15} 
          transparent 
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Borde de la zona */}
      <lineSegments position={[0, 0.03, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(size[0], size[2])]} />
        <lineBasicMaterial color="#3b82f6" linewidth={2} />
      </lineSegments>
      
      {/* Nombre de la zona */}
      <Text
        position={[0, 0.1, size[2] / 2 + 0.3]}
        fontSize={0.3}
        color="#3b82f6"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#000000"
      >
        {name}
      </Text>
      
      {/* Sensor invisible para detectar entrada/salida */}
      <RigidBody type="fixed" sensor onIntersectionEnter={onEnter} onIntersectionExit={onExit}>
        <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      </RigidBody>
    </group>
  );
};

// ============== JUGADOR CONTROLABLE ==============
interface PlayerControllerProps {
  currentUser: User;
  setPosition: (x: number, y: number, direction: string, isSitting: boolean, isMoving: boolean) => void;
}

const PlayerController: React.FC<PlayerControllerProps> = ({ currentUser, setPosition }) => {
  const rigidBodyRef = useRef<any>(null);
  const keysPressed = useRef<Set<string>>(new Set());
  const [isMoving, setIsMoving] = React.useState(false);
  const [direction, setDirection] = React.useState('front');
  const lastSyncTime = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable);
      if (isTyping) return;
      
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        keysPressed.current.add(e.code);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state) => {
    if (!rigidBodyRef.current) return;

    let vx = 0, vz = 0;
    let newDirection = direction;

    if (keysPressed.current.has('KeyW') || keysPressed.current.has('ArrowUp')) { vz = -MOVE_SPEED; newDirection = 'up'; }
    if (keysPressed.current.has('KeyS') || keysPressed.current.has('ArrowDown')) { vz = MOVE_SPEED; newDirection = 'front'; }
    if (keysPressed.current.has('KeyA') || keysPressed.current.has('ArrowLeft')) { vx = -MOVE_SPEED; newDirection = 'left'; }
    if (keysPressed.current.has('KeyD') || keysPressed.current.has('ArrowRight')) { vx = MOVE_SPEED; newDirection = 'right'; }

    // Normalizar diagonal
    if (vx !== 0 && vz !== 0) {
      vx *= 0.707;
      vz *= 0.707;
    }

    rigidBodyRef.current.setLinvel({ x: vx, y: 0, z: vz }, true);

    const moving = vx !== 0 || vz !== 0;
    setIsMoving(moving);
    if (newDirection !== direction) setDirection(newDirection);

    // Sincronizar posición
    const now = state.clock.getElapsedTime();
    if (now - lastSyncTime.current > 0.1) {
      const pos = rigidBodyRef.current.translation();
      setPosition(pos.x * 16, pos.z * 16, newDirection, false, moving);
      lastSyncTime.current = now;
    }
  });

  // Convertir posición de Phaser (pixels) a R3F (unidades 3D)
  const initialPos: [number, number, number] = [
    (currentUser.x || 400) / 16,
    0.5,
    (currentUser.y || 400) / 16
  ];

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={initialPos}
      type="dynamic"
      colliders={false}
      lockRotations
      linearDamping={10}
    >
      <CuboidCollider args={[0.3, 0.8, 0.3]} />
      <Avatar3DGLTF
        position={[0, 0, 0]}
        config={currentUser.avatarConfig || { skinColor: '#fcd34d', clothingColor: '#6366f1', hairColor: '#4b2c20' }}
        name={currentUser.name}
        status={currentUser.status}
        isCurrentUser={true}
        isMoving={isMoving}
        direction={direction}
      />
    </RigidBody>
  );
};

// ============== USUARIOS REMOTOS ==============
interface RemoteUsersProps {
  users: User[];
}

const RemoteUsers: React.FC<RemoteUsersProps> = ({ users }) => {
  return (
    <>
      {users.map((user) => (
        <Avatar3DGLTF
          key={user.id}
          position={[(user.x || 400) / 16, 0, (user.y || 400) / 16]}
          config={user.avatarConfig || { skinColor: '#fcd34d', clothingColor: '#6366f1', hairColor: '#4b2c20' }}
          name={user.name}
          status={user.status || PresenceStatus.AVAILABLE}
          isMoving={false}
          direction={user.direction || 'front'}
        />
      ))}
    </>
  );
};

// ============== CÁMARA QUE SIGUE AL JUGADOR ==============
const CameraController: React.FC<{ target: React.RefObject<THREE.Group> }> = ({ target }) => {
  const { camera } = useThree();
  
  useFrame(() => {
    if (target.current) {
      const pos = target.current.position;
      camera.position.set(pos.x + 15, 20, pos.z + 15);
      camera.lookAt(pos.x, 0, pos.z);
    }
  });
  
  return null;
};

// ============== ESCENA PRINCIPAL ==============
interface Scene3DProps {
  currentUser: User;
  onlineUsers: User[];
  setPosition: (x: number, y: number, direction: string, isSitting: boolean, isMoving: boolean) => void;
  theme: string;
  meetingZones: Array<{ id: string; name: string; position: [number, number, number]; size: [number, number, number] }>;
  onEnterZone: (zoneId: string) => void;
  onExitZone: (zoneId: string) => void;
}

const Scene3D: React.FC<Scene3DProps> = ({ 
  currentUser, 
  onlineUsers, 
  setPosition, 
  theme,
  meetingZones,
  onEnterZone,
  onExitZone
}) => {
  const gridColor = theme === 'arcade' ? '#00ff41' : '#6366f1';

  return (
    <>
      {/* Iluminación */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      
      {/* Cámara Isométrica */}
      <OrthographicCamera
        makeDefault
        position={[25, 30, 25]}
        zoom={35}
        near={0.1}
        far={1000}
      />
      
      {/* Piso con grid */}
      <Grid
        args={[WORLD_SIZE * 2, WORLD_SIZE * 2]}
        position={[WORLD_SIZE / 2, 0, WORLD_SIZE / 2]}
        cellSize={1}
        cellThickness={0.5}
        cellColor={gridColor}
        sectionSize={5}
        sectionThickness={1}
        sectionColor={gridColor}
        fadeDistance={100}
        fadeStrength={1}
        followCamera={false}
      />
      
      {/* Piso sólido */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[WORLD_SIZE / 2, -0.01, WORLD_SIZE / 2]} receiveShadow>
        <planeGeometry args={[WORLD_SIZE * 2, WORLD_SIZE * 2]} />
        <meshStandardMaterial color={themeColors[theme as keyof typeof themeColors] || themeColors.dark} />
      </mesh>
      
      {/* Límites del mundo */}
      <RigidBody type="fixed" position={[0, 1, WORLD_SIZE / 2]}>
        <CuboidCollider args={[0.1, 2, WORLD_SIZE]} />
      </RigidBody>
      <RigidBody type="fixed" position={[WORLD_SIZE, 1, WORLD_SIZE / 2]}>
        <CuboidCollider args={[0.1, 2, WORLD_SIZE]} />
      </RigidBody>
      <RigidBody type="fixed" position={[WORLD_SIZE / 2, 1, 0]}>
        <CuboidCollider args={[WORLD_SIZE, 2, 0.1]} />
      </RigidBody>
      <RigidBody type="fixed" position={[WORLD_SIZE / 2, 1, WORLD_SIZE]}>
        <CuboidCollider args={[WORLD_SIZE, 2, 0.1]} />
      </RigidBody>
      
      {/* Zonas de reunión */}
      {meetingZones.map((zone) => (
        <MeetingZone
          key={zone.id}
          position={zone.position}
          size={zone.size}
          name={zone.name}
          onEnter={() => onEnterZone(zone.id)}
          onExit={() => onExitZone(zone.id)}
        />
      ))}
      
      {/* Jugador actual */}
      <PlayerController currentUser={currentUser} setPosition={setPosition} />
      
      {/* Usuarios remotos */}
      <RemoteUsers users={onlineUsers} />
    </>
  );
};

// ============== COMPONENTE PRINCIPAL ==============
interface VirtualSpace3DProps {
  theme?: string;
}

const VirtualSpace3D: React.FC<VirtualSpace3DProps> = ({ theme = 'dark' }) => {
  const { currentUser, onlineUsers, setPosition, activeWorkspace } = useStore();
  const [currentZone, setCurrentZone] = React.useState<string | null>(null);

  // Zonas de reunión predefinidas
  const meetingZones = useMemo(() => [
    { id: 'sala-1', name: 'Sala de Reunión 1', position: [10, 0, 10] as [number, number, number], size: [6, 3, 6] as [number, number, number] },
    { id: 'sala-2', name: 'Sala de Reunión 2', position: [25, 0, 10] as [number, number, number], size: [6, 3, 6] as [number, number, number] },
    { id: 'auditorio', name: 'Auditorio', position: [17, 0, 30] as [number, number, number], size: [10, 3, 8] as [number, number, number] },
    { id: 'lounge', name: 'Lounge', position: [40, 0, 25] as [number, number, number], size: [8, 3, 8] as [number, number, number] },
  ], []);

  const handleEnterZone = (zoneId: string) => {
    setCurrentZone(zoneId);
    console.log(`Entrando a zona: ${zoneId}`);
  };

  const handleExitZone = (zoneId: string) => {
    if (currentZone === zoneId) {
      setCurrentZone(null);
      console.log(`Saliendo de zona: ${zoneId}`);
    }
  };

  return (
    <div className="w-full h-full relative">
      <Canvas shadows>
        <Suspense fallback={null}>
          <Physics gravity={[0, 0, 0]}>
            <Scene3D
              currentUser={currentUser}
              onlineUsers={onlineUsers}
              setPosition={setPosition}
              theme={theme}
              meetingZones={meetingZones}
              onEnterZone={handleEnterZone}
              onExitZone={handleExitZone}
            />
          </Physics>
        </Suspense>
      </Canvas>
      
      {/* Indicador de zona actual */}
      {currentZone && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-500/80 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium shadow-lg">
          📍 {meetingZones.find(z => z.id === currentZone)?.name}
        </div>
      )}
      
      {/* Controles de ayuda */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg text-white text-xs">
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-[10px]">WASD</kbd>
          <span className="opacity-70">o flechas para mover</span>
        </div>
      </div>
    </div>
  );
};

export default VirtualSpace3D;
