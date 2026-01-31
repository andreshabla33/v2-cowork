'use client';

import React, { useRef, useEffect, useMemo, Suspense, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, PerspectiveCamera, Grid, Text, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { User, PresenceStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import { GLTFAvatar, useAvatarControls, AnimationState } from './Avatar3DGLTF';
import { RecordingManager } from './meetings/recording/RecordingManager';
import { BottomControlBar } from './BottomControlBar';
import { ChatService } from '../services/chatService';

// Constantes
const MOVE_SPEED = 4;
const RUN_SPEED = 8;
const WORLD_SIZE = 100;
const PROXIMITY_RADIUS = 180; // 180px para detectar proximidad

// --- Iconos ---

const IconPrivacy = ({ on }: { on: boolean }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    {on && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 11v4" />}
  </svg>
);

const IconExpand = ({ on }: { on: boolean }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {on ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    )}
  </svg>
);

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
  dark: '#0a0a0f',
  light: '#e8e8ec',
  space: '#020617',
  arcade: '#000000',
};

// Colores de estado
const statusColors: Record<PresenceStatus, string> = {
  [PresenceStatus.AVAILABLE]: '#22c55e',
  [PresenceStatus.BUSY]: '#ef4444',
  [PresenceStatus.AWAY]: '#eab308',
  [PresenceStatus.DND]: '#a855f7',
};

// ============== COMPONENTE VIDEO ESTABLE ==============
interface StableVideoProps {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
}

const StableVideo: React.FC<StableVideoProps> = ({ stream, muted = false, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamIdRef = useRef<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const newStreamId = stream?.id || null;
    
    // Solo actualizar si el stream realmente cambió
    if (streamIdRef.current !== newStreamId) {
      streamIdRef.current = newStreamId;
      
      if (stream) {
        video.srcObject = stream;
        video.play().catch(() => {});
      } else {
        video.srcObject = null;
      }
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  );
};

// ============== AVATAR 3D GLTF (vista 2.5D isométrica) ==============
interface AvatarProps {
  position: THREE.Vector3;
  config: any;
  name: string;
  status: PresenceStatus;
  isCurrentUser?: boolean;
  animationState?: AnimationState;
  direction?: string;
  reaction?: string | null;
  videoStream?: MediaStream | null;
  camOn?: boolean;
  showVideoBubble?: boolean;
  message?: string | null;
}

const Avatar: React.FC<AvatarProps> = ({ position, config, name, status, isCurrentUser, animationState = 'idle', direction, reaction, videoStream, camOn, showVideoBubble = true, message }) => {
  return (
    <group position={position}>
      {/* Avatar 3D GLTF desde Supabase */}
      <GLTFAvatar
        animationState={animationState}
        direction={direction}
        scale={1.2}
      />
      
      {/* Mensaje de Chat (Burbuja de texto) */}
      {message && (
        <Html position={[0, camOn ? 5.8 : 3.5, 0]} center distanceFactor={10} zIndexRange={[100, 0]}>
          <div className="bg-white text-black px-4 py-2 rounded-2xl rounded-bl-none shadow-xl border border-gray-200 max-w-[200px] text-sm font-medium animate-pop-in relative">
            {message}
            <div className="absolute bottom-0 left-0 w-3 h-3 bg-white transform translate-y-1/2 -translate-x-1/2 rotate-45 border-b border-r border-gray-200"></div>
          </div>
        </Html>
      )}
      
      {/* Video Bubble above avatar (Gather style) */}
      {camOn && videoStream && showVideoBubble && (
        <Html position={[0, 3.5, 0]} center distanceFactor={12} zIndexRange={[100, 0]}>
          <div className="w-24 h-16 rounded-[12px] overflow-hidden border-[2px] border-[#6366f1] shadow-lg bg-black relative transform transition-all hover:scale-125">
             <StableVideo stream={videoStream} muted={isCurrentUser} className="w-full h-full object-cover transform scale-110" />
          </div>
        </Html>
      )}
      
      {/* Reacción emoji encima del avatar (o video) */}
      {reaction && (
        <Html position={[0, camOn ? 5.2 : 3.0, 0]} center distanceFactor={10}>
          <div className="text-4xl animate-bounce drop-shadow-lg filter">
            {reaction}
          </div>
        </Html>
      )}
      
      {/* Nombre flotante con indicador de estado (oculto si hay cámara) */}
      {!camOn && (
        <Html position={[0, 2.4, 0]} center distanceFactor={10} zIndexRange={[100, 0]}>
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span 
              className="text-sm font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
              style={{ color: isCurrentUser ? '#60a5fa' : '#ffffff' }}
            >
              {name}
            </span>
            <span 
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusColors[status] }}
            />
          </div>
        </Html>
      )}
    </group>
  );
};

// ============== COMPONENTE USUARIOS REMOTOS ==============
const RemoteUsers: React.FC<{ users: User[]; remoteStreams: Map<string, MediaStream>; showVideoBubble?: boolean; remoteMessages: Map<string, string> }> = ({ users, remoteStreams, showVideoBubble, remoteMessages }) => {
  const { currentUser } = useStore();
  
  return (
    <>
      {users.filter(u => u.id !== currentUser.id).map(u => (
        <group key={u.id} position={[u.x / 16, 0, u.y / 16]}>
          <Avatar
            position={new THREE.Vector3(0, 0, 0)}
            config={u.avatarConfig}
            name={u.name}
            status={u.status}
            isCurrentUser={false}
            animationState="idle"
            direction={u.direction}
            reaction={null}
            videoStream={remoteStreams.get(u.id) || null}
            camOn={u.isCameraOn}
            showVideoBubble={showVideoBubble}
            message={remoteMessages.get(u.id)}
          />
        </group>
      ))}
    </>
  );
};

const CameraFollow: React.FC<{ orbitControlsRef: React.MutableRefObject<any> }> = ({ orbitControlsRef }) => {
  const { camera } = useThree();
  const lastPlayerPos = useRef<{ x: number; z: number } | null>(null);
  const initialized = useRef(false);
  
  useFrame(() => {
    const playerPos = (camera as any).userData?.playerPosition;
    if (!playerPos || !orbitControlsRef.current) return;
    
    const controls = orbitControlsRef.current;
    
    // Primera vez: centrar cámara en el jugador
    if (!initialized.current) {
      controls.target.set(playerPos.x, 0, playerPos.z);
      camera.position.set(playerPos.x, 15, playerPos.z + 15);
      lastPlayerPos.current = { x: playerPos.x, z: playerPos.z };
      initialized.current = true;
      return;
    }
    
    // Detectar si el jugador se movió
    if (!lastPlayerPos.current) {
      lastPlayerPos.current = { x: playerPos.x, z: playerPos.z };
      return;
    }
    
    const deltaX = playerPos.x - lastPlayerPos.current.x;
    const deltaZ = playerPos.z - lastPlayerPos.current.z;
    const moved = Math.abs(deltaX) > 0.001 || Math.abs(deltaZ) > 0.001;
    
    if (moved) {
      // Mover target y cámara juntos (mantiene la rotación actual)
      controls.target.x += deltaX;
      controls.target.z += deltaZ;
      camera.position.x += deltaX;
      camera.position.z += deltaZ;
      
      lastPlayerPos.current = { x: playerPos.x, z: playerPos.z };
    }
  });
  
  return null;
};
// ============== JUGADOR CONTROLABLE CON ANIMACIONES ==============
interface PlayerProps {
  currentUser: User;
  setPosition: (x: number, y: number, direction: string, isSitting: boolean, isMoving: boolean) => void;
  stream: MediaStream | null;
  showVideoBubble?: boolean;
  message?: string | null;
  orbitControlsRef: React.MutableRefObject<any>;
}

const Player: React.FC<PlayerProps> = ({ currentUser, setPosition, stream, showVideoBubble = true, message, orbitControlsRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const positionRef = useRef({
    x: (currentUser.x || 400) / 16,
    z: (currentUser.y || 400) / 16
  });
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [direction, setDirection] = useState('front');
  const [isRunning, setIsRunning] = useState(false);
  const keysPressed = useRef<Set<string>>(new Set());
  const lastSyncTime = useRef(0);
  const { camera } = useThree();
  
  // Ref para posición anterior de la cámara para cálculo de delta
  const prevPlayerPos = useRef({ x: positionRef.current.x, z: positionRef.current.z });

  useEffect(() => {
    // Inicializar posición previa
    prevPlayerPos.current = { x: positionRef.current.x, z: positionRef.current.z };
  }, []);

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

  useFrame((state, delta) => {
    let dx = 0, dy = 0;
    let newDirection = direction;
    
    // Velocidad según si corre o camina
    const speed = isRunning ? RUN_SPEED : MOVE_SPEED;

    // Movimiento en 2D (corregido para vista isométrica)
    if (keysPressed.current.has('KeyW') || keysPressed.current.has('ArrowUp')) { dy = speed * delta; newDirection = 'up'; }
    if (keysPressed.current.has('KeyS') || keysPressed.current.has('ArrowDown')) { dy = -speed * delta; newDirection = 'front'; }
    if (keysPressed.current.has('KeyA') || keysPressed.current.has('ArrowLeft')) { dx = -speed * delta; newDirection = 'left'; }
    if (keysPressed.current.has('KeyD') || keysPressed.current.has('ArrowRight')) { dx = speed * delta; newDirection = 'right'; }

    // Normalizar diagonal
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    const moving = dx !== 0 || dy !== 0;
    
    if (moving) {
      // Actualizar posición
      positionRef.current.x = Math.max(0, Math.min(WORLD_SIZE, positionRef.current.x + dx));
      positionRef.current.z = Math.max(0, Math.min(WORLD_SIZE, positionRef.current.z - dy));
      
      // Actualizar animación según movimiento
      if (animationState !== 'cheer' && animationState !== 'dance' && animationState !== 'sit') {
        setAnimationState(isRunning ? 'run' : 'walk');
      }
    } else if (animationState === 'walk' || animationState === 'run') {
      setAnimationState('idle');
    }

    if (newDirection !== direction) setDirection(newDirection);

    // Mover el grupo del avatar
    if (groupRef.current) {
      groupRef.current.position.x = positionRef.current.x;
      groupRef.current.position.z = positionRef.current.z;
    }
    
    // Actualizar cámara para seguir al jugador (Sincronizado para evitar jitter)
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      
      // Calcular cambio en posición
      const deltaX = positionRef.current.x - prevPlayerPos.current.x;
      const deltaZ = positionRef.current.z - prevPlayerPos.current.z;
      
      if (Math.abs(deltaX) > 0.0001 || Math.abs(deltaZ) > 0.0001) {
        // Mover cámara y target juntos
        camera.position.x += deltaX;
        camera.position.z += deltaZ;
        controls.target.x += deltaX;
        controls.target.z += deltaZ;
        controls.update();
      }
      
      prevPlayerPos.current = { x: positionRef.current.x, z: positionRef.current.z };
    }

    if (newDirection !== direction) setDirection(newDirection);

    // Actualizar target para CameraFollow
    (camera as any).userData.playerPosition = { x: positionRef.current.x, z: positionRef.current.z };

    // Sincronizar posición con el store
    const now = state.clock.getElapsedTime();
    if (now - lastSyncTime.current > 0.1) {
      setPosition(
        positionRef.current.x * 16,
        positionRef.current.z * 16,
        newDirection,
        animationState === 'sit',
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
        animationState={animationState}
        direction={direction}
        reaction={null}
        videoStream={stream}
        camOn={currentUser.isCameraOn}
        showVideoBubble={showVideoBubble}
        message={message}
      />
    </group>
  );
};

// ============== ESCENA PRINCIPAL ==============
interface SceneProps {
  currentUser: User;
  onlineUsers: User[];
  setPosition: (x: number, y: number, direction: string, isSitting: boolean, isMoving: boolean) => void;
  theme: string;
  orbitControlsRef: React.MutableRefObject<any>;
  stream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  showVideoBubbles?: boolean;
  localMessage: string | null;
  remoteMessages: Map<string, string>;
}

const Scene: React.FC<SceneProps> = ({ currentUser, onlineUsers, setPosition, theme, orbitControlsRef, stream, remoteStreams, showVideoBubbles = true, localMessage, remoteMessages }) => {
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
      
      {/* Cámara Perspectiva para rotación 3D */}
      <PerspectiveCamera
        makeDefault
        position={[WORLD_SIZE/2, 15, WORLD_SIZE/2 + 20]}
        fov={50}
        near={0.1}
        far={1000}
      />
      
      {/* OrbitControls para rotación, zoom y pan */}
      <OrbitControls
        ref={orbitControlsRef}
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2 - 0.1}
        minPolarAngle={Math.PI / 6}
        enablePan={true}
        panSpeed={0.5}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />
      
      {/* Cámara que sigue al jugador */}
      <CameraFollow orbitControlsRef={orbitControlsRef} />
      
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
      
      {/* Suelo base (para clicks) - Bajado para evitar Z-fighting */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} onClick={(e) => {
        // Lógica de movimiento por click
        const point = e.point;
        setPosition(Math.round(point.x * 16), Math.round(point.z * 16), 'front', false, true);
      }}>
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Mesas y objetos (Demo) */}
      <mesh position={[10, 0.5, 10]} castShadow receiveShadow>
        <boxGeometry args={[4, 1, 2]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <Text position={[10, 1.5, 10]} fontSize={0.5} color="white" anchorX="center" anchorY="middle">
        Mesa de Reunión
      </Text>
      
      <mesh position={[25, 0.02, 10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial color="#3b82f6" opacity={0.15} transparent />
      </mesh>
      <Text position={[25, 0.1, 13.5]} fontSize={0.3} color="#3b82f6" anchorX="center">
        Sala 2
      </Text>
      
      {/* Jugador actual */}
      <Player 
        currentUser={currentUser} 
        setPosition={setPosition} 
        stream={stream} 
        showVideoBubble={showVideoBubbles} 
        message={localMessage} 
        orbitControlsRef={orbitControlsRef}
      />
      
      {/* Usuarios remotos */}
      <RemoteUsers users={onlineUsers} remoteStreams={remoteStreams} showVideoBubble={showVideoBubbles} remoteMessages={remoteMessages} />
    </>
  );
};

// ============== VIDEO HUD COMPONENT ==============
interface VideoHUDProps {
  userName: string;
  visitorId: string;
  camOn: boolean;
  sharingOn: boolean;
  isPrivate: boolean;
  usersInCall: User[];
  stream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  remoteScreenStreams: Map<string, MediaStream>;
  remoteReaction: { emoji: string; from: string; fromName: string } | null;
  onWaveUser: (userId: string) => void;
  currentReaction: string | null;
  theme: string;
  speakingUsers: Set<string>;
  userDistances: Map<string, number>;
}

const VideoHUD: React.FC<VideoHUDProps> = ({
  userName,
  visitorId,
  camOn,
  sharingOn,
  isPrivate,
  usersInCall,
  stream,
  screenStream,
  remoteStreams,
  remoteScreenStreams,
  remoteReaction,
  onWaveUser,
  currentReaction,
  theme,
  speakingUsers,
  userDistances,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [waveAnimation, setWaveAnimation] = useState<string | null>(null);
  const [useGridLayout, setUseGridLayout] = useState(false);
  const expandedVideoRef = useRef<HTMLVideoElement>(null);
  
  // Detectar si el usuario local está hablando
  const isSpeakingLocal = speakingUsers.has(visitorId);

  useEffect(() => {
    if (!expandedVideoRef.current || !expandedId) return;
    let targetStream: MediaStream | null = null;
    if (expandedId === 'local') targetStream = stream;
    else if (expandedId === 'screen') targetStream = screenStream;
    else targetStream = remoteStreams.get(expandedId) || null;
    
    if (targetStream && expandedVideoRef.current.srcObject !== targetStream) {
      expandedVideoRef.current.srcObject = targetStream;
      expandedVideoRef.current.play().catch(() => {});
    }
  }, [expandedId, stream, screenStream, remoteStreams]);

  return (
    <>
      {/* Overlay expandido con zoom - UI 2026 Glassmorphism */}
      {expandedId && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center" onClick={() => { setExpandedId(null); setZoomLevel(1); setPanPosition({ x: 0, y: 0 }); }}>
          <div className="relative w-[90vw] h-[90vh] max-w-6xl bg-gradient-to-br from-zinc-900/80 to-black/90 rounded-[32px] overflow-hidden border border-white/5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]" onClick={e => e.stopPropagation()}>
            {/* Video container con zoom y pan */}
            <div 
              className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
              style={{ 
                transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px)`,
                transition: 'transform 0.2s ease-out'
              }}
            >
              {(expandedId === 'local' && stream) || (expandedId === 'screen' && screenStream) || (expandedId?.startsWith('screen-') && remoteScreenStreams.get(expandedId.replace('screen-', ''))) || (expandedId && remoteStreams.get(expandedId)) ? (
                <StableVideo 
                  stream={expandedId === 'local' ? stream : expandedId === 'screen' ? screenStream : expandedId?.startsWith('screen-') ? remoteScreenStreams.get(expandedId.replace('screen-', '')) || null : remoteStreams.get(expandedId) || null}
                  muted={expandedId === 'local'}
                  className={`w-full h-full object-contain ${expandedId === 'local' ? 'mirror' : ''}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center text-6xl font-black text-white">
                    {expandedId === 'local' ? userName.charAt(0) : usersInCall.find(u => u.id === expandedId)?.name.charAt(0) || '?'}
                  </div>
                </div>
              )}
            </div>

            {/* Header glassmorphism */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <div className="bg-white/5 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/10">
                <span className="text-sm font-medium text-white/90">
                  {expandedId === 'local' ? 'Tu cámara' : expandedId === 'screen' ? 'Tu pantalla' : expandedId?.startsWith('screen-') ? `${usersInCall.find(u => u.id === expandedId?.replace('screen-', ''))?.name || 'Usuario'} - Pantalla` : usersInCall.find(u => u.id === expandedId)?.name || 'Usuario'}
                </span>
              </div>
              <button 
                onClick={() => { setExpandedId(null); setZoomLevel(1); setPanPosition({ x: 0, y: 0 }); }} 
                className="w-10 h-10 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Controles de zoom flotantes - estilo minimalista 2026 */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/5 backdrop-blur-2xl px-2 py-2 rounded-2xl border border-white/10 shadow-lg">
              {/* Zoom out */}
              <button 
                onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
                disabled={zoomLevel <= 0.5}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
              </button>
              
              {/* Zoom indicator */}
              <div className="px-3 py-1.5 min-w-[60px] text-center">
                <span className="text-sm font-mono text-white/90">{Math.round(zoomLevel * 100)}%</span>
              </div>
              
              {/* Zoom in */}
              <button 
                onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                disabled={zoomLevel >= 3}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-white/10"></div>
              
              {/* Reset zoom */}
              <button 
                onClick={() => { setZoomLevel(1); setPanPosition({ x: 0, y: 0 }); }}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all"
                title="Restablecer zoom"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
              </button>

              {/* Fullscreen */}
              <button 
                onClick={() => setZoomLevel(z => z === 1 ? 1.5 : 1)}
                className="w-10 h-10 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 flex items-center justify-center text-indigo-400 transition-all"
                title="Ajustar pantalla"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
              </button>
            </div>

            {/* Reacción en pantalla expandida */}
            {currentReaction && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl pointer-events-none animate-fade-in-out">
                {currentReaction}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contenedor de burbujas - Posicionado arriba centrado */}
      <div className={`absolute left-1/2 top-24 -translate-x-1/2 pointer-events-auto z-50 transition-all duration-500 ${
        usersInCall.length === 0 && !camOn ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'
      } ${
        useGridLayout 
          ? 'grid grid-cols-2 gap-3 max-w-[600px]' 
          : 'flex flex-row flex-wrap justify-center gap-4 max-w-[800px]'
      }`}>
        {/* Indicador de privacidad */}
        {isPrivate && (
          <div className={`bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${useGridLayout ? 'col-span-2' : ''}`}>
            <IconPrivacy on={true} /> Conversación privada
          </div>
        )}

        {/* Burbuja local (tu cámara) */}
        <div className={`relative bg-black rounded-[28px] overflow-hidden shadow-2xl group transition-all duration-300 ${
          useGridLayout ? 'w-[200px] h-[130px]' : 'w-52 h-36'
        } ${isSpeakingLocal ? 'border-2 border-green-500 ring-2 ring-green-500/30' : 'border border-white/10'}`}>
          {/* Indicador de speaking */}
          {isSpeakingLocal && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 z-30">
              <div className="w-1 h-3 bg-green-500 rounded-full animate-sound-wave-1"></div>
              <div className="w-1 h-4 bg-green-500 rounded-full animate-sound-wave-2"></div>
              <div className="w-1 h-2 bg-green-500 rounded-full animate-sound-wave-3"></div>
              <div className="w-1 h-4 bg-green-500 rounded-full animate-sound-wave-2"></div>
              <div className="w-1 h-3 bg-green-500 rounded-full animate-sound-wave-1"></div>
            </div>
          )}
          {/* Reacción actual */}
          {currentReaction && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl z-20 pointer-events-none animate-fade-in-out">
              {currentReaction}
            </div>
          )}
          <div className={`relative w-full h-full overflow-hidden flex items-center justify-center transition-opacity ${!camOn ? 'opacity-0' : 'opacity-100'} mirror`}>
            <StableVideo stream={stream} muted={true} className="w-full h-full object-cover block" />
          </div>
          {!camOn && (
            <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-2xl bg-black/50">
                {userName.charAt(0)}
              </div>
            </div>
          )}
          
          {/* Controles simplificados (solo expandir) */}
          <div className="absolute bottom-3 right-3 flex justify-end items-center gap-1 transition-all duration-300 opacity-0 group-hover:opacity-100">
            <button onClick={() => setExpandedId('local')} className="w-7 h-7 rounded-full flex items-center justify-center bg-indigo-600 backdrop-blur-md border border-white/10 text-white hover:bg-indigo-500 transition-all shadow-lg">
              <IconExpand on={false}/>
            </button>
          </div>
          
          {/* Nombre */}
          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wide text-white">Tú</span>
          </div>
        </div>

        {/* Burbuja de screen share (separada) */}
        {sharingOn && screenStream && (
          <div className="relative bg-black rounded-[28px] overflow-hidden border border-indigo-500/50 shadow-2xl group w-52 h-36">
            <StableVideo stream={screenStream} className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3 bg-indigo-600 backdrop-blur-md px-2 py-1 rounded-lg">
              <span className="text-[10px] font-bold uppercase tracking-wide text-white">Tu pantalla</span>
            </div>
            <button onClick={() => setExpandedId('screen')} className="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600 text-white opacity-0 group-hover:opacity-100 transition-all">
              <IconExpand on={false}/>
            </button>
          </div>
        )}

        {/* Burbujas de usuarios cercanos */}
        {usersInCall.map((u) => {
          const remoteStream = remoteStreams.get(u.id);
          const isSpeaking = speakingUsers.has(u.id);
          const distance = userDistances.get(u.id) || 100;
          const isWaving = waveAnimation === u.id;
          
          return (
            <div key={u.id} className={`relative bg-zinc-900 rounded-[28px] overflow-hidden shadow-2xl group transition-all duration-300 ${
              useGridLayout ? 'w-[200px] h-[130px]' : 'w-52 h-36'
            } ${isSpeaking ? 'border-2 border-green-500 ring-2 ring-green-500/30 scale-105' : 'border border-white/10'}`}>
              {/* Indicador de speaking remoto */}
              {isSpeaking && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 z-30">
                  <div className="w-1 h-3 bg-green-500 rounded-full animate-sound-wave-1"></div>
                  <div className="w-1 h-4 bg-green-500 rounded-full animate-sound-wave-2"></div>
                  <div className="w-1 h-2 bg-green-500 rounded-full animate-sound-wave-3"></div>
                  <div className="w-1 h-4 bg-green-500 rounded-full animate-sound-wave-2"></div>
                  <div className="w-1 h-3 bg-green-500 rounded-full animate-sound-wave-1"></div>
                </div>
              )}
              {/* Wave animation overlay */}
              {isWaving && (
                <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center z-20 animate-pulse">
                  <span className="text-4xl animate-bounce">👋</span>
                </div>
              )}
              {remoteStream ? (
                <StableVideo stream={remoteStream} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white font-black text-2xl bg-black/40">
                    {u.name.charAt(0)}
                  </div>
                </div>
              )}
              {/* Reacción remota recibida */}
              {remoteReaction && remoteReaction.from === u.id && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl z-20 pointer-events-none animate-fade-in-out">
                  {remoteReaction.emoji}
                </div>
              )}
              {/* Header con nombre y estado */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                  <div className={`w-2 h-2 rounded-full ${u.isMicOn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white truncate max-w-[80px]">{u.name}</span>
                </div>
                {/* Indicador de distancia (audio espacial) */}
                <div className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] text-white/70">
                  {distance < 50 ? '🔊' : distance < 100 ? '🔉' : '🔈'}
                </div>
              </div>
              {/* Controles en hover */}
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all">
                {/* Botón Wave */}
                <button 
                  onClick={() => {
                    onWaveUser(u.id);
                    setWaveAnimation(u.id);
                    setTimeout(() => setWaveAnimation(null), 2000);
                  }} 
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-500 text-white hover:bg-amber-400 transition-all"
                  title={`Saludar a ${u.name}`}
                >
                  👋
                </button>
                <button onClick={() => setExpandedId(u.id)} className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-500 transition-all">
                  <IconExpand on={false}/>
                </button>
              </div>
            </div>
          );
        })}

        {/* Burbujas de screen share de otros usuarios */}
        {usersInCall.map((u) => {
          const remoteScreen = remoteScreenStreams.get(u.id);
          // Solo mostrar si hay un stream con video tracks activos
          if (!remoteScreen || remoteScreen.getVideoTracks().length === 0) return null;
          return (
            <div key={`screen-${u.id}`} className="relative bg-black rounded-[28px] overflow-hidden border border-green-500/30 shadow-2xl group w-52 h-36">
              <StableVideo stream={remoteScreen} className="w-full h-full object-cover" />
              {/* Label minimalista y transparente */}
              <div className="absolute top-2 left-2 bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded-md opacity-60 group-hover:opacity-100 transition-opacity">
                <span className="text-[8px] font-medium text-white/80 truncate max-w-[80px] block">{u.name.split(' ')[0]}</span>
              </div>
              {/* Icono de pantalla pequeño */}
              <div className="absolute top-2 right-2 w-5 h-5 rounded-md bg-green-500/20 backdrop-blur-sm flex items-center justify-center opacity-60">
                <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <button onClick={() => setExpandedId(`screen-${u.id}`)} className="absolute bottom-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 backdrop-blur-sm text-white/70 opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all">
                <IconExpand on={false}/>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ============== COMPONENTE PRINCIPAL ==============
interface VirtualSpace3DProps {
  theme?: string;
}

// ICE Servers para WebRTC
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
];

const VirtualSpace3D: React.FC<VirtualSpace3DProps> = ({ theme = 'dark' }) => {
  const { currentUser, onlineUsers, setPosition, activeWorkspace, toggleMic, toggleCamera, toggleScreenShare, togglePrivacy, setPrivacy, session } = useStore();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cargoUsuario, setCargoUsuario] = useState<string>('colaborador');

  // Cargar cargo del usuario desde miembros_espacio
  useEffect(() => {
    const cargarCargo = async () => {
      if (!session?.user?.id || !activeWorkspace?.id) return;
      
      const { data } = await supabase
        .from('miembros_espacio')
        .select('cargo')
        .eq('usuario_id', session.user.id)
        .eq('espacio_id', activeWorkspace.id)
        .single();
      
      if (data?.cargo) {
        console.log('📋 Cargo del usuario cargado:', data.cargo);
        setCargoUsuario(data.cargo);
      }
    };
    
    cargarCargo();
  }, [session?.user?.id, activeWorkspace?.id]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  const activeStreamRef = useRef<MediaStream | null>(null);
  const activeScreenRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerVideoTrackCountRef = useRef<Map<string, number>>(new Map()); // Rastrear video tracks por peer
  const webrtcChannelRef = useRef<any>(null);
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [remoteReaction, setRemoteReaction] = useState<{ emoji: string; from: string; fromName: string } | null>(null);
  const orbitControlsRef = useRef<any>(null);
  
  // Estado de grabación
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Estado para speaker detection
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodesRef = useRef<Map<string, AnalyserNode>>(new Map());
  
  // Estado para wave/invite
  const [incomingWave, setIncomingWave] = useState<{ from: string; fromName: string } | null>(null);
  
  // Ref para tracking de histéresis (evitar parpadeo en el límite de proximidad)
  const connectedUsersRef = useRef<Set<string>>(new Set());

  // Detectar usuarios en proximidad (excluyendo al usuario actual)
  const usersInCall = useMemo(() => {
    const nextConnectedUsers = new Set<string>();
    
    const users = onlineUsers.filter(u => {
      // Excluir al usuario actual
      if (u.id === session?.user?.id) return false;
      
      // Validar coordenadas (ignorar 0,0 que suele ser inicialización)
      if ((u.x === 0 && u.y === 0) || typeof u.x !== 'number' || typeof u.y !== 'number' || typeof currentUser.x !== 'number' || typeof currentUser.y !== 'number') {
        return false;
      }

      const dist = Math.sqrt(Math.pow(u.x - currentUser.x, 2) + Math.pow(u.y - currentUser.y, 2));
      
      const wasInCall = connectedUsersRef.current.has(u.id);
      
      // HISTÉRESIS: 
      // Si ya estaba conectado, usamos un radio mayor (1.2x) para desconectar.
      // Esto evita que la conexión oscile cuando se está en el borde.
      const threshold = wasInCall ? PROXIMITY_RADIUS * 1.2 : PROXIMITY_RADIUS;
      
      const inProximity = dist < threshold;
      
      if (inProximity) {
         nextConnectedUsers.add(u.id);
         // Log solo al entrar
         if (!wasInCall) {
           console.log(`[PROXIMITY ENTER] User ${u.name} entered. Dist: ${dist.toFixed(1)} < ${PROXIMITY_RADIUS}`);
         }
      } else if (wasInCall) {
         console.log(`[PROXIMITY EXIT] User ${u.name} exited. Dist: ${dist.toFixed(1)} > ${threshold.toFixed(1)} (Radius: ${PROXIMITY_RADIUS})`);
      }
      
      return inProximity;
    });
    
    // Si no hay nadie cerca y estoy compartiendo pantalla, detener
    if (users.length === 0 && currentUser.isScreenSharing) {
       console.log('No users in proximity, stopping screen share automatically');
       // Usamos setTimeout para no bloquear el render actual
       setTimeout(() => {
          handleToggleScreenShare();
       }, 0);
    }
    
    connectedUsersRef.current = nextConnectedUsers;
    return users;
  }, [onlineUsers, currentUser.x, currentUser.y, session?.user?.id, currentUser.isScreenSharing]);

  const hasActiveCall = usersInCall.length > 0;
  
  // Calcular distancias de usuarios para audio espacial
  const userDistances = useMemo(() => {
    const distances = new Map<string, number>();
    usersInCall.forEach(u => {
      const dist = Math.sqrt(Math.pow(u.x - currentUser.x, 2) + Math.pow(u.y - currentUser.y, 2));
      distances.set(u.id, dist);
    });
    return distances;
  }, [usersInCall, currentUser.x, currentUser.y]);
  
  // Speaker detection - analizar nivel de audio
  useEffect(() => {
    if (!stream) return;
    
    // Crear AudioContext si no existe
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const audioContext = audioContextRef.current;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      
      // Si el promedio es mayor a 30, el usuario local está hablando
      setSpeakingUsers(prev => {
        const newSet = new Set(prev);
        if (average > 30 && session?.user?.id) {
          newSet.add(session.user.id);
        } else if (session?.user?.id) {
          newSet.delete(session.user.id);
        }
        return newSet;
      });
    };
    
    const intervalId = setInterval(checkAudioLevel, 100);
    
    return () => {
      clearInterval(intervalId);
      source.disconnect();
    };
  }, [stream, session?.user?.id]);
  
  // Audio espacial - ajustar volumen según distancia
  useEffect(() => {
    remoteStreams.forEach((remoteStream, oderId) => {
      const distance = userDistances.get(oderId) || PROXIMITY_RADIUS;
      const volume = Math.max(0.1, 1 - (distance / PROXIMITY_RADIUS));
      
      // Aplicar volumen a los elementos de audio
      const audioElements = document.querySelectorAll(`video[data-user-id="${oderId}"]`);
      audioElements.forEach(el => {
        (el as HTMLVideoElement).volume = volume;
      });
    });
  }, [remoteStreams, userDistances]);
  
  // Función para enviar wave a un usuario
  const handleWaveUser = useCallback((userId: string) => {
    if (webrtcChannelRef.current && session?.user?.id) {
      webrtcChannelRef.current.send({
        type: 'broadcast',
        event: 'wave',
        payload: { to: userId, from: session.user.id, fromName: currentUser.name }
      });
    }
  }, [session?.user?.id, currentUser.name]);

  // Activar mic/cam cuando hay usuarios cerca
  useEffect(() => {
    if (hasActiveCall) {
      if (!currentUser.isMicOn) toggleMic();
      if (!currentUser.isCameraOn) toggleCamera();
    } else {
      // Apagar todo cuando no hay usuarios cerca
      if (currentUser.isPrivate) setPrivacy(false);
    }
  }, [hasActiveCall]);

  // Estado para trigger externo de grabación
  const [recordingTrigger, setRecordingTrigger] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [remoteMessages, setRemoteMessages] = useState<Map<string, string>>(new Map());

  // Manejar tecla Escape global para cerrar chat
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showChat) {
        setShowChat(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showChat]);

  // Enviar mensaje de chat
  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || !session?.user?.id) return;
    
    const content = chatInput.trim();
    
    // 1. Mostrar mensaje localmente (burbuja)
    setLocalMessage(content);
    setTimeout(() => setLocalMessage(null), 5000);
    
    // 2. Broadcast a otros usuarios para burbuja
    if (webrtcChannelRef.current) {
      webrtcChannelRef.current.send({
        type: 'broadcast',
        event: 'chat',
        payload: { message: content, from: session.user.id, fromName: currentUser.name }
      });
    }
    
    // 3. Persistir mensaje (solo a usuarios cercanos en llamada)
    if (usersInCall.length > 0) {
      const recipientIds = usersInCall.map(u => u.id);
      await ChatService.sendMessage(content, session.user.id, activeWorkspace?.id || '', recipientIds);
    }
    
    setChatInput('');
    setShowChat(false);
  }, [chatInput, session?.user?.id, currentUser.name, usersInCall, activeWorkspace?.id]);

  // Toggle grabación
  const handleToggleRecording = useCallback(async () => {
    // Si estamos en modo headless, usamos el trigger
    if (!isRecording) {
      setRecordingTrigger(true);
    } else {
      setRecordingTrigger(true); // El mismo trigger sirve para toggle en el manager
    }
  }, [isRecording]);

  // Trigger reaction con auto-clear y envío a otros usuarios
  const handleTriggerReaction = useCallback((emoji: string) => {
    setCurrentReaction(emoji);
    setTimeout(() => setCurrentReaction(null), 3000);
    
    // Enviar reacción a otros usuarios por el canal WebRTC
    if (webrtcChannelRef.current && session?.user?.id) {
      webrtcChannelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji, from: session.user.id, fromName: currentUser.name }
      });
    }
  }, [session?.user?.id, currentUser.name]);

  // ========== WebRTC para video remoto ==========
  const createPeerConnection = useCallback((peerId: string) => {
    if (peerConnectionsRef.current.has(peerId)) return peerConnectionsRef.current.get(peerId)!;
    
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionsRef.current.set(peerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate && webrtcChannelRef.current) {
        webrtcChannelRef.current.send({
          type: 'broadcast', event: 'ice-candidate',
          payload: { candidate: event.candidate, to: peerId, from: session?.user?.id }
        });
      }
    };

    // Inicializar contador de video tracks para este peer
    peerVideoTrackCountRef.current.set(peerId, 0);
    
    pc.ontrack = (event) => {
      console.log('Received remote track from', peerId, 'kind:', event.track.kind, 'label:', event.track.label, 'streamId:', event.streams[0]?.id);
      const remoteStream = event.streams[0];
      const trackLabel = event.track.label.toLowerCase();
      
      // Detectar si es screen share por label
      const isScreenShareByLabel = trackLabel.includes('screen') || 
         trackLabel.includes('display') ||
         trackLabel.includes('window') ||
         trackLabel.includes('monitor');
      
      if (event.track.kind === 'video') {
        // Incrementar contador de video tracks para este peer
        const currentCount = (peerVideoTrackCountRef.current.get(peerId) || 0) + 1;
        peerVideoTrackCountRef.current.set(peerId, currentCount);
        
        // El segundo video track es screen share (o si tiene label de screen)
        const isScreenShare = isScreenShareByLabel || currentCount > 1;
        
        if (isScreenShare) {
          console.log('Detected SCREEN SHARE from', peerId, '(track #' + currentCount + ')');
          setRemoteScreenStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(peerId, remoteStream);
            return newMap;
          });
        } else {
          // Es cámara normal (primer video track)
          console.log('Detected CAMERA from', peerId, '(track #' + currentCount + ')');
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(peerId, remoteStream);
            return newMap;
          });
        }
      } else if (event.track.kind === 'audio') {
        // Audio track - agregar al stream existente o crear nuevo
        console.log('Detected AUDIO from', peerId);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          const existingStream = newMap.get(peerId);
          if (existingStream) {
            return prev;
          }
          newMap.set(peerId, remoteStream);
          return newMap;
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state with', peerId, ':', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        pc.close();
        peerConnectionsRef.current.delete(peerId);
        peerVideoTrackCountRef.current.delete(peerId);
        setRemoteStreams(prev => { const m = new Map(prev); m.delete(peerId); return m; });
        setRemoteScreenStreams(prev => { const m = new Map(prev); m.delete(peerId); return m; });
      }
    };

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => pc.addTrack(track, activeStreamRef.current!));
    }
    // Agregar screen share si está activo
    if (activeScreenRef.current) {
      activeScreenRef.current.getTracks().forEach(track => pc.addTrack(track, activeScreenRef.current!));
    }

    return pc;
  }, [session?.user?.id]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, fromId: string) => {
    // Reutilizar conexión existente si existe (para renegociaciones)
    let pc = peerConnectionsRef.current.get(fromId);
    const isRenegotiation = !!pc;
    
    if (!pc) {
      pc = createPeerConnection(fromId);
    }
    
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    if (webrtcChannelRef.current) {
      webrtcChannelRef.current.send({ type: 'broadcast', event: 'answer', payload: { answer, to: fromId, from: session?.user?.id } });
    }
    
    console.log(isRenegotiation ? 'Renegotiation completed with' : 'New connection established with', fromId);
  }, [createPeerConnection, session?.user?.id]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, fromId: string) => {
    const pc = peerConnectionsRef.current.get(fromId);
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit, fromId: string) => {
    const pc = peerConnectionsRef.current.get(fromId);
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }, []);

  const initiateCall = useCallback(async (peerId: string) => {
    const pc = createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (webrtcChannelRef.current) {
      webrtcChannelRef.current.send({ type: 'broadcast', event: 'offer', payload: { offer, to: peerId, from: session?.user?.id } });
    }
  }, [createPeerConnection, session?.user?.id]);

  // WebRTC Channel
  useEffect(() => {
    if (!activeWorkspace?.id || !session?.user?.id) return;
    const webrtcChannel = supabase.channel(`webrtc:${activeWorkspace.id}`);
    webrtcChannel
      .on('broadcast', { event: 'offer' }, ({ payload }) => { if (payload.to === session.user.id) handleOffer(payload.offer, payload.from); })
      .on('broadcast', { event: 'answer' }, ({ payload }) => { if (payload.to === session.user.id) handleAnswer(payload.answer, payload.from); })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => { if (payload.to === session.user.id) handleIceCandidate(payload.candidate, payload.from); })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        // Recibir reacción de otro usuario
        if (payload.from !== session.user.id) {
          console.log('Received reaction from', payload.fromName, ':', payload.emoji);
          setRemoteReaction({ emoji: payload.emoji, from: payload.from, fromName: payload.fromName });
          setTimeout(() => setRemoteReaction(null), 3000);
        }
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        // Recibir mensaje de chat
        if (payload.from !== session.user.id) {
          console.log('Received chat from', payload.fromName, ':', payload.message);
          setRemoteMessages(prev => {
            const newMap = new Map(prev);
            newMap.set(payload.from, payload.message);
            return newMap;
          });
          // Limpiar mensaje después de 5s
          setTimeout(() => {
            setRemoteMessages(prev => {
              const newMap = new Map(prev);
              newMap.delete(payload.from);
              return newMap;
            });
          }, 5000);
        }
      })
      .subscribe();
    webrtcChannelRef.current = webrtcChannel;
    return () => {
      supabase.removeChannel(webrtcChannel);
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, [activeWorkspace?.id, session?.user?.id, handleOffer, handleAnswer, handleIceCandidate]);

  // Limpiar conexiones cuando usuarios se alejan
  useEffect(() => {
    const usersInCallIds = new Set(usersInCall.map(u => u.id));
    
    // Cerrar conexiones de usuarios que ya no están en proximidad
    peerConnectionsRef.current.forEach((pc, peerId) => {
      if (!usersInCallIds.has(peerId)) {
        console.log('Closing connection with user who left proximity:', peerId);
        pc.close();
        peerConnectionsRef.current.delete(peerId);
        peerVideoTrackCountRef.current.delete(peerId);
        setRemoteStreams(prev => { const m = new Map(prev); m.delete(peerId); return m; });
        setRemoteScreenStreams(prev => { const m = new Map(prev); m.delete(peerId); return m; });
      }
    });
  }, [usersInCall]);

  // Iniciar llamadas cuando hay usuarios cerca Y tenemos stream
  useEffect(() => {
    if (!hasActiveCall || !session?.user?.id || !activeStreamRef.current) return;
    
    usersInCall.forEach(user => {
      // Usar hash numérico para comparación consistente
      const myIdHash = session.user.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
      const theirIdHash = user.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
      const shouldInitiate = myIdHash < theirIdHash || (myIdHash === theirIdHash && session.user.id < user.id);
      
      if (!peerConnectionsRef.current.has(user.id) && shouldInitiate) {
        console.log('Initiating call to:', user.id, user.name);
        initiateCall(user.id);
      }
    });
  }, [usersInCall, hasActiveCall, initiateCall, session?.user?.id, stream]);

  // Agregar screen share a conexiones existentes cuando se inicia
  useEffect(() => {
    if (!screenStream || !hasActiveCall) return;
    
    console.log('Adding screen share to existing peer connections');
    
    peerConnectionsRef.current.forEach(async (pc, peerId) => {
      // Verificar si ya tiene el track de screen
      const senders = pc.getSenders();
      const hasScreenTrack = senders.some(s => s.track?.label?.toLowerCase().includes('screen') || s.track?.label?.toLowerCase().includes('display'));
      
      if (!hasScreenTrack && screenStream) {
        // Agregar tracks de screen share
        screenStream.getTracks().forEach(track => {
          console.log('Adding screen track to peer:', peerId, track.label);
          pc.addTrack(track, screenStream);
        });
        
        // Renegociar la conexión
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (webrtcChannelRef.current) {
            webrtcChannelRef.current.send({
              type: 'broadcast',
              event: 'offer',
              payload: { offer, to: peerId, from: session?.user?.id }
            });
          }
        } catch (err) {
          console.error('Error renegotiating after adding screen share:', err);
        }
      }
    });
  }, [screenStream, hasActiveCall, session?.user?.id]);

  // NOTA: La renegociación automática cuando el stream cambia fue removida
  // porque causaba conflictos de SDP (m-lines order mismatch).
  // Los tracks se agregan al crear la conexión inicial en createPeerConnection.

  // Flag para evitar condiciones de carrera en getUserMedia
  const isProcessingStreamRef = useRef(false);
  // Ref para re-ejecutar manageStream si hubo un cambio mientras procesaba
  const pendingUpdateRef = useRef(false);
  // Ref para acceder al estado actual dentro de la función asíncrona
  const shouldHaveStreamRef = useRef(false);
  shouldHaveStreamRef.current = hasActiveCall || currentUser.isScreenSharing || currentUser.isCameraOn || currentUser.isMicOn;

  // Manejar stream de video - encender/apagar según proximidad
  useEffect(() => {
    let mounted = true;

    const manageStream = async () => {
      // Si ya está procesando, marcar que necesitamos una actualización al terminar
      if (isProcessingStreamRef.current) {
        console.log('ManageStream busy, marking pending update...');
        pendingUpdateRef.current = true;
        return;
      }
      
      const shouldHaveStream = shouldHaveStreamRef.current;
      console.log('ManageStream starting - shouldHaveStream:', shouldHaveStream);
      
      try {
        isProcessingStreamRef.current = true;

        if (shouldHaveStream) {
          if (!activeStreamRef.current) {
            console.log('Requesting camera/mic access...');
            const newStream = await navigator.mediaDevices.getUserMedia({ 
              video: { width: 640, height: 480 }, 
              audio: true 
            });
            
            if (!mounted) {
              newStream.getTracks().forEach(t => t.stop());
              return;
            }

            // Verificar si el estado cambió mientras esperábamos
            if (!shouldHaveStreamRef.current) {
              console.log('Stream loaded but no longer needed (state changed), stopping...');
              newStream.getTracks().forEach(t => t.stop());
              return; // Terminará en finally y disparará pending update si es necesario
            }

            activeStreamRef.current = newStream;
            setStream(newStream);
            console.log('Camera/mic stream started');
          }
          
          // Actualizar estado de tracks
          if (activeStreamRef.current) {
            activeStreamRef.current.getAudioTracks().forEach(track => track.enabled = !!currentUser.isMicOn);
            activeStreamRef.current.getVideoTracks().forEach(track => track.enabled = !!currentUser.isCameraOn);
          }
        } else {
          // No hay proximidad ni screen sharing - apagar cámara/mic
          if (activeStreamRef.current) {
            console.log('Stopping camera/mic - no active call');
            
            const tracks = activeStreamRef.current.getTracks();
            
            // Remover tracks de conexiones activas
            peerConnectionsRef.current.forEach((pc, peerId) => {
              pc.getSenders().forEach(sender => {
                if (sender.track && tracks.some(t => t.id === sender.track!.id)) {
                  try {
                    pc.removeTrack(sender);
                  } catch (e) {
                    console.warn('Error removing track from PC:', e);
                  }
                }
              });
            });

            // Detener tracks
            tracks.forEach(track => {
              console.log('Stopping track:', track.kind, track.label);
              track.stop();
            });
            activeStreamRef.current = null;
            setStream(null);
          }
        }
      } catch (err) {
        console.error("Media error:", err);
      } finally {
        if (mounted) {
          isProcessingStreamRef.current = false;
          // Si hubo cambios pendientes mientras procesábamos, ejecutar de nuevo
          if (pendingUpdateRef.current) {
            console.log('Executing pending manageStream update...');
            pendingUpdateRef.current = false;
            manageStream();
          }
        }
      }
    };

    // Debounce de 500ms para evitar parpadeos rápidos
    const timer = setTimeout(() => {
      manageStream();
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [currentUser.isMicOn, currentUser.isCameraOn, currentUser.isScreenSharing, hasActiveCall]);

  // Manejar screen share
  const handleToggleScreenShare = async () => {
    if (!currentUser.isScreenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        displayStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare(false);
          if (activeScreenRef.current) {
            activeScreenRef.current.getTracks().forEach(t => t.stop());
            activeScreenRef.current = null;
            setScreenStream(null);
          }
        };
        activeScreenRef.current = displayStream;
        setScreenStream(displayStream);
        toggleScreenShare(true);
      } catch (err) { 
        console.error("Screen Share Error:", err); 
        toggleScreenShare(false); 
      }
    } else {
      if (activeScreenRef.current) { 
        activeScreenRef.current.getTracks().forEach(t => t.stop()); 
        activeScreenRef.current = null; 
        setScreenStream(null); 
      }
      toggleScreenShare(false);
    }
  };

  // Función para resetear la vista de la cámara
  const handleResetView = useCallback(() => {
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      const playerX = (currentUser.x || 400) / 16;
      const playerZ = (currentUser.y || 400) / 16;
      
      // Resetear target al jugador
      controls.target.set(playerX, 0, playerZ);
      
      // Resetear posición de cámara a vista isométrica por defecto
      controls.object.position.set(playerX, 15, playerZ + 15);
      
      controls.update();
    }
  }, [currentUser.x, currentUser.y]);

  return (
    <div className="w-full h-full relative bg-black">
      <Canvas
        shadows
        gl={{ 
          antialias: true,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false
        }}
        onCreated={({ gl }) => {
          console.log('Canvas created successfully');
          gl.setClearColor(themeColors[theme] || '#000000');
        }}
      >
        <Suspense fallback={null}>
          <Scene
            currentUser={currentUser}
            onlineUsers={onlineUsers}
            setPosition={setPosition}
            theme={theme}
            orbitControlsRef={orbitControlsRef}
            stream={stream}
            remoteStreams={remoteStreams}
            showVideoBubbles={!hasActiveCall}
            localMessage={localMessage}
            remoteMessages={remoteMessages}
          />
        </Suspense>
      </Canvas>
      
      {/* Banner de grabación - VISIBLE PARA TODOS */}
      {isRecording && (
        <div className="fixed top-0 left-0 right-0 z-[200] flex justify-center pointer-events-none animate-slide-down">
          <div className="bg-red-600 text-white px-6 py-2.5 rounded-b-2xl flex items-center gap-3 shadow-2xl border-b border-x border-red-400/30 pointer-events-auto">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="font-bold text-sm tracking-wide">REC</span>
            <span className="font-mono text-sm bg-red-700/50 px-2 py-0.5 rounded">
              {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}
            </span>
            <span className="text-red-100 text-xs hidden sm:block">Esta reunión se está grabando</span>
            <button 
              onClick={handleToggleRecording}
              className="ml-2 bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs font-medium transition-colors"
            >
              Detener
            </button>
          </div>
        </div>
      )}
      
      {/* Botón de resetear vista */}
      <button
        onClick={handleResetView}
        className="absolute bottom-4 left-4 bg-gray-800/80 hover:bg-gray-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm backdrop-blur-sm transition-colors z-10"
        title="Resetear vista (centrar cámara en tu avatar)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        Centrar
      </button>
      
      {/* VideoHUD - solo se muestra cuando hay usuarios cerca (burbuja local ahora está en el avatar) */}
      {usersInCall.length > 0 && (
        <VideoHUD
          userName={currentUser.name}
          visitorId={session?.user?.id || 'visitor'}
          camOn={currentUser.isCameraOn}
          sharingOn={currentUser.isScreenSharing}
          isPrivate={currentUser.isPrivate}
          usersInCall={usersInCall}
          stream={stream}
          screenStream={screenStream}
          remoteStreams={remoteStreams}
          remoteScreenStreams={remoteScreenStreams}
          remoteReaction={remoteReaction}
          onWaveUser={handleWaveUser}
          currentReaction={currentReaction}
          theme={theme}
          speakingUsers={speakingUsers}
          userDistances={userDistances}
        />
      )}

      {/* Barra de Controles Inferior (Estilo 2026) */}
      <BottomControlBar
        onToggleMic={toggleMic}
        onToggleCam={toggleCamera}
        onToggleShare={handleToggleScreenShare}
        onToggleRecording={handleToggleRecording}
        onToggleEmojis={() => setShowEmojis(!showEmojis)}
        onToggleChat={() => setShowChat(!showChat)}
        isMicOn={currentUser.isMicOn}
        isCamOn={currentUser.isCameraOn}
        isSharing={currentUser.isScreenSharing}
        isRecording={isRecording}
        showEmojis={showEmojis}
        showChat={showChat}
        onTriggerReaction={handleTriggerReaction}
        avatarConfig={currentUser.avatarConfig!}
        showShareButton={usersInCall.length > 0}
        showRecordingButton={usersInCall.length > 0}
      />

      {/* Input de Chat Flotante - Minimalista */}
      {showChat && (
        <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 z-[201] animate-slide-up">
          <div className="bg-black/60 backdrop-blur-md px-1 py-1 rounded-2xl border border-white/10 flex gap-1 items-center">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleSendMessage();
                if (e.key === 'Escape') setShowChat(false);
              }}
              onKeyUp={(e) => e.stopPropagation()}
              placeholder="Mensaje..."
              className="w-40 bg-transparent border-none px-2 py-1 text-xs text-white placeholder-white/40 focus:outline-none"
              autoFocus
              maxLength={100}
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim()}
              className="w-7 h-7 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs flex items-center justify-center transition-colors"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Minimapa */}
      <Minimap currentUser={currentUser} users={onlineUsers} workspace={activeWorkspace} />
      
      {/* Notificación de Wave entrante */}
      {incomingWave && (
        <div className="fixed top-20 right-4 z-[201] animate-slide-in">
          <div className="bg-amber-500 text-black px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <span className="text-3xl animate-wave">👋</span>
            <div>
              <p className="font-bold text-sm">{incomingWave.fromName}</p>
              <p className="text-xs opacity-80">te está saludando</p>
            </div>
            <button 
              onClick={() => setIncomingWave(null)}
              className="ml-2 w-6 h-6 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/30"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Controles de ayuda */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg text-white text-xs">
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-[10px]">WASD</kbd>
          <span className="opacity-70">o flechas para mover</span>
        </div>
      </div>
      
      {/* Recording Manager V2 con análisis conductual avanzado */}
      {hasActiveCall && (
        <RecordingManager
          espacioId={activeWorkspace?.id || ''}
          userId={session?.user?.id || ''}
          userName={currentUser.name}
          reunionTitulo={`Reunión ${new Date().toLocaleDateString()}`}
          stream={stream}
          cargoUsuario={cargoUsuario as any}
          onRecordingStateChange={(recording) => {
            setIsRecording(recording);
          }}
          onProcessingComplete={(resultado) => {
            console.log('✅ Análisis conductual completado:', resultado?.tipo_grabacion, resultado?.analisis);
          }}
          headlessMode={true}
          externalTrigger={recordingTrigger}
          onExternalTriggerHandled={() => setRecordingTrigger(false)}
        />
      )}
    </div>
  );
};

export default VirtualSpace3D;
