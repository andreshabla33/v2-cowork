'use client';

import React, { useRef, useEffect, useMemo, Suspense, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { User, PresenceStatus } from '@/types';
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
  usersInCall: User[];
  stream: MediaStream | null;
  screenStream: MediaStream | null;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleShare: () => void;
  theme: string;
}

const VideoHUD: React.FC<VideoHUDProps> = ({
  userName, micOn, camOn, sharingOn, usersInCall, stream, screenStream,
  onToggleMic, onToggleCam, onToggleShare, theme
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const currentStream = sharingOn ? screenStream : stream;
  const accentColor = theme === 'arcade' ? 'bg-[#00ff41] text-black' : 'bg-indigo-600 text-white';
  const emojis = ['👍', '🔥', '❤️', '👏', '😂', '😮', '🚀', '✨'];
  const [showEmojis, setShowEmojis] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localVideoRef.current.srcObject !== currentStream) {
      localVideoRef.current.srcObject = currentStream;
      localVideoRef.current.play().catch(e => console.warn("Auto-play error", e));
    }
  }, [currentStream]);

  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto z-50">
      {/* Burbuja local (tu video) */}
      <div className="relative bg-black rounded-[28px] overflow-hidden border border-white/10 shadow-2xl group w-52 h-36">
        <div className={`relative w-full h-full overflow-hidden flex items-center justify-center transition-opacity ${!camOn && !sharingOn ? 'opacity-0' : 'opacity-100'} ${!sharingOn ? 'mirror' : ''}`}>
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover block" />
        </div>
        {(!camOn && !sharingOn) && (
          <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-2xl bg-black/50">
              {userName.charAt(0)}
            </div>
          </div>
        )}
        
        {/* Controles */}
        <div className="absolute bottom-3 left-2 right-2 flex justify-center items-center gap-1.5 transition-all duration-300 opacity-0 group-hover:opacity-100">
          <button onClick={onToggleMic} className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all ${micOn ? 'bg-white/20 text-white hover:bg-white/40' : 'bg-red-500 text-white shadow-lg'}`}>
            <IconMic on={micOn}/>
          </button>
          <button onClick={onToggleCam} className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all ${camOn ? 'bg-white/20 text-white hover:bg-white/40' : 'bg-red-500 text-white shadow-lg'}`}>
            <IconCam on={camOn}/>
          </button>
          <button onClick={onToggleShare} className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all ${sharingOn ? accentColor : 'bg-white/20 text-white hover:bg-white/40'}`}>
            <IconScreen on={sharingOn}/>
          </button>
          <div className="relative">
            <button onClick={() => setShowEmojis(!showEmojis)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/40 transition-all">
              <IconReaction />
            </button>
            {showEmojis && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 flex gap-1 shadow-2xl">
                {emojis.map(e => (
                  <button key={e} onClick={() => setShowEmojis(false)} className="text-xl hover:scale-125 transition-transform p-1">{e}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Nombre */}
        <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wide text-white">Tú</span>
        </div>
      </div>

      {/* Burbujas de usuarios cercanos */}
      {usersInCall.map((u) => (
        <div key={u.id} className="relative bg-zinc-900 rounded-[28px] overflow-hidden border border-white/10 shadow-2xl group w-52 h-36">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white font-black text-2xl bg-black/40">
              {u.name.charAt(0)}
            </div>
          </div>
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
            <div className={`w-2 h-2 rounded-full ${u.isMicOn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wide text-white truncate max-w-[100px]">{u.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============== COMPONENTE PRINCIPAL ==============
interface VirtualSpace3DProps {
  theme?: string;
}

const VirtualSpace3D: React.FC<VirtualSpace3DProps> = ({ theme = 'dark' }) => {
  const { currentUser, onlineUsers, setPosition, activeWorkspace, toggleMic, toggleCamera, toggleScreenShare } = useStore();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const activeScreenRef = useRef<MediaStream | null>(null);

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
    }
  }, [hasActiveCall]);

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
          usersInCall={usersInCall}
          stream={stream}
          screenStream={screenStream}
          onToggleMic={toggleMic}
          onToggleCam={toggleCamera}
          onToggleShare={handleToggleScreenShare}
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
