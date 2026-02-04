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
  participante_id: string;
  permisos: {
    canPublish: boolean;
    canSubscribe: boolean;
    roomAdmin: boolean;
  };
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

  // Obtener tipo de reunión de la sala si no viene por props
  useEffect(() => {
    const fetchSalaInfo = async () => {
      if (propTipoReunion || !salaId) return;
      
      try {
        const { data: sala } = await supabase
          .from('salas_reunion')
          .select('tipo, configuracion')
          .eq('id', salaId)
          .single();
        
        if (sala) {
          // Mapear tipo de sala a TipoReunion
          const tipoMap: Record<string, TipoReunion> = {
            'general': 'equipo',
            'deal': 'deal',
            'entrevista': 'entrevista'
          };
          setTipoReunion(tipoMap[sala.tipo] || 'equipo');
          
          // Obtener reunionId de la configuración si existe
          if (sala.configuracion?.reunion_id) {
            setReunionId(sala.configuracion.reunion_id);
          }
        }
      } catch (err) {
        console.warn('No se pudo obtener info de la sala:', err);
      }
    };
    
    fetchSalaInfo();
  }, [salaId, propTipoReunion]);

  // Funciones de grabación
  const startRecording = useCallback(async () => {
    if (!currentUser || !activeWorkspace?.id) return;
    
    try {
      // Obtener stream de video/audio local
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      // Configurar MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
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
        await processRecording();
      };
      
      mediaRecorderRef.current = recorder;
      recordingStartTimeRef.current = Date.now();
      
      // Registrar en Supabase
      await supabase.from('grabaciones').insert({
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
      });
      
      // Iniciar grabación
      recorder.start(1000);
      setIsRecording(true);
      
      // Timer de duración
      recordingIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);
      
      console.log('🔴 Grabación de videollamada iniciada');
      
    } catch (err: any) {
      console.error('Error iniciando grabación:', err);
      alert('Error al iniciar grabación: ' + err.message);
    }
  }, [currentUser, activeWorkspace?.id, tipoReunion, salaId]);

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
    if (!currentUser || !activeWorkspace?.id) return;
    
    try {
      const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
      const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      
      // Actualizar grabación en Supabase
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
      
      console.log('✅ Grabación procesada y guardada');
      
    } catch (err: any) {
      console.error('Error procesando grabación:', err);
      
      // Marcar grabación como error
      await supabase.from('grabaciones').update({
        estado: 'error',
        error_mensaje: err.message || 'Error en procesamiento',
      }).eq('id', grabacionIdRef.current);
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
  // Obtener tracks de video de todos los participantes
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="relative h-full w-full">
      {/* Grid de participantes */}
      <div className={`h-full w-full ${showChat ? 'pr-80' : ''} transition-all duration-300`}>
        <GridLayout tracks={tracks} style={{ height: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      </div>

      {/* Panel de Chat */}
      {showChat && (
        <div className="absolute top-0 right-0 h-full w-80 bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 flex flex-col">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
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
          <div className="flex-1 overflow-hidden">
            <Chat style={{ height: '100%' }} />
          </div>
        </div>
      )}

      {/* Banner de grabación activa */}
      {isRecording && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[150]">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-600/90 backdrop-blur-sm rounded-full shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="text-white text-sm font-medium">Grabando reunión</span>
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
        showRecordingButton={isHost}
      />
    </div>
  );
};

export default MeetingRoom;
