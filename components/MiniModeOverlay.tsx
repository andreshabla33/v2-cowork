import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getSettingsSection } from '../lib/userSettings';
import { PresenceStatus } from '../types';

const STATUS_OPTIONS = [
  { value: PresenceStatus.AVAILABLE, label: 'Disponible', color: 'bg-green-500' },
  { value: PresenceStatus.BUSY, label: 'Ocupado', color: 'bg-red-500' },
  { value: PresenceStatus.AWAY, label: 'Ausente', color: 'bg-amber-500' },
  { value: PresenceStatus.DND, label: 'No molestar', color: 'bg-violet-500' },
];

const statusColorMap: Record<string, string> = {
  [PresenceStatus.AVAILABLE]: 'bg-green-500',
  [PresenceStatus.BUSY]: 'bg-red-500',
  [PresenceStatus.AWAY]: 'bg-amber-500',
  [PresenceStatus.DND]: 'bg-violet-500',
};

export const MiniModeOverlay: React.FC = () => {
  const { isMiniMode, currentUser, onlineUsers, toggleMic, toggleCamera, setActiveSubTab, updateStatus } = useStore();
  const miniSettings = getSettingsSection('minimode');

  const [collapsed, setCollapsed] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });

  // Drag directo al DOM — sin React state, sin re-renders
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !overlayRef.current) return;
      e.preventDefault();
      hasDraggedRef.current = true;
      const x = e.clientX - dragOffsetRef.current.x;
      const y = e.clientY - dragOffsetRef.current.y;
      overlayRef.current.style.left = `${x}px`;
      overlayRef.current.style.top = `${y}px`;
      overlayRef.current.style.right = 'auto';
      overlayRef.current.style.bottom = 'auto';
    };
    const handleUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const handleGoToSpace = () => setActiveSubTab('space');
  const handleGoToChat = () => { setActiveSubTab('chat'); setCollapsed(true); };

  const handleStatusClick = () => {
    if (statusBtnRef.current) {
      const rect = statusBtnRef.current.getBoundingClientRect();
      const pickerH = 4 * 40; // ~4 opciones x 40px
      const pickerW = 150;
      // Calcular posición: arriba del botón, centrado
      let x = rect.left + rect.width / 2 - pickerW / 2;
      let y = rect.top - pickerH - 8;
      // Clamp para no salirse de la ventana
      if (x < 8) x = 8;
      if (x + pickerW > window.innerWidth - 8) x = window.innerWidth - pickerW - 8;
      if (y < 8) y = rect.bottom + 8; // Si no cabe arriba, ponerlo abajo
      setPickerPos({ x, y });
    }
    setShowStatusPicker(!showStatusPicker);
  };

  if (!isMiniMode || !miniSettings.enableMiniMode) return null;

  const posMap: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: 24, right: 24 },
    'bottom-left': { bottom: 24, left: 24 },
    'top-right': { top: 24, right: 24 },
    'top-left': { top: 24, left: 24 },
  };
  const initialPos = posMap[miniSettings.miniModePosition] || posMap['bottom-right'];
  const currentStatus = currentUser.status || PresenceStatus.AVAILABLE;

  // ========== MODO COLAPSADO ==========
  if (collapsed) {
    return (
      <div
        ref={overlayRef}
        className="fixed z-[9999] select-none group"
        style={{ ...initialPos, position: 'fixed' }}
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={() => { if (!hasDraggedRef.current) setCollapsed(false); }}
          className="relative w-11 h-11 rounded-full bg-black/70 backdrop-blur-2xl border border-white/10 shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200 hover:border-violet-500/50"
          title="Expandir Mini Mode"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-[8px] font-black text-white">
            {currentUser.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${statusColorMap[currentStatus]}`} />
          {onlineUsers.length > 0 && (
            <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-violet-600 border-2 border-black flex items-center justify-center text-[7px] font-bold text-white">
              {onlineUsers.length}
            </div>
          )}
        </button>
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-black/90 text-white text-[9px] font-medium px-2 py-1 rounded-lg border border-white/10 whitespace-nowrap">
            {onlineUsers.length} online · Click para expandir
          </div>
        </div>
      </div>
    );
  }

  // ========== MODO EXPANDIDO ==========
  return (
    <>
      <div
        ref={overlayRef}
        className="fixed z-[9999] select-none"
        style={{ ...initialPos, position: 'fixed', width: 280 }}
      >
        <div className="rounded-2xl border border-white/10 bg-black/75 backdrop-blur-2xl shadow-2xl shadow-black/50">
          
          {/* Header draggable */}
          <div
            className="flex items-center justify-between px-3 py-2.5 cursor-grab active:cursor-grabbing bg-white/[0.03] rounded-t-2xl"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-[10px] font-black text-white">
                  {currentUser.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${statusColorMap[currentStatus]}`} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/80 leading-none">{currentUser.name}</p>
                <p className="text-[8px] text-white/30 mt-0.5">{onlineUsers.length} online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleGoToChat} className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:bg-blue-600/30 hover:text-blue-400 transition-colors" title="Ir al Chat">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </button>
              <button onClick={() => setCollapsed(true)} className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60 transition-colors" title="Minimizar">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
              </button>
            </div>
          </div>

          {/* Online users strip */}
          {onlineUsers.length > 0 && (
            <div className="px-3 py-2 border-t border-white/[0.05] flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {onlineUsers.slice(0, 5).map(u => (
                  <div key={u.id} className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 border-2 border-black flex items-center justify-center text-[6px] font-bold text-white" title={u.name}>
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                ))}
                {onlineUsers.length > 5 && (
                  <div className="w-5 h-5 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-[6px] font-bold text-white/50">+{onlineUsers.length - 5}</div>
                )}
              </div>
              <span className="text-[8px] text-white/30">{onlineUsers.length} en el espacio</span>
            </div>
          )}

          {/* Controls bar */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-t border-white/[0.05] rounded-b-2xl">
            <button onClick={toggleMic} className={`p-1.5 rounded-lg transition-colors ${currentUser.isMicOn ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'}`} title={currentUser.isMicOn ? 'Silenciar' : 'Activar mic'}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {currentUser.isMicOn
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3l18 18" /></>
                }
              </svg>
            </button>
            <button onClick={toggleCamera} className={`p-1.5 rounded-lg transition-colors ${currentUser.isCameraOn ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'}`} title={currentUser.isCameraOn ? 'Apagar cámara' : 'Encender cámara'}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {currentUser.isCameraOn
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3l18 18" /></>
                }
              </svg>
            </button>

            {/* Status selector */}
            <button
              ref={statusBtnRef}
              onClick={handleStatusClick}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              title="Cambiar estado"
            >
              <div className={`w-2 h-2 rounded-full ${statusColorMap[currentStatus]}`} />
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">
                {STATUS_OPTIONS.find(s => s.value === currentStatus)?.label || 'Disponible'}
              </span>
              <svg className="w-2 h-2 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
            </button>

            <div className="flex-1" />

            <button onClick={handleGoToSpace} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 transition-colors" title="Volver al espacio">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              <span className="text-[8px] font-bold uppercase tracking-wider">Espacio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status picker — renderizado como portal fijo, fuera del overflow */}
      {showStatusPicker && (
        <>
          <div className="fixed inset-0 z-[10000]" onClick={() => setShowStatusPicker(false)} />
          <div
            className="fixed z-[10001] bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl"
            style={{ left: pickerPos.x, top: pickerPos.y, width: 150 }}
          >
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { updateStatus(opt.value); setShowStatusPicker(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/10 transition-colors first:rounded-t-xl last:rounded-b-xl ${currentStatus === opt.value ? 'bg-violet-600/20' : ''}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                <span className="text-[10px] font-medium text-white/80">{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default MiniModeOverlay;
