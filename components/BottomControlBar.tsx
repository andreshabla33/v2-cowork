import React from 'react';
import { useStore } from '../store/useStore';
import { AvatarPreview } from './Navbar';
import { AvatarConfig } from '../types';

interface BottomControlBarProps {
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleShare: () => void;
  onToggleRecording: () => void;
  onToggleEmojis: () => void;
  onToggleChat: () => void;
  isMicOn: boolean;
  isCamOn: boolean;
  isSharing: boolean;
  isRecording: boolean;
  showEmojis: boolean;
  showChat: boolean;
  onTriggerReaction: (emoji: string) => void;
  avatarConfig: AvatarConfig;
  showShareButton: boolean;
  showRecordingButton: boolean;
}

export const BottomControlBar: React.FC<BottomControlBarProps> = ({
  onToggleMic,
  onToggleCam,
  onToggleShare,
  onToggleRecording,
  onToggleEmojis,
  onToggleChat,
  isMicOn,
  isCamOn,
  isSharing,
  isRecording,
  showEmojis,
  showChat,
  onTriggerReaction,
  avatarConfig,
  showShareButton,
  showRecordingButton,
}) => {
  const emojis = ['👍', '🔥', '❤️', '👏', '😂', '😮', '🚀', '✨'];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-end gap-2">
      {/* Barra Principal Glassmorphism 2026 - Más compacta con mejor efecto glass */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/20 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 hover:bg-black/30 hover:border-white/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        
        {/* Foto de usuario */}
        <div className="w-9 h-9 rounded-xl overflow-hidden bg-indigo-500/20 flex items-center justify-center border border-white/5 mr-1">
          <div className="scale-75 mt-2">
            <AvatarPreview config={avatarConfig} size="small" />
          </div>
        </div>

        {/* Micrófono */}
        <ControlButton 
          onClick={onToggleMic} 
          isActive={isMicOn} 
          activeColor="bg-zinc-700 text-white" 
          inactiveColor="bg-red-500/90 text-white animate-pulse-slow"
          icon={<IconMic on={isMicOn} />}
          tooltip={isMicOn ? "Silenciar" : "Activar micrófono"}
        />

        {/* Cámara */}
        <ControlButton 
          onClick={onToggleCam} 
          isActive={isCamOn} 
          activeColor="bg-zinc-700 text-white" 
          inactiveColor="bg-red-500/90 text-white animate-pulse-slow"
          icon={<IconCam on={isCamOn} />}
          tooltip={isCamOn ? "Apagar cámara" : "Activar cámara"}
        />

        {showShareButton && (
          <>
            <div className="w-px h-6 bg-white/10 mx-0.5"></div>

            {/* Compartir Pantalla */}
            <ControlButton 
              onClick={onToggleShare} 
              isActive={isSharing} 
              activeColor="bg-indigo-500 text-white" 
              inactiveColor="bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
              icon={<IconScreen on={isSharing} />}
              tooltip={isSharing ? "Dejar de compartir" : "Compartir pantalla"}
            />
          </>
        )}

        <div className="w-px h-6 bg-white/10 mx-0.5"></div>

        {/* Chat */}
        <ControlButton 
          onClick={onToggleChat} 
          isActive={showChat} 
          activeColor="bg-blue-500/20 text-blue-400" 
          inactiveColor="bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
          icon={<IconChat />}
          tooltip="Chat"
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
                  className="w-8 h-8 flex items-center justify-center text-xl hover:bg-white/10 rounded-lg transition-all hover:scale-110 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-black/80 border-r border-b border-white/10 transform rotate-45"></div>
            </div>
          )}
        </div>

        {showRecordingButton && (
          <>
            <div className="w-px h-6 bg-white/10 mx-0.5"></div>

            {/* Grabar - Simplificado */}
            <button
              onClick={onToggleRecording}
              className={`
                relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 group
                ${isRecording 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-white/5 hover:bg-white/10 text-white'
                }
              `}
            >
              <div className={`w-3 h-3 rounded-sm ${isRecording ? 'bg-white' : 'bg-red-500 rounded-full'}`}></div>
              <span className="text-xs font-medium text-white/90">
                {isRecording ? 'Detener' : 'Grabar'}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Subcomponente de botón genérico - Más compacto
const ControlButton = ({ onClick, isActive, activeColor, inactiveColor, icon, tooltip }: any) => (
  <div className="relative group/btn">
    <button
      onClick={onClick}
      className={`
        w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300
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
  <svg className="w-5 h-5" fill={on ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
    {on ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0" d="M15.75 8.25a.75.75 0 01.75.75c0 1.12-.492 2.126-1.27 2.812a.75.75 0 11-1.004-1.124A2.25 2.25 0 0015 9a.75.75 0 01.75-.75zM4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z M19.5 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875v-6.75z" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2zM3 3l18 18" />
    )}
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

const IconChat = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);
