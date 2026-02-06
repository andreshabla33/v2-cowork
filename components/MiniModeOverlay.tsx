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

export const MiniModeOverlay: React.FC<MiniModeOverlayProps> = ({
  stream,
  remoteStreams,
  lastMessages = [],
}) => {
  const { isMiniMode, setMiniMode, currentUser, onlineUsers, toggleMic, toggleCamera } = useStore();
  const miniSettings = getSettingsSection('minimode');

  // Dragging state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Expanded sections
  const [showChat, setShowChat] = useState(miniSettings.showChatInMini);
  const [showVideo, setShowVideo] = useState(miniSettings.showVideoInMini);

  // Auto-minimize via visibilitychange
  useEffect(() => {
    if (!miniSettings.autoMinimize || !miniSettings.enableMiniMode) return;

    let timer: any = null;
    const handleVisibility = () => {
      if (document.hidden) {
        timer = setTimeout(() => {
          setMiniMode(true);
        }, miniSettings.autoMinimizeDelay * 1000);
      } else {
        if (timer) clearTimeout(timer);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timer) clearTimeout(timer);
    };
  }, [miniSettings.autoMinimize, miniSettings.autoMinimizeDelay, miniSettings.enableMiniMode]);

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

  if (!isMiniMode || !miniSettings.enableMiniMode) return null;

  const posStyle = pos
    ? { left: `${pos.x}px`, top: `${pos.y}px` }
    : POSITION_MAP[miniSettings.miniModePosition] || POSITION_MAP['bottom-right'];

  // Get first remote stream for video preview
  const firstRemoteStream = remoteStreams ? Array.from(remoteStreams.values())[0] : null;

  const statusColors: Record<string, string> = {
    [PresenceStatus.AVAILABLE]: 'bg-green-500',
    [PresenceStatus.BUSY]: 'bg-red-500',
    [PresenceStatus.AWAY]: 'bg-amber-500',
    [PresenceStatus.DND]: 'bg-red-600',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed z-[9999] select-none"
      style={{
        ...posStyle,
        position: 'fixed',
        width: showVideo ? '320px' : '280px',
      }}
    >
      {/* Contenedor principal glassmorphism */}
      <div className="rounded-3xl overflow-hidden border border-white/10 bg-black/70 backdrop-blur-2xl shadow-2xl shadow-black/50">
        
        {/* Header draggable */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing bg-white/[0.03] border-b border-white/[0.05]"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-[10px] font-black text-white">
                {currentUser.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${statusColors[currentUser.status || PresenceStatus.AVAILABLE]}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/80 leading-none">{currentUser.name}</p>
              <p className="text-[8px] text-white/30 mt-0.5">{onlineUsers.length} online</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Toggle video section */}
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
            {/* Toggle chat section */}
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
            {/* Expand button */}
            <button
              onClick={() => setMiniMode(false)}
              className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-violet-600/30 hover:text-violet-400 transition-all"
              title="Expandir"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
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
              <div className="h-32 flex items-center justify-center">
                <p className="text-[10px] text-white/20 font-medium">Sin video activo</p>
              </div>
            )}
            {/* Online users avatars strip */}
            {onlineUsers.length > 0 && (
              <div className="absolute bottom-2 left-2 flex -space-x-1.5">
                {onlineUsers.slice(0, 5).map(u => (
                  <div key={u.id} className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 border-2 border-black flex items-center justify-center text-[7px] font-bold text-white" title={u.name}>
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                ))}
                {onlineUsers.length > 5 && (
                  <div className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-[7px] font-bold text-white/50">
                    +{onlineUsers.length - 5}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chat section */}
        {showChat && lastMessages.length > 0 && (
          <div className="px-3 py-2 max-h-24 overflow-y-auto border-t border-white/[0.05]">
            {lastMessages.slice(-3).map((msg, i) => (
              <div key={i} className="mb-1 last:mb-0">
                <span className="text-[9px] font-bold text-violet-400">{msg.from}: </span>
                <span className="text-[9px] text-white/60">{msg.text.length > 60 ? msg.text.slice(0, 60) + '...' : msg.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Controls bar */}
        <div className="flex items-center justify-center gap-2 px-3 py-2.5 border-t border-white/[0.05]">
          {/* Mic toggle */}
          <button
            onClick={toggleMic}
            className={`p-2 rounded-xl transition-all ${currentUser.isMicOn ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'}`}
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
            className={`p-2 rounded-xl transition-all ${currentUser.isCameraOn ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'}`}
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
          {/* Status indicator */}
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03]">
            <div className={`w-2 h-2 rounded-full ${statusColors[currentUser.status || PresenceStatus.AVAILABLE]}`} />
            <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">
              {currentUser.status || 'available'}
            </span>
          </div>
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
      className="w-full h-32 object-cover"
    />
  );
};

export default MiniModeOverlay;
