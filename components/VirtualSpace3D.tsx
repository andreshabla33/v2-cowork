'use client';

import React, { useRef, useEffect, useMemo, Suspense, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, PerspectiveCamera, Grid, Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { User, PresenceStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import { GLTFAvatar, useAvatarControls, AnimationState } from './Avatar3DGLTF';
import { RecordingManager } from './meetings/recording/RecordingManager';

// Constantes
const MOVE_SPEED = 4;
const RUN_SPEED = 8;
const WORLD_SIZE = 100;
const PROXIMITY_RADIUS = 180; // 180px para detectar proximidad

// --- Iconos ---
const IconMic = ({ on }: { on: boolean }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {on ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 00-3 3v8a3 3 0 006 0V5a3 3 0 00-3-3z"/> 
       : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />}
  </svg>
);

const IconCam = ({ on }: { on: boolean }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {on ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/> 
       : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />}
  </svg>
);

const IconScreen = ({ on }: { on: boolean }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
    {!on && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3l18 18" />}
  </svg>
);

const IconReaction = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

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

const IconRecord = ({ on }: { on: boolean }) => (
  <svg className="w-4 h-4" fill={on ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="6" strokeWidth="2.5" />
    {on && <circle cx="12" cy="12" r="3" fill="currentColor" />}
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
}

const Avatar: React.FC<AvatarProps> = ({ position, config, name, status, isCurrentUser, animationState = 'idle', direction, reaction }) => {
  return (
    <group position={position}>
      {/* Avatar 3D GLTF desde Supabase */}
      <GLTFAvatar
        animationState={animationState}
        direction={direction}
        scale={1.2}
      />
      
      {/* Indicador de estado */}
      <mesh position={[0.85, 2.4, 0]}>
        <sphereGeometry args={[0.10, 16, 16]} />
        <meshBasicMaterial color={statusColors[status]} />
      </mesh>
      
      {/* Reacción emoji encima del avatar */}
      {reaction && (
        <Text
          position={[0, 3.0, 0]}
          fontSize={0.5}
          anchorX="center"
          anchorY="middle"
        >
          {reaction}
        </Text>
      )}
      
      {/* Nombre flotante */}
      <Text
        position={[0, 2.4, 0]}
        fontSize={0.28}
        color={isCurrentUser ? '#60a5fa' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {name}
      </Text>
    </group>
  );
};

// ============== CAMERA FOLLOW (sigue al jugador) ==============
const CameraFollow: React.FC<{ orbitControlsRef: React.MutableRefObject<any> }> = ({ orbitControlsRef }) => {
  const { camera } = useThree();
  const lastPlayerPos = useRef({ x: 0, z: 0 });
  
  useFrame(() => {
    const playerPos = (camera as any).userData?.playerPosition;
    if (!playerPos || !orbitControlsRef.current) return;
    
    // Detectar si el jugador se movió
    const moved = Math.abs(playerPos.x - lastPlayerPos.current.x) > 0.01 || 
                  Math.abs(playerPos.z - lastPlayerPos.current.z) > 0.01;
    
    if (moved) {
      // Actualizar el target de OrbitControls para seguir al jugador
      const controls = orbitControlsRef.current;
      const deltaX = playerPos.x - lastPlayerPos.current.x;
      const deltaZ = playerPos.z - lastPlayerPos.current.z;
      
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
}

const Player: React.FC<PlayerProps> = ({ currentUser, setPosition }) => {
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

    // Mover el grupo del avatar
    if (groupRef.current) {
      groupRef.current.position.x = positionRef.current.x;
      groupRef.current.position.z = positionRef.current.z;
    }

    if (newDirection !== direction) setDirection(newDirection);

    // Actualizar target para OrbitControls
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
      />
    </group>
  );
};

// ============== USUARIOS REMOTOS ==============
const RemoteUsers: React.FC<{ users: User[] }> = ({ users }) => {
  return (
    <>
      {users.map((user) => {
        // Determinar estado de animación para usuarios remotos
        let animState: AnimationState = 'idle';
        if (user.isSitting) animState = 'sit';
        else if (user.isRunning) animState = 'run';
        else if (user.isMoving) animState = 'walk';

        return (
          <Avatar
            key={user.id}
            position={new THREE.Vector3((user.x || 400) / 16, 0, (user.y || 400) / 16)}
            config={user.avatarConfig}
            name={user.name}
            status={user.status || PresenceStatus.AVAILABLE}
            animationState={animState}
            direction={user.direction || 'front'}
          />
        );
      })}
    </>
  );
};

// ============== ESCENA PRINCIPAL ==============
interface SceneProps {
  currentUser: User;
  onlineUsers: User[];
  setPosition: (x: number, y: number, direction: string, isSitting: boolean, isMoving: boolean) => void;
  theme: string;
  orbitControlsRef: React.MutableRefObject<any>;
}

const Scene: React.FC<SceneProps> = ({ currentUser, onlineUsers, setPosition, theme, orbitControlsRef }) => {
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
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        }}
      />
      
      {/* Seguimiento de cámara al jugador */}
      <CameraFollow orbitControlsRef={orbitControlsRef} />
      
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

// ============== COMPONENTE VIDEO ESTABLE ==============
const StableVideo: React.FC<{ stream: MediaStream | null; muted?: boolean; className?: string }> = ({ stream, muted = false, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream]);

  return stream ? (
    <video ref={videoRef} autoPlay playsInline muted={muted} className={className} />
  ) : null;
};

// ============== VIDEO HUD (burbuja con cámara) ==============
interface VideoHUDProps {
  userName: string;
  visitorId: string;
  micOn: boolean;
  camOn: boolean;
  sharingOn: boolean;
  isPrivate: boolean;
  isRecording: boolean;
  recordingDuration: number;
  usersInCall: User[];
  stream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  remoteScreenStreams: Map<string, MediaStream>;
  remoteReaction: { emoji: string; from: string; fromName: string } | null;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleShare: () => void;
  onTogglePrivacy: () => void;
  onToggleRecording: () => void;
  onTriggerReaction: (emoji: string) => void;
  onWaveUser: (userId: string) => void;
  currentReaction: string | null;
  theme: string;
  speakingUsers: Set<string>;
  userDistances: Map<string, number>;
}

const VideoHUD: React.FC<VideoHUDProps> = ({
  userName, visitorId, micOn, camOn, sharingOn, isPrivate, isRecording, recordingDuration, usersInCall, stream, screenStream, remoteStreams, remoteScreenStreams, remoteReaction,
  onToggleMic, onToggleCam, onToggleShare, onTogglePrivacy, onToggleRecording, onTriggerReaction, onWaveUser, currentReaction, theme, speakingUsers, userDistances
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const accentColor = theme === 'arcade' ? 'bg-[#00ff41] text-black' : 'bg-indigo-600 text-white';
  const emojis = ['👍', '🔥', '❤️', '👏', '😂', '😮', '🚀', '✨'];
  const [showEmojis, setShowEmojis] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expandedVideoRef = useRef<HTMLVideoElement>(null);
  const [reactionFading, setReactionFading] = useState(false);
  const [waveAnimation, setWaveAnimation] = useState<string | null>(null);
  
  // Calcular layout basado en número de usuarios
  const totalUsers = usersInCall.length + 1; // +1 por el usuario local
  const useGridLayout = totalUsers >= 3;
  
  // Indicador de speaking para usuario local
  const isSpeakingLocal = speakingUsers.has(visitorId);

  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(e => console.warn("Auto-play error", e));
    }
  }, [stream]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
      screenVideoRef.current.play().catch(e => console.warn("Auto-play error", e));
    }
  }, [screenStream]);

  const handleEmojiClick = (emoji: string) => {
    setShowEmojis(false);
    onTriggerReaction(emoji);
  };

  // Manejar video expandido sin titileo
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
      {/* Overlay expandido */}
      {expandedId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center" onClick={() => setExpandedId(null)}>
          <div className="relative w-[80vw] h-[80vh] max-w-4xl bg-black rounded-[40px] overflow-hidden border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
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
            <button onClick={() => setExpandedId(null)} className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
              <IconExpand on={true} />
            </button>
            {/* Reacción en pantalla expandida */}
            {currentReaction && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl pointer-events-none animate-fade-in-out">
                {currentReaction}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`absolute left-6 top-1/2 -translate-y-1/2 pointer-events-auto z-50 ${
        useGridLayout 
          ? 'grid grid-cols-2 gap-3 max-w-[440px]' 
          : 'flex flex-col gap-4'
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
          
          {/* Controles */}
          <div className="absolute bottom-3 left-2 right-2 flex justify-center items-center gap-1 transition-all duration-300 opacity-0 group-hover:opacity-100">
            <button onClick={onToggleMic} className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all ${micOn ? 'bg-white/20 text-white hover:bg-white/40' : 'bg-red-500 text-white shadow-lg'}`}>
              <IconMic on={micOn}/>
            </button>
            <button onClick={onToggleCam} className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all ${camOn ? 'bg-white/20 text-white hover:bg-white/40' : 'bg-red-500 text-white shadow-lg'}`}>
              <IconCam on={camOn}/>
            </button>
            <button onClick={onToggleShare} className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all ${sharingOn ? accentColor : 'bg-white/20 text-white hover:bg-white/40'}`}>
              <IconScreen on={sharingOn}/>
            </button>
            <button onClick={onTogglePrivacy} className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all ${isPrivate ? 'bg-amber-500 text-white shadow-lg' : 'bg-white/20 text-white hover:bg-white/40'}`}>
              <IconPrivacy on={isPrivate}/>
            </button>
            <button onClick={onToggleRecording} className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all ${isRecording ? 'bg-red-600 text-white shadow-lg animate-pulse' : 'bg-white/20 text-white hover:bg-white/40'}`} title={isRecording ? 'Detener grabación' : 'Iniciar grabación'}>
              <IconRecord on={isRecording}/>
            </button>
            <div className="relative">
              <button onClick={() => setShowEmojis(!showEmojis)} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/40 transition-all">
                <IconReaction />
              </button>
              {showEmojis && (
                <div className="absolute bottom-9 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 flex gap-1 shadow-2xl z-50">
                  {emojis.map(e => (
                    <button key={e} onClick={() => handleEmojiClick(e)} className="text-xl hover:scale-125 transition-transform p-1">{e}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setExpandedId('local')} className="w-7 h-7 rounded-full flex items-center justify-center bg-indigo-600 backdrop-blur-md border border-white/10 text-white hover:bg-indigo-500 transition-all">
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
            <StableVideo stream={screenStream} className="w-full h-full object-cover block" />
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
          if (!remoteScreen) return null;
          return (
            <div key={`screen-${u.id}`} className="relative bg-black rounded-[28px] overflow-hidden border border-green-500/50 shadow-2xl group w-52 h-36">
              <StableVideo stream={remoteScreen} className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-green-600 backdrop-blur-md px-2 py-1 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wide text-white">{u.name} - Pantalla</span>
              </div>
              <button onClick={() => setExpandedId(`screen-${u.id}`)} className="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-green-600 text-white opacity-0 group-hover:opacity-100 transition-all">
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
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  const activeStreamRef = useRef<MediaStream | null>(null);
  const activeScreenRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
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

  // Detectar usuarios en proximidad (excluyendo al usuario actual)
  const usersInCall = useMemo(() => {
    return onlineUsers.filter(u => {
      // Excluir al usuario actual
      if (u.id === session?.user?.id) return false;
      const dist = Math.sqrt(Math.pow(u.x - currentUser.x, 2) + Math.pow(u.y - currentUser.y, 2));
      return dist < PROXIMITY_RADIUS;
    });
  }, [onlineUsers, currentUser.x, currentUser.y, session?.user?.id]);

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

  // Toggle grabación
  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      // Detener grabación
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setIsRecording(false);
      setRecordingDuration(0);
    } else {
      // Iniciar grabación
      if (!stream) {
        alert('Necesitas tener la cámara o micrófono activo para grabar');
        return;
      }
      
      try {
        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        
        recorder.onstop = async () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          console.log('Grabación finalizada:', blob.size, 'bytes');
          // Aquí se puede subir a Supabase Storage
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `reunion_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        };
        
        mediaRecorderRef.current = recorder;
        recorder.start(1000);
        setIsRecording(true);
        
        // Iniciar contador
        const startTime = Date.now();
        recordingIntervalRef.current = setInterval(() => {
          setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        
      } catch (err) {
        console.error('Error iniciando grabación:', err);
        alert('No se pudo iniciar la grabación');
      }
    }
  }, [isRecording, stream]);

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

    // Contador de video tracks por peer para detectar screen share
    let videoTrackCount = 0;
    
    pc.ontrack = (event) => {
      console.log('Received remote track from', peerId, 'kind:', event.track.kind, 'label:', event.track.label, 'streamId:', event.streams[0]?.id);
      const remoteStream = event.streams[0];
      const trackLabel = event.track.label.toLowerCase();
      
      // Detectar si es screen share por label O si es el segundo video track
      const isScreenShareByLabel = trackLabel.includes('screen') || 
         trackLabel.includes('display') ||
         trackLabel.includes('window') ||
         trackLabel.includes('monitor');
      
      // Contar video tracks - el segundo video track es screen share
      if (event.track.kind === 'video') {
        videoTrackCount++;
      }
      
      const isScreenShare = event.track.kind === 'video' && (isScreenShareByLabel || videoTrackCount > 1);
      
      if (isScreenShare) {
        console.log('Detected SCREEN SHARE from', peerId);
        setRemoteScreenStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(peerId, remoteStream);
          return newMap;
        });
      } else if (event.track.kind === 'video') {
        // Es cámara normal (solo video tracks)
        console.log('Detected CAMERA from', peerId);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(peerId, remoteStream);
          return newMap;
        });
      } else if (event.track.kind === 'audio') {
        // Audio track - agregar al stream existente o crear nuevo
        console.log('Detected AUDIO from', peerId);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          const existingStream = newMap.get(peerId);
          if (existingStream) {
            // Si ya hay stream, el audio ya está incluido
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
    const pc = createPeerConnection(fromId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    if (webrtcChannelRef.current) {
      webrtcChannelRef.current.send({ type: 'broadcast', event: 'answer', payload: { answer, to: fromId, from: session?.user?.id } });
    }
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

  // Renegociar conexiones existentes cuando el stream local cambia
  useEffect(() => {
    if (!stream || !hasActiveCall || peerConnectionsRef.current.size === 0) return;
    
    console.log('Stream changed, renegotiating with existing peers');
    
    peerConnectionsRef.current.forEach(async (pc, peerId) => {
      // Verificar si necesitamos agregar tracks
      const senders = pc.getSenders();
      const hasVideoSender = senders.some(s => s.track?.kind === 'video');
      const hasAudioSender = senders.some(s => s.track?.kind === 'audio');
      
      let needsRenegotiation = false;
      
      stream.getTracks().forEach(track => {
        const hasSender = senders.some(s => s.track?.id === track.id);
        if (!hasSender) {
          console.log('Adding new track to peer:', peerId, track.kind);
          pc.addTrack(track, stream);
          needsRenegotiation = true;
        }
      });
      
      // Renegociar si se agregaron tracks
      if (needsRenegotiation) {
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
          console.error('Error renegotiating after stream change:', err);
        }
      }
    });
  }, [stream, hasActiveCall, session?.user?.id]);

  // Manejar stream de video
  useEffect(() => {
    const manageStream = async () => {
      if (hasActiveCall || currentUser.isScreenSharing) {
        if (!activeStreamRef.current) {
          try {
            const newStream = await navigator.mediaDevices.getUserMedia({ 
              video: { width: 640, height: 480 }, 
              audio: true 
            });
            activeStreamRef.current = newStream;
            setStream(newStream);
          } catch (err) { console.error("Media error:", err); }
        }
        if (activeStreamRef.current) {
          activeStreamRef.current.getAudioTracks().forEach(track => track.enabled = !!currentUser.isMicOn);
          activeStreamRef.current.getVideoTracks().forEach(track => track.enabled = !!currentUser.isCameraOn);
        }
      } else {
        if (activeStreamRef.current) {
          activeStreamRef.current.getTracks().forEach(track => track.stop());
          activeStreamRef.current = null;
          setStream(null);
        }
      }
    };
    manageStream();
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
            orbitControlsRef={orbitControlsRef}
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
      
      {/* VideoHUD - solo se muestra cuando hay usuarios cerca */}
      {hasActiveCall && (
        <VideoHUD
          userName={currentUser.name}
          visitorId={session?.user?.id || ''}
          micOn={!!currentUser.isMicOn}
          camOn={!!currentUser.isCameraOn}
          sharingOn={!!currentUser.isScreenSharing}
          isPrivate={!!currentUser.isPrivate}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          usersInCall={usersInCall}
          stream={stream}
          screenStream={screenStream}
          remoteStreams={remoteStreams}
          remoteScreenStreams={remoteScreenStreams}
          remoteReaction={remoteReaction}
          onToggleMic={toggleMic}
          onToggleCam={toggleCamera}
          onToggleShare={handleToggleScreenShare}
          onTogglePrivacy={togglePrivacy}
          onToggleRecording={handleToggleRecording}
          onTriggerReaction={handleTriggerReaction}
          onWaveUser={handleWaveUser}
          currentReaction={currentReaction}
          theme={theme}
          speakingUsers={speakingUsers}
          userDistances={userDistances}
        />
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
      
      {/* Recording Manager con análisis de IA */}
      {hasActiveCall && (
        <RecordingManager
          espacioId={activeWorkspace?.id || ''}
          userId={session?.user?.id || ''}
          userName={currentUser.name}
          reunionTitulo={`Reunión ${new Date().toLocaleDateString()}`}
          stream={stream}
          onRecordingStateChange={(recording) => {
            setIsRecording(recording);
          }}
          onProcessingComplete={(summary) => {
            console.log('✅ Resumen AI generado:', summary);
          }}
        />
      )}
    </div>
  );
};

export default VirtualSpace3D;
