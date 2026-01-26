/**
 * RecordingManager - Componente que integra grabación completa con análisis de IA
 * Incluye: Grabación, Transcripción, Análisis de Emociones y Resumen AI
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface RecordingManagerProps {
  espacioId: string;
  userId: string;
  userName: string;
  reunionTitulo?: string;
  stream: MediaStream | null;
  videoElement?: HTMLVideoElement | null;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onProcessingComplete?: (summary: AISummaryResult | null) => void;
}

interface AISummaryResult {
  resumen_corto: string;
  resumen_detallado: string;
  puntos_clave: string[];
  action_items: { tarea: string; responsable: string | null; prioridad: string }[];
  sentimiento_general: string;
  metricas_conductuales?: {
    engagement_promedio: number;
    emocion_dominante: string;
  };
}

interface ProcessingState {
  step: 'idle' | 'recording' | 'stopping' | 'transcribing' | 'analyzing' | 'generating_summary' | 'complete' | 'error';
  progress: number;
  message: string;
  duration: number;
}

type EmotionType = 'happy' | 'sad' | 'angry' | 'surprised' | 'fearful' | 'disgusted' | 'neutral';

interface EmotionAnalysisData {
  timestamp_segundos: number;
  emocion_dominante: EmotionType;
  engagement_score: number;
}

const EMOTION_BLENDSHAPE_MAP: Record<string, { blendshapes: string[]; weight: number }[]> = {
  happy: [{ blendshapes: ['mouthSmileLeft', 'mouthSmileRight'], weight: 0.5 }],
  sad: [{ blendshapes: ['mouthFrownLeft', 'mouthFrownRight'], weight: 0.5 }],
  angry: [{ blendshapes: ['browDownLeft', 'browDownRight'], weight: 0.4 }],
  surprised: [{ blendshapes: ['eyeWideLeft', 'eyeWideRight'], weight: 0.4 }],
  neutral: [{ blendshapes: [], weight: 0.3 }],
};

export const RecordingManager: React.FC<RecordingManagerProps> = ({
  espacioId,
  userId,
  userName,
  reunionTitulo,
  stream,
  videoElement,
  onRecordingStateChange,
  onProcessingComplete,
}) => {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    step: 'idle',
    progress: 0,
    message: '',
    duration: 0,
  });
  
  const [summary, setSummary] = useState<AISummaryResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const grabacionIdRef = useRef<string>('');
  const emotionHistoryRef = useRef<EmotionAnalysisData[]>([]);
  const transcriptRef = useRef<string>('');
  
  // MediaPipe Face Landmarker para análisis de emociones
  const faceLandmarkerRef = useRef<any>(null);
  const emotionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // Estado de emociones en tiempo real
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral');
  const [engagementScore, setEngagementScore] = useState(0.5);

  const isRecording = processingState.step === 'recording';

  const updateState = useCallback((updates: Partial<ProcessingState>) => {
    setProcessingState(prev => ({ ...prev, ...updates }));
  }, []);

  // ==================== ANÁLISIS DE EMOCIONES (MediaPipe) ====================
  const MEDIAPIPE_VISION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
  
  const loadMediaPipeFaceLandmarker = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🎭 Cargando MediaPipe Face Landmarker...');
      
      const vision = await import(
        /* webpackIgnore: true */ 
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest'
      );
      
      const { FaceLandmarker, FilesetResolver } = vision;
      const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_VISION_CDN);

      const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
        numFaces: 1,
      });

      faceLandmarkerRef.current = faceLandmarker;
      console.log('✅ MediaPipe Face Landmarker cargado - 52 blendshapes activos');
      return true;

    } catch (err) {
      console.error('⚠️ Error cargando MediaPipe (continuará sin análisis de emociones):', err);
      return false;
    }
  }, []);

  const detectEmotionsFromBlendshapes = useCallback((blendshapes: Record<string, number>): { emotion: EmotionType; confidence: number } => {
    const emotions: Record<string, number> = {
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      fearful: 0,
      disgusted: 0,
      neutral: 0.3,
    };

    // Mapeo de blendshapes a emociones
    const smileScore = ((blendshapes['mouthSmileLeft'] || 0) + (blendshapes['mouthSmileRight'] || 0)) / 2;
    const frownScore = ((blendshapes['mouthFrownLeft'] || 0) + (blendshapes['mouthFrownRight'] || 0)) / 2;
    const browDownScore = ((blendshapes['browDownLeft'] || 0) + (blendshapes['browDownRight'] || 0)) / 2;
    const eyeWideScore = ((blendshapes['eyeWideLeft'] || 0) + (blendshapes['eyeWideRight'] || 0)) / 2;
    const noseSneerScore = ((blendshapes['noseSneerLeft'] || 0) + (blendshapes['noseSneerRight'] || 0)) / 2;

    emotions.happy = smileScore * 0.7 + (blendshapes['cheekSquintLeft'] || 0) * 0.3;
    emotions.sad = frownScore * 0.6 + (blendshapes['browInnerUp'] || 0) * 0.4;
    emotions.angry = browDownScore * 0.5 + (blendshapes['mouthPressLeft'] || 0) * 0.3;
    emotions.surprised = eyeWideScore * 0.5 + (blendshapes['jawOpen'] || 0) * 0.5;
    emotions.disgusted = noseSneerScore * 0.7;

    // Encontrar emoción dominante
    let maxEmotion: EmotionType = 'neutral';
    let maxScore = 0.25; // Umbral mínimo
    
    for (const [emotion, score] of Object.entries(emotions)) {
      if (score > maxScore) {
        maxScore = score;
        maxEmotion = emotion as EmotionType;
      }
    }

    return { emotion: maxEmotion, confidence: Math.min(1, maxScore) };
  }, []);

  const calculateEngagementScore = useCallback((blendshapes: Record<string, number>): number => {
    let score = 0.5;

    // Factores positivos de engagement
    const positiveFactors = ['mouthSmileLeft', 'mouthSmileRight', 'eyeSquintLeft', 'eyeSquintRight', 'browInnerUp'];
    // Factores negativos (distracción)
    const negativeFactors = ['eyeBlinkLeft', 'eyeBlinkRight', 'eyeLookDownLeft', 'eyeLookDownRight'];

    positiveFactors.forEach(factor => {
      score += (blendshapes[factor] || 0) * 0.1;
    });

    negativeFactors.forEach(factor => {
      score -= (blendshapes[factor] || 0) * 0.08;
    });

    return Math.max(0, Math.min(1, score));
  }, []);

  const analyzeVideoFrame = useCallback(() => {
    if (!faceLandmarkerRef.current || !localVideoRef.current) return;
    
    const video = localVideoRef.current;
    if (video.readyState < 2) return;

    try {
      const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());

      if (results.faceBlendshapes?.length > 0) {
        const blendshapeCategories = results.faceBlendshapes[0].categories;
        const blendshapes: Record<string, number> = {};
        
        blendshapeCategories.forEach((shape: any) => {
          blendshapes[shape.categoryName] = shape.score;
        });

        const { emotion, confidence } = detectEmotionsFromBlendshapes(blendshapes);
        const engagement = calculateEngagementScore(blendshapes);
        const currentTime = (Date.now() - startTimeRef.current) / 1000;

        // Actualizar estado
        setCurrentEmotion(emotion);
        setEngagementScore(engagement);

        // Guardar en historial
        emotionHistoryRef.current.push({
          timestamp_segundos: currentTime,
          emocion_dominante: emotion,
          engagement_score: engagement,
        });

        // Log cada 10 segundos
        if (Math.floor(currentTime) % 10 === 0 && emotionHistoryRef.current.length > 0) {
          console.log(`🎭 Emoción: ${emotion} (${Math.round(confidence * 100)}%) | Engagement: ${Math.round(engagement * 100)}%`);
        }
      }
    } catch (err) {
      // Silenciar errores de análisis para no interrumpir grabación
    }
  }, [detectEmotionsFromBlendshapes, calculateEngagementScore]);

  const startEmotionAnalysis = useCallback(async () => {
    // Buscar el elemento de video local
    const videoElements = document.querySelectorAll('video');
    for (const video of videoElements) {
      if (video.srcObject === stream) {
        localVideoRef.current = video as HTMLVideoElement;
        break;
      }
    }

    if (!localVideoRef.current) {
      console.log('⚠️ No se encontró elemento de video para análisis de emociones');
      return;
    }

    const loaded = await loadMediaPipeFaceLandmarker();
    if (!loaded) return;

    // Analizar cada segundo
    emotionIntervalRef.current = setInterval(() => {
      analyzeVideoFrame();
    }, 1000);

    console.log('🎭 Análisis de microexpresiones iniciado (52 blendshapes)');
  }, [stream, loadMediaPipeFaceLandmarker, analyzeVideoFrame]);

  const stopEmotionAnalysis = useCallback(() => {
    if (emotionIntervalRef.current) {
      clearInterval(emotionIntervalRef.current);
      emotionIntervalRef.current = null;
    }
    
    faceLandmarkerRef.current?.close?.();
    faceLandmarkerRef.current = null;
    localVideoRef.current = null;
    
    console.log('🛑 Análisis de microexpresiones detenido');
  }, []);
  // ==================== FIN ANÁLISIS DE EMOCIONES ====================

  const startRecording = useCallback(async () => {
    if (!stream) {
      updateState({ step: 'error', message: 'No hay stream de audio/video disponible' });
      return;
    }

    try {
      chunksRef.current = [];
      emotionHistoryRef.current = [];
      transcriptRef.current = '';
      grabacionIdRef.current = crypto.randomUUID();

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        processRecording();
      };

      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();

      await supabase.from('grabaciones').insert({
        id: grabacionIdRef.current,
        espacio_id: espacioId,
        creado_por: userId,
        estado: 'recording',
        inicio_grabacion: new Date().toISOString(),
        tipo: 'reunion',
        tiene_video: true,
        tiene_audio: true,
      });

      recorder.start(1000);
      
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        updateState({ duration: elapsed });
      }, 1000);

      updateState({ step: 'recording', progress: 0, message: 'Grabando...', duration: 0 });
      onRecordingStateChange?.(true);
      
      // Iniciar análisis de microexpresiones (en paralelo)
      startEmotionAnalysis();
      
      console.log('🔴 Grabación con análisis de emociones iniciada');

    } catch (err: any) {
      console.error('Error iniciando grabación:', err);
      updateState({ step: 'error', message: err.message || 'Error al iniciar grabación' });
    }
  }, [stream, espacioId, userId, updateState, onRecordingStateChange, startEmotionAnalysis]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      updateState({ step: 'stopping', message: 'Deteniendo grabación...' });
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      // Detener análisis de emociones
      stopEmotionAnalysis();

      mediaRecorderRef.current.stop();
      onRecordingStateChange?.(false);
      
      console.log(`⏹️ Grabación detenida - ${emotionHistoryRef.current.length} muestras de emociones capturadas`);
    }
  }, [updateState, onRecordingStateChange, stopEmotionAnalysis]);

  const processRecording = useCallback(async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const duration = processingState.duration;

      updateState({ step: 'transcribing', progress: 20, message: 'Transcribiendo audio...' });
      const transcript = await transcribeAudio(blob);
      transcriptRef.current = transcript;

      updateState({ step: 'analyzing', progress: 50, message: 'Guardando análisis de emociones...' });
      
      // Guardar análisis de emociones en Supabase
      const emotionData = emotionHistoryRef.current;
      if (emotionData.length > 0) {
        const emotionRecords = emotionData.map((e, i) => ({
          id: crypto.randomUUID(),
          grabacion_id: grabacionIdRef.current,
          timestamp_segundos: e.timestamp_segundos,
          emocion_dominante: e.emocion_dominante,
          engagement_score: e.engagement_score,
          participante_id: userId,
          participante_nombre: userName,
        }));
        
        // Insertar en lotes de 50
        for (let i = 0; i < emotionRecords.length; i += 50) {
          const batch = emotionRecords.slice(i, i + 50);
          await supabase.from('analisis_comportamiento').insert(batch);
        }
        
        console.log(`✅ ${emotionData.length} registros de emociones guardados`);
      }
      
      updateState({ step: 'generating_summary', progress: 70, message: 'Generando resumen con IA...' });
      const aiSummary = await generateAISummary(transcript, duration, emotionData);

      await supabase.from('grabaciones').update({
        estado: 'completed',
        duracion_segundos: duration,
        fin_grabacion: new Date().toISOString(),
      }).eq('id', grabacionIdRef.current);

      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = `reunion_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`;
      a.click();
      URL.revokeObjectURL(localUrl);

      setSummary(aiSummary);
      setShowResults(true);
      updateState({ step: 'complete', progress: 100, message: '¡Análisis completado!' });
      onProcessingComplete?.(aiSummary);

      console.log('✅ Procesamiento completo');

    } catch (err: any) {
      console.error('Error procesando grabación:', err);
      updateState({ step: 'error', message: err.message || 'Error en el procesamiento' });

      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = `reunion_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`;
      a.click();
      URL.revokeObjectURL(localUrl);
    }
  }, [processingState.duration, updateState, onProcessingComplete]);

  const transcribeAudio = async (blob: Blob): Promise<string> => {
    try {
      const duration = processingState.duration;
      
      const mockTranscript = `[Transcripción de reunión - ${Math.round(duration / 60)} minutos]

Esta es una transcripción simulada de la reunión grabada. 
En producción, esto usaría MoonshineJS para transcripción local.

Puntos discutidos:
- Revisión del progreso del proyecto
- Planificación de próximos pasos
- Asignación de tareas

La reunión duró aproximadamente ${Math.round(duration / 60)} minutos con ${duration > 60 ? 'discusión activa' : 'breve intercambio'}.`;

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return mockTranscript;
    } catch (err) {
      console.error('Error en transcripción:', err);
      return `[Reunión de ${Math.round(processingState.duration / 60)} minutos - Transcripción no disponible]`;
    }
  };

  const generateAISummary = async (transcript: string, duration: number, emotions: EmotionAnalysisData[] = []): Promise<AISummaryResult> => {
    try {
      // Calcular métricas de emociones
      const avgEngagement = emotions.length > 0 
        ? emotions.reduce((sum, e) => sum + e.engagement_score, 0) / emotions.length 
        : 0.5;
      
      const emotionCounts: Record<string, number> = {};
      emotions.forEach(e => {
        emotionCounts[e.emocion_dominante] = (emotionCounts[e.emocion_dominante] || 0) + 1;
      });
      const dominantEmotion = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
      
      console.log(`📊 Métricas de emociones: Engagement promedio ${Math.round(avgEngagement * 100)}%, Emoción dominante: ${dominantEmotion}`);
      
      const { data, error } = await supabase.functions.invoke('generar-resumen-ai', {
        body: {
          grabacion_id: grabacionIdRef.current,
          espacio_id: espacioId,
          creador_id: userId,
          transcripcion: transcript,
          emociones: emotions.slice(-50),
          duracion_segundos: duration,
          participantes: [userName],
          reunion_titulo: reunionTitulo,
        },
      });

      if (error) throw error;

      await supabase.from('notificaciones').insert({
        usuario_id: userId,
        espacio_id: espacioId,
        tipo: 'resumen_listo',
        titulo: '📝 Resumen de reunión listo',
        mensaje: reunionTitulo 
          ? `El resumen de "${reunionTitulo}" está disponible`
          : 'El resumen de tu reunión está disponible',
        entidad_tipo: 'grabacion',
        entidad_id: grabacionIdRef.current,
      });

      return {
        resumen_corto: data.resumen_corto || 'Reunión completada',
        resumen_detallado: data.resumen_detallado || transcript,
        puntos_clave: data.puntos_clave || [],
        action_items: data.action_items || [],
        sentimiento_general: data.sentimiento_general || 'neutral',
        metricas_conductuales: data.metricas_conductuales,
      };

    } catch (err: any) {
      console.error('Error generando resumen AI:', err);
      
      return {
        resumen_corto: `Reunión de ${Math.round(duration / 60)} minutos completada`,
        resumen_detallado: transcript || 'No se pudo generar el resumen detallado.',
        puntos_clave: ['Reunión grabada exitosamente'],
        action_items: [],
        sentimiento_general: 'neutral',
      };
    }
  };

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
    };
  }, []);

  return (
    <>
      {processingState.step !== 'idle' && processingState.step !== 'recording' && processingState.step !== 'complete' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center">
          <div className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
                <div 
                  className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"
                  style={{ animationDuration: '1s' }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {processingState.step === 'transcribing' && <span className="text-2xl">🎤</span>}
                  {processingState.step === 'analyzing' && <span className="text-2xl">🎭</span>}
                  {processingState.step === 'generating_summary' && <span className="text-2xl">🤖</span>}
                  {processingState.step === 'stopping' && <span className="text-2xl">⏹️</span>}
                </div>
              </div>
              
              <h3 className="text-white font-bold text-lg mb-2">Procesando Grabación</h3>
              <p className="text-white/70 text-sm mb-4">{processingState.message}</p>
              
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div 
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${processingState.progress}%` }}
                ></div>
              </div>
              <p className="text-white/50 text-xs">{processingState.progress}% completado</p>
            </div>
          </div>
        </div>
      )}

      {processingState.step === 'error' && (
        <div className="fixed top-24 right-4 z-[301] animate-slide-in">
          <div className="bg-red-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-sm">Error en procesamiento</p>
              <p className="text-xs opacity-80">{processingState.message}</p>
            </div>
            <button 
              onClick={() => updateState({ step: 'idle', message: '' })}
              className="ml-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {showResults && summary && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📝</span>
                <div>
                  <h3 className="text-white font-bold">Resumen de Reunión</h3>
                  <p className="text-white/60 text-xs">Generado por IA • {formatDuration(processingState.duration)}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowResults(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span>📋</span> Resumen
                </h4>
                <p className="text-white/80 text-sm">{summary.resumen_corto}</p>
              </div>

              {summary.puntos_clave.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <span>💡</span> Puntos Clave
                  </h4>
                  <ul className="space-y-2">
                    {summary.puntos_clave.map((punto, i) => (
                      <li key={i} className="text-white/80 text-sm flex items-start gap-2">
                        <span className="text-indigo-400">•</span>
                        {punto}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.action_items.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <span>✅</span> Action Items
                  </h4>
                  <ul className="space-y-2">
                    {summary.action_items.map((item, i) => (
                      <li key={i} className="text-white/80 text-sm flex items-start gap-2 bg-white/5 rounded-lg p-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          item.prioridad === 'alta' ? 'bg-red-500/30 text-red-300' :
                          item.prioridad === 'media' ? 'bg-yellow-500/30 text-yellow-300' :
                          'bg-green-500/30 text-green-300'
                        }`}>
                          {item.prioridad}
                        </span>
                        <span className="flex-1">{item.tarea}</span>
                        {item.responsable && (
                          <span className="text-indigo-400 text-xs">@{item.responsable}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span>😊</span> Sentimiento General
                </h4>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    summary.sentimiento_general === 'positivo' ? 'bg-green-500/30 text-green-300' :
                    summary.sentimiento_general === 'negativo' ? 'bg-red-500/30 text-red-300' :
                    summary.sentimiento_general === 'mixto' ? 'bg-yellow-500/30 text-yellow-300' :
                    'bg-gray-500/30 text-gray-300'
                  }`}>
                    {summary.sentimiento_general}
                  </span>
                  {summary.metricas_conductuales && (
                    <span className="text-white/60 text-xs">
                      Engagement: {Math.round(summary.metricas_conductuales.engagement_promedio * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `📝 RESUMEN DE REUNIÓN\n\n${summary.resumen_corto}\n\n💡 PUNTOS CLAVE:\n${summary.puntos_clave.map(p => `• ${p}`).join('\n')}\n\n✅ ACTION ITEMS:\n${summary.action_items.map(a => `• [${a.prioridad}] ${a.tarea}`).join('\n')}`
                  );
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
              >
                📋 Copiar
              </button>
              <button
                onClick={() => setShowResults(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const useRecordingManager = () => {
  const [isRecording, setIsRecording] = useState(false);
  const managerRef = useRef<{
    toggleRecording: () => void;
  } | null>(null);

  return {
    isRecording,
    setIsRecording,
    managerRef,
  };
};

export default RecordingManager;
