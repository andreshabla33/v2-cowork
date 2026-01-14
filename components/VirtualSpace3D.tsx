'use client';

import React, { useRef, useEffect, useMemo, Suspense, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { User, PresenceStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import { ProceduralChibiAvatar } from './Avatar3DGLTF';

// Constantes
const MOVE_SPEED = 4;
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

// ============== AVATAR 3D CHIBI (vista 2.5D isométrica) ==============
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
      {/* Avatar 3D Chibi */}
      <ProceduralChibiAvatar
        config={config || { skinColor: '#fcd34d', clothingColor: '#6366f1', hairColor: '#4b2c20' }}
        isMoving={isMoving}
        direction={direction}
      />
      
      {/* Indicador de estado */}
      <mesh position={[0.4, 1.6, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color={statusColors[status]} />
      </mesh>
      
      {/* Nombre flotante */}
      <Text
        position={[0, 2.0, 0]}
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

  useFrame((state, delta) => {
    let dx = 0, dy = 0;
    let newDirection = direction;

    // Movimiento en 2D (corregido para vista isométrica)
    if (keysPressed.current.has('KeyW') || keysPressed.current.has('ArrowUp')) { dy = MOVE_SPEED * delta; newDirection = 'up'; }
    if (keysPressed.current.has('KeyS') || keysPressed.current.has('ArrowDown')) { dy = -MOVE_SPEED * delta; newDirection = 'front'; }
    if (keysPressed.current.has('KeyA') || keysPressed.current.has('ArrowLeft')) { dx = -MOVE_SPEED * delta; newDirection = 'left'; }
    if (keysPressed.current.has('KeyD') || keysPressed.current.has('ArrowRight')) { dx = MOVE_SPEED * delta; newDirection = 'right'; }

    // Normalizar diagonal
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    const moving = dx !== 0 || dy !== 0;
    
    if (moving) {
      // Actualizar posición (X horizontal, Z vertical en el mundo 3D visto desde arriba)
      positionRef.current.x = Math.max(0, Math.min(WORLD_SIZE, positionRef.current.x + dx));
      positionRef.current.z = Math.max(0, Math.min(WORLD_SIZE, positionRef.current.z - dy));
    }

    // Mover el grupo del avatar directamente
    if (groupRef.current) {
      groupRef.current.position.x = positionRef.current.x;
      groupRef.current.position.z = positionRef.current.z;
    }

    setIsMoving(moving);
    if (newDirection !== direction) setDirection(newDirection);

    // Cámara 2.5D ISOMÉTRICA (en ángulo para ver avatares 3D)
    const cameraOffset = 12;
    camera.position.set(
      positionRef.current.x,
      cameraOffset * 1.5,
      positionRef.current.z + cameraOffset
    );
    camera.lookAt(positionRef.current.x, 0, positionRef.current.z);

    // Sincronizar posición con el store (factor 16 para consistencia)
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
      
      {/* Cámara 2.5D Isométrica */}
      <OrthographicCamera
        makeDefault
        position={[WORLD_SIZE/2, 30, WORLD_SIZE/2 + 20]}
        zoom={40}
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

// ============== VIDEO HUD (burbuja con cámara) ==============
interface VideoHUDProps {
  userName: string;
  micOn: boolean;
  camOn: boolean;
  sharingOn: boolean;
  isPrivate: boolean;
  usersInCall: User[];
  stream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleShare: () => void;
  onTogglePrivacy: () => void;
  onTriggerReaction: (emoji: string) => void;
  currentReaction: string | null;
  theme: string;
}

const VideoHUD: React.FC<VideoHUDProps> = ({
  userName, micOn, camOn, sharingOn, isPrivate, usersInCall, stream, screenStream, remoteStreams,
  onToggleMic, onToggleCam, onToggleShare, onTogglePrivacy, onTriggerReaction, currentReaction, theme
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const accentColor = theme === 'arcade' ? 'bg-[#00ff41] text-black' : 'bg-indigo-600 text-white';
  const emojis = ['👍', '🔥', '❤️', '👏', '😂', '😮', '🚀', '✨'];
  const [showEmojis, setShowEmojis] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  return (
    <>
      {/* Overlay expandido */}
      {expandedId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center" onClick={() => setExpandedId(null)}>
          <div className="relative w-[80vw] h-[80vh] max-w-4xl bg-black rounded-[40px] overflow-hidden border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            {expandedId === 'local' && stream && (
              <video autoPlay muted playsInline className="w-full h-full object-contain mirror" ref={el => { if (el && stream) { el.srcObject = stream; el.play().catch(() => {}); } }} />
            )}
            {expandedId === 'screen' && screenStream && (
              <video autoPlay playsInline className="w-full h-full object-contain" ref={el => { if (el && screenStream) { el.srcObject = screenStream; el.play().catch(() => {}); } }} />
            )}
            {expandedId !== 'local' && expandedId !== 'screen' && (() => {
              const rs = remoteStreams.get(expandedId);
              return rs ? (
                <video autoPlay playsInline className="w-full h-full object-contain" ref={el => { if (el && rs) { el.srcObject = rs; el.play().catch(() => {}); } }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center text-6xl font-black text-white">
                    {usersInCall.find(u => u.id === expandedId)?.name.charAt(0) || '?'}
                  </div>
                </div>
              );
            })()}
            <button onClick={() => setExpandedId(null)} className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
              <IconExpand on={true} />
            </button>
            {/* Reacción en pantalla expandida */}
            {currentReaction && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl animate-bounce pointer-events-none">
                {currentReaction}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto z-50">
        {/* Indicador de privacidad */}
        {isPrivate && (
          <div className="bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <IconPrivacy on={true} /> Conversación privada
          </div>
        )}

        {/* Burbuja local (tu cámara) */}
        <div className="relative bg-black rounded-[28px] overflow-hidden border border-white/10 shadow-2xl group w-52 h-36">
          {/* Reacción actual */}
          {currentReaction && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl animate-bounce z-20 pointer-events-none">
              {currentReaction}
            </div>
          )}
          <div className={`relative w-full h-full overflow-hidden flex items-center justify-center transition-opacity ${!camOn ? 'opacity-0' : 'opacity-100'} mirror`}>
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover block" />
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
            <video ref={screenVideoRef} autoPlay playsInline className="w-full h-full object-cover block" />
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
          return (
            <div key={u.id} className="relative bg-zinc-900 rounded-[28px] overflow-hidden border border-white/10 shadow-2xl group w-52 h-36">
              {remoteStream ? (
                <video 
                  autoPlay playsInline 
                  className="absolute inset-0 w-full h-full object-cover"
                  ref={(el) => { if (el && el.srcObject !== remoteStream) { el.srcObject = remoteStream; el.play().catch(() => {}); } }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white font-black text-2xl bg-black/40">
                    {u.name.charAt(0)}
                  </div>
                </div>
              )}
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                <div className={`w-2 h-2 rounded-full ${u.isMicOn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wide text-white truncate max-w-[100px]">{u.name}</span>
              </div>
              <button onClick={() => setExpandedId(u.id)} className="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600 text-white opacity-0 group-hover:opacity-100 transition-all">
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
  const activeStreamRef = useRef<MediaStream | null>(null);
  const activeScreenRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const webrtcChannelRef = useRef<any>(null);
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);

  // Detectar usuarios en proximidad
  const usersInCall = useMemo(() => {
    return onlineUsers.filter(u => {
      const dist = Math.sqrt(Math.pow(u.x - currentUser.x, 2) + Math.pow(u.y - currentUser.y, 2));
      return dist < PROXIMITY_RADIUS;
    });
  }, [onlineUsers, currentUser.x, currentUser.y]);

  const hasActiveCall = usersInCall.length > 0;

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

  // Trigger reaction con auto-clear
  const handleTriggerReaction = useCallback((emoji: string) => {
    setCurrentReaction(emoji);
    setTimeout(() => setCurrentReaction(null), 3000);
  }, []);

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

    pc.ontrack = (event) => {
      console.log('Received remote track from', peerId);
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(peerId, event.streams[0]);
        return newMap;
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        pc.close();
        peerConnectionsRef.current.delete(peerId);
        setRemoteStreams(prev => { const m = new Map(prev); m.delete(peerId); return m; });
      }
    };

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => pc.addTrack(track, activeStreamRef.current!));
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
      .subscribe();
    webrtcChannelRef.current = webrtcChannel;
    return () => {
      supabase.removeChannel(webrtcChannel);
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, [activeWorkspace?.id, session?.user?.id, handleOffer, handleAnswer, handleIceCandidate]);

  // Iniciar llamadas cuando hay usuarios cerca
  useEffect(() => {
    if (!hasActiveCall || !activeStreamRef.current) return;
    usersInCall.forEach(user => {
      if (!peerConnectionsRef.current.has(user.id) && session?.user?.id && session.user.id < user.id) {
        initiateCall(user.id);
      }
    });
  }, [usersInCall, hasActiveCall, initiateCall, session?.user?.id]);

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
      
      {/* VideoHUD - solo se muestra cuando hay usuarios cerca */}
      {hasActiveCall && (
        <VideoHUD
          userName={currentUser.name}
          micOn={!!currentUser.isMicOn}
          camOn={!!currentUser.isCameraOn}
          sharingOn={!!currentUser.isScreenSharing}
          isPrivate={!!currentUser.isPrivate}
          usersInCall={usersInCall}
          stream={stream}
          screenStream={screenStream}
          remoteStreams={remoteStreams}
          onToggleMic={toggleMic}
          onToggleCam={toggleCamera}
          onToggleShare={handleToggleScreenShare}
          onTogglePrivacy={togglePrivacy}
          onTriggerReaction={handleTriggerReaction}
          currentReaction={currentReaction}
          theme={theme}
        />
      )}
      
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
