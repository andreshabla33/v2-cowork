import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getSettingsSection } from '../lib/userSettings';
import { PresenceStatus } from '../types';

interface MiniModeOverlayProps {
  stream?: MediaStream | null;
  remoteStreams?: Map<string, MediaStream>;
  lastMessages?: Array<{ from: string; text: string; time: number }>;
}

const POSITION_MAP: Record<string, { bottom?: string; top?: string; left?: string; right?: string }> = {
  'bottom-right': { bottom: '24px', right: '24px' },
  'bottom-left': { bottom: '24px', left: '24px' },
  'top-right': { top: '24px', right: '24px' },
  'top-left': { top: '24px', left: '24px' },
};

const STATUS_OPTIONS = [
  { value: PresenceStatus.AVAILABLE, label: 'Disponible', color: 'bg-green-500', icon: '🟢' },
  { value: PresenceStatus.BUSY, label: 'Ocupado', color: 'bg-red-500', icon: '🔴' },
  { value: PresenceStatus.AWAY, label: 'Ausente', color: 'bg-amber-500', icon: '🟡' },
  { value: PresenceStatus.DND, label: 'No molestar', color: 'bg-violet-500', icon: '🟣' },
];

export const MiniModeOverlay: React.FC<MiniModeOverlayProps> = ({
  stream,
  remoteStreams,
  lastMessages = [],
}) => {
  const { isMiniMode, setMiniMode, currentUser, onlineUsers, toggleMic, toggleCamera, setActiveSubTab, updateStatus } = useStore();
  const miniSettings = getSettingsSection('minimode');

  // Collapsed = bolita pequeña para no estorbar
  const [collapsed, setCollapsed] = useState(false);
  // Status picker
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // Dragging state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Expanded sections
  const [showChat, setShowChat] = useState(miniSettings.showChatInMini);
  const [showVideo, setShowVideo] = useState(miniSettings.showVideoInMini);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging]);

  // Volver al espacio virtual
  const handleGoToSpace = () => {
    setActiveSubTab('space');
  };

  if (!isMiniMode || !miniSettings.enableMiniMode) return null;

  const posStyle = pos
    ? { left: `${pos.x}px`, top: `${pos.y}px` }
    : POSITION_MAP[miniSettings.miniModePosition] || POSITION_MAP['bottom-right'];

  const firstRemoteStream = remoteStreams ? Array.from(remoteStreams.values())[0] : null;

  const statusColors: Record<string, string> = {
    [PresenceStatus.AVAILABLE]: 'bg-green-500',
    [PresenceStatus.BUSY]: 'bg-red-500',
    [PresenceStatus.AWAY]: 'bg-amber-500',
    [PresenceStatus.DND]: 'bg-violet-500',
  };

  const currentStatus = currentUser.status || PresenceStatus.AVAILABLE;

  // ========== MODO COLAPSADO: bolita pequeña ==========
  if (collapsed) {
    return (
      <div
        ref={overlayRef}
        className="fixed z-[9999] select-none group"
        style={{ ...posStyle, position: 'fixed' }}
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="relative w-11 h-11 rounded-full bg-black/70 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 flex items-center justify-center cursor-pointer hover:scale-110 transition-all duration-300 hover:border-violet-500/50"
          title="Expandir Mini Mode"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-[8px] font-black text-white">
            {currentUser.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${statusColors[currentStatus]}`} />
          {onlineUsers.length > 0 && (
            <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-violet-600 border-2 border-black flex items-center justify-center text-[7px] font-bold text-white">
              {onlineUsers.length}
            </div>
          )}
        </button>
        {/* Tooltip on hover */}
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-black/90 backdrop-blur-md text-white text-[9px] font-medium px-2 py-1 rounded-lg border border-white/10 whitespace-nowrap">
            {onlineUsers.length} online · Click para expandir
          </div>
        </div>
      </div>
    );
  }

  // ========== MODO EXPANDIDO ==========
  return (
    <div
      ref={overlayRef}
      className="fixed z-[9999] select-none animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{
        ...posStyle,
        position: 'fixed',
        width: showVideo ? '300px' : '260px',
      }}
    >
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/75 backdrop-blur-2xl shadow-2xl shadow-black/50">
        
        {/* Header draggable */}
        <div
          className="flex items-center justify-between px-3 py-2.5 cursor-grab active:cursor-grabbing bg-white/[0.03] border-b border-white/[0.05]"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-[10px] font-black text-white">
                {currentUser.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${statusColors[currentStatus]}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/80 leading-none">{currentUser.name}</p>
              <p className="text-[8px] text-white/30 mt-0.5">{onlineUsers.length} online</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {miniSettings.showVideoInMini && (
              <button
                onClick={() => setShowVideo(!showVideo)}
                className={`p-1.5 rounded-lg transition-all ${showVideo ? 'bg-violet-600/30 text-violet-400' : 'bg-white/5 text-white/30'} hover:bg-white/10`}
                title="Video"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
            {miniSettings.showChatInMini && (
              <button
                onClick={() => setShowChat(!showChat)}
                className={`p-1.5 rounded-lg transition-all ${showChat ? 'bg-violet-600/30 text-violet-400' : 'bg-white/5 text-white/30'} hover:bg-white/10`}
                title="Chat"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            )}
            {/* Colapsar a bolita */}
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60 transition-all"
              title="Minimizar"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Video section */}
        {showVideo && (
          <div className="relative bg-black/50">
            {firstRemoteStream ? (
              <VideoPreview stream={firstRemoteStream} />
            ) : stream ? (
              <VideoPreview stream={stream} muted />
            ) : (
              <div className="h-28 flex items-center justify-center">
                <p className="text-[10px] text-white/20 font-medium">Sin video activo</p>
              </div>
            )}
            {onlineUsers.length > 0 && (
              <div className="absolute bottom-2 left-2 flex -space-x-1.5">
                {onlineUsers.slice(0, 5).map(u => (
                  <div key={u.id} className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 border-2 border-black flex items-center justify-center text-[6px] font-bold text-white" title={u.name}>
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                ))}
                {onlineUsers.length > 5 && (
                  <div className="w-5 h-5 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-[6px] font-bold text-white/50">
                    +{onlineUsers.length - 5}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chat section */}
        {showChat && lastMessages.length > 0 && (
          <div className="px-3 py-2 max-h-20 overflow-y-auto border-t border-white/[0.05]">
            {lastMessages.slice(-3).map((msg, i) => (
              <div key={i} className="mb-1 last:mb-0">
                <span className="text-[9px] font-bold text-violet-400">{msg.from}: </span>
                <span className="text-[9px] text-white/60">{msg.text.length > 50 ? msg.text.slice(0, 50) + '...' : msg.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Controls bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-t border-white/[0.05]">
          {/* Mic toggle */}
          <button
            onClick={toggleMic}
            className={`p-1.5 rounded-lg transition-all ${currentUser.isMicOn ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'}`}
            title={currentUser.isMicOn ? 'Silenciar mic' : 'Activar mic'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {currentUser.isMicOn ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3l18 18" />
                </>
              )}
            </svg>
          </button>
          {/* Camera toggle */}
          <button
            onClick={toggleCamera}
            className={`p-1.5 rounded-lg transition-all ${currentUser.isCameraOn ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'}`}
            title={currentUser.isCameraOn ? 'Apagar cámara' : 'Encender cámara'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {currentUser.isCameraOn ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3l18 18" />
                </>
              )}
            </svg>
          </button>

          {/* Status selector */}
          <div className="relative">
            <button
              onClick={() => setShowStatusPicker(!showStatusPicker)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-all"
              title="Cambiar estado"
            >
              <div className={`w-2 h-2 rounded-full ${statusColors[currentStatus]}`} />
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">
                {STATUS_OPTIONS.find(s => s.value === currentStatus)?.label || 'Disponible'}
              </span>
              <svg className="w-2 h-2 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showStatusPicker && (
              <div className="absolute bottom-full mb-1 left-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[140px]">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { updateStatus(opt.value); setShowStatusPicker(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/10 transition-all ${currentStatus === opt.value ? 'bg-white/[0.06]' : ''}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                    <span className="text-[10px] font-medium text-white/80">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Volver al espacio */}
          <button
            onClick={handleGoToSpace}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 transition-all"
            title="Volver al espacio virtual"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[8px] font-bold uppercase tracking-wider">Espacio</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Video preview sub-component
const VideoPreview: React.FC<{ stream: MediaStream; muted?: boolean }> = ({ stream, muted }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className="w-full h-28 object-cover"
    />
  );
};

export default MiniModeOverlay;
