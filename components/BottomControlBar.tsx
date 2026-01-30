import React from 'react';
import { useStore } from '../store/useStore';

interface BottomControlBarProps {
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleShare: () => void;
  onToggleRecording: () => void;
  onToggleEmojis: () => void;
  isMicOn: boolean;
  isCamOn: boolean;
  isSharing: boolean;
  isRecording: boolean;
  showEmojis: boolean;
  onTriggerReaction: (emoji: string) => void;
}

export const BottomControlBar: React.FC<BottomControlBarProps> = ({
  onToggleMic,
  onToggleCam,
  onToggleShare,
  onToggleRecording,
  onToggleEmojis,
  isMicOn,
  isCamOn,
  isSharing,
  isRecording,
  showEmojis,
  onTriggerReaction,
}) => {
  const emojis = ['👍', '🔥', '❤️', '👏', '😂', '😮', '🚀', '✨'];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-end gap-2">
      {/* Barra Principal Glassmorphism 2026 */}
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 hover:bg-black/50 hover:border-white/20 hover:shadow-[0_8px_32px_rgba(99,102,241,0.15)]">
        
        {/* Micrófono */}
        <ControlButton 
          onClick={onToggleMic} 
          isActive={isMicOn} 
          activeColor="bg-zinc-700 text-white" 
          inactiveColor="bg-red-500/90 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse-slow"
          icon={<IconMic on={isMicOn} />}
          tooltip={isMicOn ? "Silenciar" : "Activar micrófono"}
        />

        {/* Cámara */}
        <ControlButton 
          onClick={onToggleCam} 
          isActive={isCamOn} 
          activeColor="bg-zinc-700 text-white" 
          inactiveColor="bg-red-500/90 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse-slow"
          icon={<IconCam on={isCamOn} />}
          tooltip={isCamOn ? "Apagar cámara" : "Activar cámara"}
        />

        <div className="w-px h-8 bg-white/10 mx-1"></div>

        {/* Compartir Pantalla */}
        <ControlButton 
          onClick={onToggleShare} 
          isActive={isSharing} 
          activeColor="bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]" 
          inactiveColor="bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
          icon={<IconScreen on={isSharing} />}
          tooltip={isSharing ? "Dejar de compartir" : "Compartir pantalla"}
        />

        {/* Reacciones */}
        <div className="relative">
          <ControlButton 
            onClick={onToggleEmojis} 
            isActive={showEmojis} 
            activeColor="bg-amber-500/20 text-amber-400" 
            inactiveColor="bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
            icon={<IconReaction />}
            tooltip="Reacciones"
          />
          
          {/* Emoji Picker Popup */}
          {showEmojis && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 p-2 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex gap-2 animate-scale-in origin-bottom">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onTriggerReaction(emoji);
                    onToggleEmojis(); // Cerrar al seleccionar
                  }}
                  className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-black/80 border-r border-b border-white/10 transform rotate-45"></div>
            </div>
          )}
        </div>

        <div className="w-px h-8 bg-white/10 mx-1"></div>

        {/* Grabar con Análisis */}
        <button
          onClick={onToggleRecording}
          className={`
            relative flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 group
            ${isRecording 
              ? 'bg-red-500/10 text-red-500 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' 
              : 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 text-white border border-white/5 hover:border-indigo-500/30'
            }
          `}
        >
          {isRecording ? (
            <>
              <div className="relative w-3 h-3">
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
                <span className="relative block w-3 h-3 rounded-full bg-red-500"></span>
              </div>
              <span className="text-xs font-bold tracking-wide">GRABANDO</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 rounded-full bg-white group-hover:bg-indigo-400 transition-colors"></div>
              <span className="text-xs font-medium text-white/90 group-hover:text-white">Grabar</span>
              <span className="text-xs opacity-50 ml-1 group-hover:opacity-100 transition-opacity">✨ AI</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Subcomponente de botón genérico
const ControlButton = ({ onClick, isActive, activeColor, inactiveColor, icon, tooltip }: any) => (
  <div className="relative group/btn">
    <button
      onClick={onClick}
      className={`
        w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
        ${isActive ? activeColor : inactiveColor}
      `}
    >
      {icon}
    </button>
    {/* Tooltip */}
    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-50">
      <div className="bg-black/90 backdrop-blur-md text-white text-[10px] font-medium px-2 py-1 rounded-lg border border-white/10 whitespace-nowrap shadow-xl">
        {tooltip}
      </div>
    </div>
  </div>
);

// --- Iconos (Extraídos para portabilidad) ---

const IconMic = ({ on }: { on: boolean }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {on ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 00-3 3v8a3 3 0 006 0V5a3 3 0 00-3-3z"/> 
       : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />}
  </svg>
);

const IconCam = ({ on }: { on: boolean }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {on ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/> 
       : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />}
  </svg>
);

const IconScreen = ({ on }: { on: boolean }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
    {!on && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" />}
  </svg>
);

const IconReaction = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
