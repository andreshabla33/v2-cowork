'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useRoomContext,
  useLocalParticipant,
  Chat,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Room, Track, RoomEvent } from 'livekit-client';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { MeetingControlBar, TipoReunion } from './MeetingControlBar';
import { TipoReunionUnificado, MAPEO_TIPO_GRABACION, InvitadoExterno } from '@/types/meeting-types';
import { CargoLaboral } from '../recording/types/analysis';
import { CustomParticipantTile } from './CustomParticipantTile';
import { ScreenShareViewer } from './ScreenShareViewer';
import { ViewModeSelector, ViewMode } from './ViewModeSelector';
import { RecordingManager } from '../recording/RecordingManager';

interface MeetingRoomProps {
  salaId: string;
  tokenInvitacion?: string;
  nombreInvitado?: string;
  tipoReunion?: TipoReunion;
  reunionId?: string;
  onLeave?: () => void;
  onError?: (error: string) => void;
}

interface TokenData {
  token: string;
  url: string;
  sala_nombre: string;
  sala_id?: string;
  participante_id: string;
  permisos: {
    canPublish: boolean;
    canSubscribe: boolean;
    roomAdmin: boolean;
  };
  tipo_reunion?: TipoReunionUnificado;
  tipo_grabacion?: string;
  reunion_id?: string;
  invitado_externo?: InvitadoExterno;
}

// Estilos por tema
const themeStyles = {
  dark: {
    bg: 'bg-[#0f0f1a]',
    card: 'bg-white/5 border-white/10',
    text: 'text-white',
    accent: 'bg-indigo-600 hover:bg-indigo-500',
    danger: 'bg-red-600 hover:bg-red-500',
  },
  arcade: {
    bg: 'bg-black',
    card: 'bg-black border-[#00ff41]/30',
    text: 'text-[#00ff41]',
    accent: 'bg-[#00ff41] text-black hover:bg-white',
    danger: 'bg-red-600 hover:bg-red-500',
  },
};

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  salaId,
  tokenInvitacion,
  nombreInvitado,
  tipoReunion: propTipoReunion,
  reunionId: propReunionId,
  onLeave,
  onError,
}) => {
  const { theme, currentUser, session, activeWorkspace } = useStore();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  
  // Estados para tipo de reunión
  const [tipoReunion, setTipoReunion] = useState<TipoReunion>(propTipoReunion || 'equipo');
  const [reunionId, setReunionId] = useState<string | undefined>(propReunionId);
  const [showChat, setShowChat] = useState(false);
  const [cargoUsuario, setCargoUsuario] = useState<CargoLaboral>('colaborador');

  const s = themeStyles[theme as keyof typeof themeStyles] || themeStyles.dark;

  // Cargar cargo del usuario desde miembros_espacio
  useEffect(() => {
    const cargarCargo = async () => {
      if (!currentUser?.id || !activeWorkspace?.id) return;
      
      const { data } = await supabase
        .from('miembros_espacio')
        .select('cargo')
        .eq('usuario_id', currentUser.id)
        .eq('espacio_id', activeWorkspace.id)
        .single();
      
      if (data?.cargo) {
        console.log('📋 Cargo del usuario (MeetingRoom):', data.cargo);
        setCargoUsuario(data.cargo as CargoLaboral);
      }
    };
    
    cargarCargo();
  }, [currentUser?.id, activeWorkspace?.id]);

  // Obtener token de LiveKit
  const fetchToken = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Si es usuario autenticado, agregar token de auth
      if (session?.access_token && !tokenInvitacion) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const body: Record<string, any> = {};
      
      if (tokenInvitacion) {
        body.token_invitacion = tokenInvitacion;
        if (nombreInvitado) {
          body.nombre_invitado = nombreInvitado;
        }
      } else {
        body.sala_id = salaId;
      }

      const SUPABASE_URL = 'https://lcryrsdyrzotjqdxcwtp.supabase.co';
      console.log('🔵 Llamando Edge Function livekit-token...', { body });
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/livekit-token`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        }
      );

      console.log('📡 Response status:', response.status, response.statusText);

      const text = await response.text();
      console.log('📡 Response text:', text);

      if (!text) {
        throw new Error('Respuesta vacía del servidor. Verifica que LiveKit esté configurado.');
      }

      let data: TokenData;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Error parseando respuesta: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error((data as any).error || `Error ${response.status}: ${response.statusText}`);
      }

      setTokenData(data);
      
      // Usar tipo_reunion del token si viene (para invitados)
      if (data.tipo_reunion) {
        const tipoMap: Record<string, TipoReunion> = {
          'equipo': 'equipo',
          'deal': 'deal',
          'entrevista': 'entrevista'
        };
        setTipoReunion(tipoMap[data.tipo_reunion] || 'equipo');
      }
      if (data.reunion_id) {
        setReunionId(data.reunion_id);
      }
    } catch (err: any) {
      console.error('Error fetching token:', err);
      setError(err.message);
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, [salaId, tokenInvitacion, nombreInvitado, session?.access_token, onError]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Obtener tipo de reunión de la sala (para usuarios autenticados o invitados)
  // Solo se ejecuta una vez cuando tokenData está listo
  const [salaInfoFetched, setSalaInfoFetched] = useState(false);
  const [invitadoExterno, setInvitadoExterno] = useState<InvitadoExterno | null>(null);
  
  useEffect(() => {
    if (propTipoReunion || salaInfoFetched || !tokenData) return;
    
    const fetchSalaInfo = async () => {
      // Mapeo de tipo BD a TipoReunion del ControlBar
      const tipoMapBD: Record<string, TipoReunion> = {
        'general': 'equipo',
        'deal': 'deal',
        'entrevista': 'entrevista'
      };
      // Mapeo de tipo unificado a TipoReunion del ControlBar
      const tipoMapUnificado: Record<TipoReunionUnificado, TipoReunion> = {
        'equipo': 'equipo',
        'one_to_one': 'equipo',
        'cliente': 'deal',
        'candidato': 'entrevista'
      };
      
      try {
        // Si es invitado, obtener tipo desde la invitación
        if (tokenInvitacion) {
          const { data: invitacion } = await supabase
            .from('invitaciones_reunion')
            .select('sala:salas_reunion(tipo, configuracion)')
            .eq('token_unico', tokenInvitacion)
            .single();
          
          if (invitacion?.sala) {
            const salaData = invitacion.sala as any;
            const config = salaData.configuracion;
            
            // Usar tipo_reunion de configuración si existe (nuevo sistema unificado)
            if (config?.tipo_reunion) {
              setTipoReunion(tipoMapUnificado[config.tipo_reunion as TipoReunionUnificado] || 'equipo');
            } else {
              setTipoReunion(tipoMapBD[salaData.tipo] || 'equipo');
            }
            
            if (config?.reunion_id) {
              setReunionId(config.reunion_id);
            }
            // Obtener info del invitado externo si existe
            if (config?.invitados_externos?.[0]) {
              setInvitadoExterno(config.invitados_externos[0]);
            }
          }
        } 
        // Si es usuario autenticado con salaId
        else if (salaId) {
          const { data: sala } = await supabase
            .from('salas_reunion')
            .select('tipo, configuracion')
            .eq('id', salaId)
            .single();
          
          if (sala) {
            const config = sala.configuracion as any;
            
            // Usar tipo_reunion de configuración si existe (nuevo sistema unificado)
            if (config?.tipo_reunion) {
              setTipoReunion(tipoMapUnificado[config.tipo_reunion as TipoReunionUnificado] || 'equipo');
            } else {
              setTipoReunion(tipoMapBD[sala.tipo] || 'equipo');
            }
            
            if (config?.reunion_id) {
              setReunionId(config.reunion_id);
            }
            // Obtener info del invitado externo si existe
            if (config?.invitados_externos?.[0]) {
              setInvitadoExterno(config.invitados_externos[0]);
            }
          }
        }
      } catch (err) {
        console.warn('No se pudo obtener info de la sala:', err);
      } finally {
        setSalaInfoFetched(true);
      }
    };
    
    fetchSalaInfo();
  }, [salaId, tokenInvitacion, propTipoReunion, tokenData, salaInfoFetched]);

  // La grabación ahora la maneja RecordingManager dentro de MeetingRoomContent

  // Manejar eventos de la sala
  const handleRoomConnected = useCallback(() => {
    console.log('Conectado a la sala');

    // Actualizar estado en Supabase
    if (!tokenInvitacion && currentUser) {
      supabase
        .from('participantes_sala')
        .update({ estado_participante: 'en_sala' })
        .eq('sala_id', salaId)
        .eq('usuario_id', currentUser.id);
    }
  }, [salaId, currentUser, tokenInvitacion]);

  const handleRoomDisconnected = useCallback(() => {
    console.log('Desconectado de la sala');
    
    // Actualizar estado en Supabase
    if (!tokenInvitacion && currentUser) {
      supabase
        .from('participantes_sala')
        .update({ 
          estado_participante: 'desconectado',
          salido_en: new Date().toISOString()
        })
        .eq('sala_id', salaId)
        .eq('usuario_id', currentUser.id);
    }

    onLeave?.();
  }, [salaId, currentUser, tokenInvitacion, onLeave]);

  // Loading state
  if (loading) {
    return (
      <div className={`h-full w-full flex items-center justify-center ${s.bg}`}>
        <div className="text-center">
          <div className={`w-12 h-12 border-4 ${theme === 'arcade' ? 'border-[#00ff41]' : 'border-indigo-500'} border-t-transparent rounded-full animate-spin mx-auto mb-4`} />
          <p className={`${s.text} opacity-60`}>Conectando a la sala...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !tokenData) {
    return (
      <div className={`h-full w-full flex items-center justify-center ${s.bg}`}>
        <div className={`${s.card} border rounded-2xl p-8 max-w-md text-center`}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className={`text-lg font-bold ${s.text} mb-2`}>Error de conexión</h3>
          <p className="text-sm opacity-60 mb-6">{error || 'No se pudo obtener acceso a la sala'}</p>
          <button
            onClick={fetchToken}
            className={`px-6 py-2.5 ${s.accent} rounded-xl text-sm font-bold transition-all`}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full ${s.bg}`}>
      <LiveKitRoom
        serverUrl={tokenData.url}
        token={tokenData.token}
        connect={true}
        audio={true}
        video={true}
        onConnected={handleRoomConnected}
        onDisconnected={handleRoomDisconnected}
        onError={(err) => {
          console.error('LiveKit error:', err);
          setError(err.message);
        }}
        data-lk-theme="default"
        style={{ height: '100%' }}
      >
        <MeetingRoomContent 
          theme={theme}
          isHost={tokenData.permisos.roomAdmin}
          isExternalGuest={!!tokenInvitacion}
          onLeave={onLeave}
          tipoReunion={tipoReunion}
          salaId={salaId}
          reunionId={reunionId}
          showChat={showChat}
          onToggleChat={() => setShowChat(!showChat)}
          espacioId={activeWorkspace?.id || ''}
          userId={currentUser?.id || ''}
          userName={currentUser?.name || nombreInvitado || 'Participante'}
          cargoUsuario={cargoUsuario}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};

// Componente interno con layout personalizado y MeetingControlBar
interface MeetingRoomContentProps {
  theme: string;
  isHost: boolean;
  isExternalGuest?: boolean;
  onLeave?: () => void;
  tipoReunion: TipoReunion;
  salaId: string;
  reunionId?: string;
  showChat: boolean;
  onToggleChat: () => void;
  espacioId: string;
  userId: string;
  userName: string;
  cargoUsuario: CargoLaboral;
}

const MeetingRoomContent: React.FC<MeetingRoomContentProps> = ({ 
  theme, 
  isHost, 
  isExternalGuest = false,
  onLeave,
  tipoReunion,
  salaId,
  reunionId,
  showChat,
  onToggleChat,
  espacioId,
  userId,
  userName,
  cargoUsuario,
}) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [remoteRecording, setRemoteRecording] = useState<{isRecording: boolean; by: string} | null>(null);
  const [reactions, setReactions] = useState<{id: string; emoji: string; by: string}[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');

  // Estados de grabación internos (manejados por RecordingManager)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingTrigger, setRecordingTrigger] = useState(false);

  // Extraer MediaStream local de LiveKit para RecordingManager
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  useEffect(() => {
    if (!localParticipant) return;
    
    const buildStream = () => {
      const tracks: MediaStreamTrack[] = [];
      
      // Obtener track de cámara
      const cameraPublication = localParticipant.getTrackPublication(Track.Source.Camera);
      if (cameraPublication?.track?.mediaStreamTrack) {
        tracks.push(cameraPublication.track.mediaStreamTrack);
      }
      
      // Obtener track de micrófono
      const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
      if (micPublication?.track?.mediaStreamTrack) {
        tracks.push(micPublication.track.mediaStreamTrack);
      }
      
      if (tracks.length > 0) {
        setLocalStream(new MediaStream(tracks));
      }
    };
    
    buildStream();
    
    // Reconstruir cuando cambian los tracks
    const handleTrackChange = () => setTimeout(buildStream, 500);
    room?.on(RoomEvent.LocalTrackPublished, handleTrackChange);
    room?.on(RoomEvent.LocalTrackUnpublished, handleTrackChange);
    
    return () => {
      room?.off(RoomEvent.LocalTrackPublished, handleTrackChange);
      room?.off(RoomEvent.LocalTrackUnpublished, handleTrackChange);
    };
  }, [localParticipant, room]);

  // Toggle grabación via RecordingManager
  const handleToggleRecording = useCallback(() => {
    setRecordingTrigger(true);
  }, []);

  // Obtener tracks de video de todos los participantes
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Separar tracks de video y screen share
  const videoTracks = tracks.filter(track => 
    track.participant && 
    track.source === Track.Source.Camera
  );
  
  const screenShareTrack = tracks.find(track => 
    track.source === Track.Source.ScreenShare && 
    track.publication?.track
  );

  // Filtrar tracks válidos para evitar pantallas negras
  const validTracks = tracks.filter(track => 
    track.participant && 
    (track.publication?.track || track.source === Track.Source.Camera)
  );

  // Cambiar a modo sidebar cuando hay screen share
  useEffect(() => {
    if (screenShareTrack && viewMode === 'gallery') {
      setViewMode('sidebar');
    } else if (!screenShareTrack && viewMode === 'sidebar') {
      setViewMode('gallery');
    }
  }, [screenShareTrack, viewMode]);

  // Obtener hablante activo
  const activeSpeaker = room?.activeSpeakers?.[0]?.identity;

  // Broadcast estado de grabación a todos los participantes
  useEffect(() => {
    if (!room) return;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({
      type: 'recording_status',
      isRecording,
      by: room.localParticipant?.name || 'Anfitrión'
    }));
    
    room.localParticipant?.publishData(data, { reliable: true });
  }, [isRecording, room]);

  // Escuchar mensajes DataChannel (grabación y reacciones)
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      try {
        const decoder = new TextDecoder();
        const message = JSON.parse(decoder.decode(payload));
        
        if (message.type === 'recording_status') {
          if (message.isRecording) {
            setRemoteRecording({ isRecording: true, by: message.by });
          } else {
            setRemoteRecording(null);
          }
        }
        
        // Manejar reacciones
        if (message.type === 'reaction') {
          const reactionId = `${Date.now()}-${Math.random()}`;
          const participantName = participant?.name || participant?.identity || 'Participante';
          setReactions(prev => [...prev, { id: reactionId, emoji: message.emoji, by: participantName }]);
          
          // Auto-remover después de 3 segundos
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== reactionId));
          }, 3000);
        }
      } catch (e) {
        // Ignorar mensajes no JSON
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  return (
    <div className="relative h-full w-full bg-zinc-950 overflow-hidden">
      {/* Estilos globales para LiveKit */}
      <style>{`
        .lk-grid-layout {
          height: 100% !important;
          padding: 8px !important;
          gap: 8px !important;
          background: transparent !important;
        }
        .lk-participant-tile {
          border-radius: 12px !important;
          overflow: hidden !important;
          background: #18181b !important;
        }
        .lk-participant-placeholder {
          background: linear-gradient(135deg, #27272a 0%, #18181b 100%) !important;
        }
        .lk-participant-name {
          background: rgba(0,0,0,0.6) !important;
          backdrop-filter: blur(8px) !important;
          padding: 4px 10px !important;
          border-radius: 6px !important;
          font-size: 12px !important;
        }
        /* Chat estilos */
        .lk-chat-custom .lk-chat {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          background: transparent !important;
        }
        .lk-chat-custom .lk-message-list,
        .lk-chat-custom .lk-chat-messages {
          flex: 1 !important;
          overflow-y: auto !important;
          padding: 12px !important;
        }
        .lk-chat-custom .lk-message,
        .lk-chat-custom .lk-chat-entry {
          margin-bottom: 12px !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .lk-chat-custom .lk-message-sender,
        .lk-chat-custom .lk-chat-entry__name,
        .lk-chat-custom .lk-participant-name {
          font-weight: 600 !important;
          color: #a5b4fc !important;
          font-size: 11px !important;
          margin-bottom: 4px !important;
          display: block !important;
        }
        .lk-chat-custom .lk-message-body,
        .lk-chat-custom .lk-chat-entry__message,
        .lk-chat-custom .lk-message-text {
          background: rgba(255,255,255,0.08) !important;
          padding: 10px 14px !important;
          border-radius: 12px !important;
          color: white !important;
          font-size: 14px !important;
          word-break: break-word !important;
          line-height: 1.4 !important;
        }
        .lk-chat-custom .lk-chat-form,
        .lk-chat-custom .lk-message-form {
          padding: 12px !important;
          border-top: 1px solid rgba(255,255,255,0.1) !important;
          background: transparent !important;
        }
        .lk-chat-custom .lk-chat-form input,
        .lk-chat-custom .lk-message-form input,
        .lk-chat-custom .lk-form-control {
          width: 100% !important;
          background: rgba(255,255,255,0.08) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 10px !important;
          padding: 12px 14px !important;
          color: white !important;
          font-size: 14px !important;
        }
        .lk-chat-custom input::placeholder {
          color: rgba(255,255,255,0.4) !important;
        }
        .lk-chat-custom input:focus {
          outline: none !important;
          border-color: rgba(99, 102, 241, 0.5) !important;
        }
        .lk-chat-custom .lk-button,
        .lk-chat-custom .lk-chat-form button {
          display: none !important;
        }
      `}</style>

      {/* Selector de vista */}
      <div className="absolute top-4 left-4 z-[100]">
        <ViewModeSelector
          currentMode={viewMode}
          onChange={setViewMode}
          hasScreenShare={!!screenShareTrack}
          participantCount={videoTracks.length}
        />
      </div>

      {/* Grid de participantes con nuevo layout */}
      <div className={`h-full w-full ${showChat ? 'pr-80' : ''} transition-all duration-300 pb-20`}>
        {screenShareTrack ? (
          // Layout con screen share
          <div className="h-full w-full flex flex-col lg:flex-row gap-2 p-2">
            {/* Pantalla compartida principal */}
            <div className={`${viewMode === 'sidebar' ? 'lg:flex-1' : 'flex-1'} min-h-0`}>
              <ScreenShareViewer
                isActive={true}
                sharerName={screenShareTrack.participant?.name || screenShareTrack.participant?.identity}
              >
                <video
                  ref={(el) => {
                    if (el && screenShareTrack.publication?.track) {
                      screenShareTrack.publication.track.attach(el);
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              </ScreenShareViewer>
            </div>
            
            {/* Strip de participantes */}
            <div className={`${viewMode === 'sidebar' ? 'lg:w-56' : 'h-28'} flex ${viewMode === 'sidebar' ? 'lg:flex-col' : 'flex-row'} gap-2 overflow-auto`}>
              {videoTracks.map((track, index) => (
                <div
                  key={track.participant?.identity || index}
                  className={`${viewMode === 'sidebar' ? 'aspect-video w-full' : 'aspect-video h-full'} rounded-lg overflow-hidden bg-zinc-900 shrink-0`}
                >
                  <CustomParticipantTile trackRef={track} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Layout normal (gallery o speaker)
          <div className={`h-full w-full p-2 ${
            viewMode === 'speaker' && videoTracks.length > 1
              ? 'flex flex-col gap-2'
              : `grid gap-2 auto-rows-fr ${
                  videoTracks.length <= 1 ? 'grid-cols-1' :
                  videoTracks.length <= 2 ? 'grid-cols-2' :
                  videoTracks.length <= 4 ? 'grid-cols-2' :
                  videoTracks.length <= 6 ? 'grid-cols-3' :
                  'grid-cols-3 lg:grid-cols-4'
                }`
          }`}>
            {viewMode === 'speaker' && videoTracks.length > 1 ? (
              <>
                {/* Speaker principal */}
                <div className="flex-1 min-h-0 rounded-xl overflow-hidden bg-zinc-900">
                  <CustomParticipantTile 
                    trackRef={videoTracks.find(t => t.participant?.identity === activeSpeaker) || videoTracks[0]} 
                  />
                </div>
                {/* Otros participantes */}
                <div className="h-24 lg:h-28 flex gap-2 overflow-x-auto justify-center">
                  {videoTracks
                    .filter(t => t.participant?.identity !== activeSpeaker)
                    .map((track, index) => (
                      <div
                        key={track.participant?.identity || index}
                        className="aspect-video h-full rounded-lg overflow-hidden bg-zinc-900 shrink-0"
                      >
                        <CustomParticipantTile trackRef={track} />
                      </div>
                    ))}
                </div>
              </>
            ) : (
              // Gallery view
              videoTracks.map((track, index) => (
                <div
                  key={track.participant?.identity || index}
                  className="rounded-xl overflow-hidden bg-zinc-900 min-h-0"
                >
                  <CustomParticipantTile trackRef={track} />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Panel de Chat - Estilos mejorados */}
      {showChat && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-zinc-900/98 backdrop-blur-xl border-l border-white/10 flex flex-col z-[100]">
          <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <h3 className="text-white font-bold text-sm">Chat de la reunión</h3>
            <button 
              onClick={onToggleChat}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-hidden min-h-0 pb-20">
            <style>{`
              .lk-chat {
                height: 100% !important;
                display: flex !important;
                flex-direction: column !important;
                background: transparent !important;
              }
              .lk-chat-messages, .lk-message-list {
                flex: 1 !important;
                overflow-y: auto !important;
                padding: 16px !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
              }
              .lk-chat-entry, .lk-message {
                display: flex !important;
                flex-direction: column !important;
                gap: 4px !important;
              }
              .lk-chat-entry__name, .lk-message-sender, .lk-participant-name {
                font-weight: 600 !important;
                color: #a5b4fc !important;
                font-size: 12px !important;
              }
              .lk-chat-entry__message, .lk-message-body, .lk-message-text {
                background: rgba(255,255,255,0.08) !important;
                padding: 10px 14px !important;
                border-radius: 12px !important;
                color: white !important;
                font-size: 14px !important;
                line-height: 1.5 !important;
                word-break: break-word !important;
              }
              .lk-chat-form, .lk-message-form {
                padding: 16px !important;
                border-top: 1px solid rgba(255,255,255,0.1) !important;
                background: rgba(24,24,27,0.95) !important;
                position: absolute !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
              }
              .lk-chat-form input, .lk-message-form input, .lk-form-control {
                width: 100% !important;
                background: rgba(255,255,255,0.08) !important;
                border: 1px solid rgba(255,255,255,0.15) !important;
                border-radius: 10px !important;
                padding: 12px 16px !important;
                color: white !important;
                font-size: 14px !important;
              }
              .lk-chat-form input::placeholder, .lk-message-form input::placeholder {
                color: rgba(255,255,255,0.4) !important;
              }
              .lk-chat-form input:focus, .lk-message-form input:focus {
                outline: none !important;
                border-color: #6366f1 !important;
              }
              .lk-chat-form button, .lk-button {
                display: none !important;
              }
            `}</style>
            <Chat style={{ height: '100%' }} />
          </div>
        </div>
      )}

      {/* Reacciones flotantes */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[300]">
        {reactions.map((reaction, index) => (
          <div
            key={reaction.id}
            className="absolute animate-bounce text-6xl"
            style={{
              left: `${(index % 3 - 1) * 80}px`,
              animation: 'floatUp 3s ease-out forwards',
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          50% { opacity: 1; transform: translateY(-50px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-120px) scale(0.8); }
        }
      `}</style>

      {/* Barra de controles - indicador de grabación integrado inline */}
      <MeetingControlBar
        onLeave={onLeave || (() => {})}
        onToggleChat={onToggleChat}
        showChat={showChat}
        tipoReunion={tipoReunion}
        salaId={salaId}
        reunionId={reunionId}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        onStartRecording={handleToggleRecording}
        onStopRecording={handleToggleRecording}
        showRecordingButton={isHost || !isExternalGuest}
        remoteRecordingBy={!isRecording && remoteRecording?.isRecording ? remoteRecording.by : null}
      />

      {/* RecordingManager con análisis conductual - headless mode (UI via MeetingControlBar) */}
      {(isHost || !isExternalGuest) && (
        <RecordingManager
          espacioId={espacioId}
          userId={userId}
          userName={userName}
          cargoUsuario={cargoUsuario}
          reunionTitulo={`Videollamada ${tipoReunion} - ${new Date().toLocaleDateString('es-ES')}`}
          stream={localStream}
          usuariosEnLlamada={
            room?.remoteParticipants 
              ? Array.from(room.remoteParticipants.values()).map(p => ({
                  id: p.identity,
                  nombre: p.name || p.identity,
                }))
              : []
          }
          onRecordingStateChange={(recording) => {
            setIsRecording(recording);
            if (!recording) {
              setRecordingDuration(0);
            }
          }}
          onDurationChange={(duration) => setRecordingDuration(duration)}
          onProcessingComplete={(resultado) => {
            console.log('✅ Análisis conductual completado en videollamada:', resultado?.tipo_grabacion);
          }}
          headlessMode={true}
          externalTrigger={recordingTrigger}
          onExternalTriggerHandled={() => setRecordingTrigger(false)}
        />
      )}
    </div>
  );
};

export default MeetingRoom;
