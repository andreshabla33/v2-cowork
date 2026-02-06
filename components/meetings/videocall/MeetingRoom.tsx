'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useRoomContext,
  Chat,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Room, Track, RoomEvent } from 'livekit-client';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { MeetingControlBar, TipoReunion } from './MeetingControlBar';
import { TipoReunionUnificado, MAPEO_TIPO_GRABACION, InvitadoExterno } from '@/types/meeting-types';
import { CustomParticipantTile } from './CustomParticipantTile';
import { ScreenShareViewer } from './ScreenShareViewer';
import { ViewModeSelector, ViewMode } from './ViewModeSelector';

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
  
  // Estados para tipo de reunión y grabación
  const [tipoReunion, setTipoReunion] = useState<TipoReunion>(propTipoReunion || 'equipo');
  const [reunionId, setReunionId] = useState<string | undefined>(propReunionId);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  
  // Refs para grabación
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const grabacionIdRef = useRef<string>('');

  const s = themeStyles[theme as keyof typeof themeStyles] || themeStyles.dark;

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

  // Funciones de grabación
  const startRecording = useCallback(async () => {
    try {
      console.log('🎬 Iniciando grabación...', { currentUser: !!currentUser, activeWorkspace: !!activeWorkspace?.id, tokenInvitacion: !!tokenInvitacion });
      
      // Obtener stream de audio/video usando displayMedia + audio del navegador
      let stream: MediaStream;
      
      try {
        // Intentar capturar la pestaña del navegador (mejor calidad para grabación de reunión)
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'browser' } as any,
          audio: true,
        });
      } catch (displayErr) {
        console.warn('getDisplayMedia no disponible, usando getUserMedia:', displayErr);
        // Fallback: capturar cámara y micrófono local
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
      }
      
      // Configurar MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm';
      
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000,
      });
      
      recordingChunksRef.current = [];
      grabacionIdRef.current = crypto.randomUUID();
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        // Detener todos los tracks del stream capturado
        stream.getTracks().forEach(t => t.stop());
        await processRecording();
      };
      
      // Si el usuario detiene compartir pantalla desde el navegador, detener grabación
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      });
      
      mediaRecorderRef.current = recorder;
      recordingStartTimeRef.current = Date.now();
      
      // Iniciar grabación PRIMERO (no bloquear por Supabase)
      recorder.start(1000);
      setIsRecording(true);
      
      // Timer de duración
      recordingIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);
      
      console.log('🔴 Grabación de videollamada iniciada');
      
      // Registrar en Supabase (no bloqueante, solo si es usuario autenticado)
      if (currentUser && activeWorkspace?.id) {
        supabase.from('grabaciones').insert({
          id: grabacionIdRef.current,
          espacio_id: activeWorkspace.id,
          creado_por: currentUser.id,
          estado: 'grabando',
          inicio_grabacion: new Date().toISOString(),
          tipo: tipoReunion === 'equipo' ? 'equipo' : tipoReunion === 'deal' ? 'deals' : 'rrhh_entrevista',
          tiene_video: true,
          tiene_audio: true,
          formato: 'webm',
          sala_id: salaId,
        }).then(({ error: insertErr }) => {
          if (insertErr) console.warn('⚠️ No se pudo registrar grabación en DB:', insertErr.message);
        });
      }
      
    } catch (err: any) {
      console.error('Error iniciando grabación:', err);
      // No mostrar alert si el usuario simplemente canceló el diálogo de compartir pantalla
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        alert('Error al iniciar grabación: ' + err.message);
      }
    }
  }, [currentUser, activeWorkspace?.id, tipoReunion, salaId, tokenInvitacion]);

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Limpiar timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);
      
      console.log('⏹️ Grabación de videollamada detenida');
    }
  }, []);

  const processRecording = useCallback(async () => {
    try {
      const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
      const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      
      // Siempre descargar localmente el archivo
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reunion_${tipoReunion}_${new Date().toISOString().slice(0,10)}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('💾 Grabación descargada localmente:', a.download);
      
      // Si es usuario autenticado, registrar en Supabase
      if (currentUser && activeWorkspace?.id) {
        await supabase.from('grabaciones').update({
          estado: 'completado',
          duracion_segundos: duration,
          fin_grabacion: new Date().toISOString(),
          archivo_nombre: `Videollamada ${tipoReunion} - ${new Date().toLocaleDateString('es-ES')}`,
        }).eq('id', grabacionIdRef.current);
        
        // Notificar al usuario
        await supabase.from('notificaciones').insert({
          usuario_id: currentUser.id,
          espacio_id: activeWorkspace.id,
          tipo: 'grabacion_lista',
          titulo: '📹 Grabación de videollamada lista',
          mensaje: `La grabación de tu ${tipoReunion === 'deal' ? 'reunión con cliente' : tipoReunion === 'entrevista' ? 'entrevista' : 'reunión de equipo'} está disponible`,
          entidad_tipo: 'grabacion',
          entidad_id: grabacionIdRef.current,
        });
      }
      
      console.log('✅ Grabación procesada y guardada');
      
    } catch (err: any) {
      console.error('Error procesando grabación:', err);
      
      // Marcar grabación como error (solo si usuario autenticado)
      if (currentUser && activeWorkspace?.id) {
        await supabase.from('grabaciones').update({
          estado: 'error',
          error_mensaje: err.message || 'Error en procesamiento',
        }).eq('id', grabacionIdRef.current);
      }
    }
  }, [currentUser, activeWorkspace?.id, tipoReunion]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
    };
  }, []);

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
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          showChat={showChat}
          onToggleChat={() => setShowChat(!showChat)}
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
  isRecording: boolean;
  recordingDuration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  showChat: boolean;
  onToggleChat: () => void;
}

const MeetingRoomContent: React.FC<MeetingRoomContentProps> = ({ 
  theme, 
  isHost, 
  isExternalGuest = false,
  onLeave,
  tipoReunion,
  salaId,
  reunionId,
  isRecording,
  recordingDuration,
  onStartRecording,
  onStopRecording,
  showChat,
  onToggleChat,
}) => {
  const room = useRoomContext();
  const [remoteRecording, setRemoteRecording] = useState<{isRecording: boolean; by: string} | null>(null);
  const [reactions, setReactions] = useState<{id: string; emoji: string; by: string}[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');

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

  // Determinar si mostrar banner de grabación (local o remoto)
  const showRecordingBanner = isRecording || remoteRecording?.isRecording;
  const recordingBy = isRecording ? 'Tú' : remoteRecording?.by;

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

      {/* Banner de grabación activa - visible para TODOS */}
      {showRecordingBanner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[150]">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-600/90 backdrop-blur-sm rounded-full shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="text-white text-sm font-medium">
              {isRecording ? 'Grabando reunión' : `${recordingBy} está grabando`}
            </span>
          </div>
        </div>
      )}

      {/* Barra de controles */}
      <MeetingControlBar
        onLeave={onLeave || (() => {})}
        onToggleChat={onToggleChat}
        showChat={showChat}
        tipoReunion={tipoReunion}
        salaId={salaId}
        reunionId={reunionId}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        showRecordingButton={isHost || isExternalGuest}
      />
    </div>
  );
};

export default MeetingRoom;
