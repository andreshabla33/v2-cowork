'use client';

import React, { useRef, useEffect, useMemo, Suspense, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { User, PresenceStatus } from '@/types';
import { ProceduralChibiAvatar } from './Avatar3DGLTF';

// Constantes
const MOVE_SPEED = 0.15;
const WORLD_SIZE = 50;

// --- Minimap Component ---
const Minimap: React.FC<{ currentUser: User; users: User[]; workspace: any }> = ({ currentUser, users, workspace }) => {
  if (!workspace) return null;
  const size = 140;
  const mapWidth = workspace.width || 2000;
  const mapHeight = workspace.height || 2000;
  const scaleX = size / mapWidth;
  const scaleY = size / mapHeight;

  return (
    <div className="absolute bottom-6 left-6 w-[140px] h-[140px] bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden pointer-events-none shadow-2xl z-20">
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      </div>
      <div className="relative w-full h-full">
        <div 
          className="absolute w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,1)] z-10"
          style={{ 
            left: `${currentUser.x * scaleX}px`, 
            top: `${currentUser.y * scaleY}px`,
            transform: 'translate(-50%, -50%)'
          }}
        />
        {users.map(u => (
          <div 
            key={u.id}
            className="absolute w-1.5 h-1.5 bg-white/50 rounded-full"
            style={{ 
              left: `${u.x * scaleX}px`, 
              top: `${u.y * scaleY}px`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Colores por tema
const themeColors: Record<string, string> = {
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

// ============== AVATAR 3D SIMPLE ==============
interface AvatarProps {
  position: THREE.Vector3;
  config: any;
  name: string;
  status: PresenceStatus;
  isCurrentUser?: boolean;
  isMoving?: boolean;
  direction?: string;
}

const Avatar: React.FC<AvatarProps> = ({ position, config, name, status, isCurrentUser, isMoving, direction }) => {
  return (
    <group position={position}>
      <ProceduralChibiAvatar
        config={config || { skinColor: '#fcd34d', clothingColor: '#6366f1', hairColor: '#4b2c20' }}
        isMoving={isMoving}
        direction={direction}
      />
      
      {/* Indicador de estado */}
      <mesh position={[0.4, 1.55, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={statusColors[status]} />
      </mesh>
      
      {/* Nombre */}
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

// ============== JUGADOR CONTROLABLE (SIN FÍSICA) ==============
interface PlayerProps {
  currentUser: User;
  setPosition: (x: number, y: number, direction: string, isSitting: boolean, isMoving: boolean) => void;
}

const Player: React.FC<PlayerProps> = ({ currentUser, setPosition }) => {
  const groupRef = useRef<THREE.Group>(null);
  const positionRef = useRef({
    x: (currentUser.x || 400) / 16,
    z: (currentUser.y || 400) / 16
  });
  const [isMoving, setIsMoving] = useState(false);
  const [direction, setDirection] = useState('front');
  const keysPressed = useRef<Set<string>>(new Set());
  const lastSyncTime = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable);
      if (isTyping) return;
      
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        keysPressed.current.add(e.code);
        e.preventDefault();
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
    let dx = 0, dz = 0;
    let newDirection = direction;

    if (keysPressed.current.has('KeyW') || keysPressed.current.has('ArrowUp')) { dz = -MOVE_SPEED; newDirection = 'up'; }
    if (keysPressed.current.has('KeyS') || keysPressed.current.has('ArrowDown')) { dz = MOVE_SPEED; newDirection = 'front'; }
    if (keysPressed.current.has('KeyA') || keysPressed.current.has('ArrowLeft')) { dx = -MOVE_SPEED; newDirection = 'left'; }
    if (keysPressed.current.has('KeyD') || keysPressed.current.has('ArrowRight')) { dx = MOVE_SPEED; newDirection = 'right'; }

    // Normalizar diagonal
    if (dx !== 0 && dz !== 0) {
      dx *= 0.707;
      dz *= 0.707;
    }

    const moving = dx !== 0 || dz !== 0;
    
    if (moving) {
      // Actualizar posición
      positionRef.current.x = Math.max(0, Math.min(WORLD_SIZE, positionRef.current.x + dx));
      positionRef.current.z = Math.max(0, Math.min(WORLD_SIZE, positionRef.current.z + dz));
    }

    // Mover el grupo del avatar directamente
    if (groupRef.current) {
      groupRef.current.position.x = positionRef.current.x;
      groupRef.current.position.z = positionRef.current.z;
    }

    setIsMoving(moving);
    if (newDirection !== direction) setDirection(newDirection);

    // Actualizar cámara para seguir al jugador
    camera.position.set(
      positionRef.current.x + 15,
      20,
      positionRef.current.z + 15
    );
    camera.lookAt(positionRef.current.x, 0, positionRef.current.z);

    // Sincronizar posición con el store
    const now = state.clock.getElapsedTime();
    if (now - lastSyncTime.current > 0.1) {
      setPosition(
        positionRef.current.x * 16,
        positionRef.current.z * 16,
        newDirection,
        false,
        moving
      );
      lastSyncTime.current = now;
    }
  });

  return (
    <group ref={groupRef} position={[positionRef.current.x, 0, positionRef.current.z]}>
      <Avatar
        position={new THREE.Vector3(0, 0, 0)}
        config={currentUser.avatarConfig}
        name={currentUser.name}
        status={currentUser.status}
        isCurrentUser={true}
        isMoving={isMoving}
        direction={direction}
      />
    </group>
  );
};

// ============== USUARIOS REMOTOS ==============
const RemoteUsers: React.FC<{ users: User[] }> = ({ users }) => {
  return (
    <>
      {users.map((user) => (
        <Avatar
          key={user.id}
          position={new THREE.Vector3((user.x || 400) / 16, 0, (user.y || 400) / 16)}
          config={user.avatarConfig}
          name={user.name}
          status={user.status || PresenceStatus.AVAILABLE}
          isMoving={false}
          direction={user.direction || 'front'}
        />
      ))}
    </>
  );
};

// ============== ESCENA PRINCIPAL ==============
interface SceneProps {
  currentUser: User;
  onlineUsers: User[];
  setPosition: (x: number, y: number, direction: string, isSitting: boolean, isMoving: boolean) => void;
  theme: string;
}

const Scene: React.FC<SceneProps> = ({ currentUser, onlineUsers, setPosition, theme }) => {
  const gridColor = theme === 'arcade' ? '#00ff41' : '#6366f1';

  return (
    <>
      {/* Iluminación */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
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
        <meshStandardMaterial color={themeColors[theme] || themeColors.dark} />
      </mesh>
      
      {/* Zonas de reunión visuales */}
      <mesh position={[10, 0.02, 10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial color="#3b82f6" opacity={0.15} transparent />
      </mesh>
      <Text position={[10, 0.1, 13.5]} fontSize={0.3} color="#3b82f6" anchorX="center">
        Sala 1
      </Text>
      
      <mesh position={[25, 0.02, 10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial color="#3b82f6" opacity={0.15} transparent />
      </mesh>
      <Text position={[25, 0.1, 13.5]} fontSize={0.3} color="#3b82f6" anchorX="center">
        Sala 2
      </Text>
      
      {/* Jugador actual */}
      <Player currentUser={currentUser} setPosition={setPosition} />
      
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

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        gl={{ 
          antialias: true,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false
        }}
        onCreated={({ gl }) => {
          console.log('Canvas created successfully');
          gl.setClearColor(themeColors[theme] || '#1a1d21');
        }}
      >
        <Suspense fallback={null}>
          <Scene
            currentUser={currentUser}
            onlineUsers={onlineUsers}
            setPosition={setPosition}
            theme={theme}
          />
        </Suspense>
      </Canvas>
      
      {/* Minimapa */}
      <Minimap currentUser={currentUser} users={onlineUsers} workspace={activeWorkspace} />
      
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
