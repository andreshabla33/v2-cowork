/**
 * Hook para análisis de emociones usando MediaPipe Face Landmarker
 * Detecta 52 blendshapes, engagement y micro expresiones en tiempo real
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { EmotionAnalysis, EmotionState, BehaviorInsight, EmotionType } from './types';

interface UseEmotionAnalysisOptions {
  grabacionId: string;
  participanteId?: string;
  participanteNombre?: string;
  onEmotionUpdate?: (analysis: EmotionAnalysis) => void;
  onInsightDetected?: (insight: BehaviorInsight) => void;
  analysisInterval?: number;
}

const MEDIAPIPE_VISION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

const EMOTION_BLENDSHAPE_MAP: Record<string, { blendshapes: string[]; weight: number }[]> = {
  happy: [
    { blendshapes: ['mouthSmileLeft', 'mouthSmileRight'], weight: 0.5 },
    { blendshapes: ['cheekSquintLeft', 'cheekSquintRight'], weight: 0.3 },
  ],
  sad: [
    { blendshapes: ['mouthFrownLeft', 'mouthFrownRight'], weight: 0.5 },
    { blendshapes: ['browInnerUp'], weight: 0.3 },
  ],
  angry: [
    { blendshapes: ['browDownLeft', 'browDownRight'], weight: 0.4 },
    { blendshapes: ['mouthPressLeft', 'mouthPressRight'], weight: 0.3 },
  ],
  surprised: [
    { blendshapes: ['eyeWideLeft', 'eyeWideRight'], weight: 0.4 },
    { blendshapes: ['jawOpen'], weight: 0.4 },
    { blendshapes: ['browOuterUpLeft', 'browOuterUpRight'], weight: 0.2 },
  ],
  fearful: [
    { blendshapes: ['eyeWideLeft', 'eyeWideRight'], weight: 0.3 },
    { blendshapes: ['browInnerUp'], weight: 0.3 },
    { blendshapes: ['mouthStretchLeft', 'mouthStretchRight'], weight: 0.2 },
  ],
  disgusted: [
    { blendshapes: ['noseSneerLeft', 'noseSneerRight'], weight: 0.5 },
    { blendshapes: ['mouthUpperUpLeft', 'mouthUpperUpRight'], weight: 0.3 },
  ],
};

export function useEmotionAnalysis(options: UseEmotionAnalysisOptions) {
  const { 
    grabacionId, 
    participanteId, 
    participanteNombre,
    onEmotionUpdate, 
    onInsightDetected,
    analysisInterval = 1000 
  } = options;

  const [state, setState] = useState<EmotionState>({
    isLoading: false,
    isAnalyzing: false,
    error: null,
    currentEmotion: 'neutral',
    emotionConfidence: 0,
    engagementScore: 0.5,
    lookingAtCamera: true,
    emotionHistory: [],
    insights: [],
  });

  const faceLandmarkerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastEngagementRef = useRef<number>(0.5);

  const loadMediaPipe = useCallback(async (): Promise<boolean> => {
    try {
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
      console.log('✅ MediaPipe Face Landmarker cargado');
      return true;

    } catch (err) {
      console.error('Error cargando MediaPipe:', err);
      return false;
    }
  }, []);

  const detectEmotions = useCallback((blendshapes: Record<string, number>): Record<string, number> => {
    const emotions: Record<string, number> = {
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      fearful: 0,
      disgusted: 0,
      neutral: 0.3,
    };

    Object.entries(EMOTION_BLENDSHAPE_MAP).forEach(([emotion, mappings]) => {
      mappings.forEach(({ blendshapes: bs, weight }) => {
        const avgScore = bs.reduce((sum, name) => sum + (blendshapes[name] || 0), 0) / bs.length;
        emotions[emotion] += avgScore * weight;
      });
    });

    const maxScore = Math.max(...Object.values(emotions));
    if (maxScore > 0) {
      Object.keys(emotions).forEach(emotion => {
        emotions[emotion] = Math.min(1, emotions[emotion] / maxScore);
      });
    }

    return emotions;
  }, []);

  const calculateEngagement = useCallback((blendshapes: Record<string, number>): number => {
    let score = 0.5;

    const positiveFactors = ['mouthSmileLeft', 'mouthSmileRight', 'eyeSquintLeft', 'eyeSquintRight', 'browInnerUp'];
    const negativeFactors = ['eyeBlinkLeft', 'eyeBlinkRight', 'eyeLookDownLeft', 'eyeLookDownRight'];

    positiveFactors.forEach(factor => {
      score += (blendshapes[factor] || 0) * 0.1;
    });

    negativeFactors.forEach(factor => {
      score -= (blendshapes[factor] || 0) * 0.1;
    });

    return Math.max(0, Math.min(1, score));
  }, []);

  const analyzeFrame = useCallback((video: HTMLVideoElement, timestamp: number): EmotionAnalysis | null => {
    if (!faceLandmarkerRef.current || !video.videoWidth) return null;

    try {
      const results = faceLandmarkerRef.current.detectForVideo(video, timestamp);

      if (!results.faceBlendshapes?.length) return null;

      const blendshapeCategories = results.faceBlendshapes[0].categories;
      const blendshapes: Record<string, number> = {};
      
      blendshapeCategories.forEach((shape: any) => {
        blendshapes[shape.categoryName] = shape.score;
      });

      const emotions = detectEmotions(blendshapes);
      let dominantEmotion = { emotion: 'neutral', score: 0 };
      for (const [emotion, score] of Object.entries(emotions)) {
        if (typeof score === 'number' && score > dominantEmotion.score) {
          dominantEmotion = { emotion, score };
        }
      }

      const engagementScore = calculateEngagement(blendshapes);
      const currentTime = (Date.now() - startTimeRef.current) / 1000;

      let lookingAtCamera = true;
      if (results.facialTransformationMatrixes?.length) {
        const matrix = results.facialTransformationMatrixes[0];
        if (matrix?.data) {
          const rotationY = Math.abs(matrix.data[2] || 0);
          const rotationX = Math.abs(matrix.data[6] || 0);
          lookingAtCamera = rotationY < 0.3 && rotationX < 0.3;
        }
      }

      const analysis: EmotionAnalysis = {
        id: crypto.randomUUID(),
        grabacion_id: grabacionId,
        timestamp_segundos: currentTime,
        participante_id: participanteId,
        participante_nombre: participanteNombre,
        emocion_dominante: dominantEmotion.emotion as EmotionType,
        emocion_confianza: dominantEmotion.score,
        emociones_detalle: emotions as Record<EmotionType, number>,
        engagement_score: engagementScore,
        mirando_camara: lookingAtCamera,
        action_units: blendshapes,
      };

      if (Math.abs(engagementScore - lastEngagementRef.current) > 0.3) {
        const insight: BehaviorInsight = {
          minuto: Math.floor(currentTime / 60),
          tipo: engagementScore > lastEngagementRef.current ? 'pico_engagement' : 'baja_atencion',
          descripcion: engagementScore > lastEngagementRef.current 
            ? 'Aumento significativo de atención detectado'
            : 'Disminución de atención detectada',
          score: engagementScore,
        };
        
        setState(prev => ({
          ...prev,
          insights: [...prev.insights, insight],
        }));
        
        onInsightDetected?.(insight);
      }
      
      lastEngagementRef.current = engagementScore;

      return analysis;

    } catch (err) {
      console.error('Error analizando frame:', err);
      return null;
    }
  }, [participanteId, participanteNombre, detectEmotions, calculateEngagement, onInsightDetected]);

  const startAnalysis = useCallback(async (video: HTMLVideoElement) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const loaded = await loadMediaPipe();
      if (!loaded) {
        throw new Error('No se pudo cargar el analizador de emociones');
      }

      videoRef.current = video;
      startTimeRef.current = Date.now();

      analysisIntervalRef.current = setInterval(() => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          const analysis = analyzeFrame(videoRef.current, performance.now());
          
          if (analysis) {
            setState(prev => ({
              ...prev,
              currentEmotion: analysis.emocion_dominante,
              emotionConfidence: analysis.emocion_confianza,
              engagementScore: analysis.engagement_score,
              lookingAtCamera: analysis.mirando_camara,
              emotionHistory: [...prev.emotionHistory.slice(-100), analysis],
            }));

            onEmotionUpdate?.(analysis);
          }
        }
      }, analysisInterval);

      setState(prev => ({ ...prev, isLoading: false, isAnalyzing: true }));
      console.log('🎭 Análisis de emociones iniciado');

    } catch (err: any) {
      console.error('Error iniciando análisis:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Error al iniciar análisis de emociones',
      }));
    }
  }, [loadMediaPipe, analyzeFrame, analysisInterval, onEmotionUpdate]);

  const stopAnalysis = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    
    faceLandmarkerRef.current?.close?.();
    faceLandmarkerRef.current = null;
    videoRef.current = null;
    
    setState(prev => ({ ...prev, isAnalyzing: false }));
    console.log('🛑 Análisis de emociones detenido');
  }, []);

  useEffect(() => {
    return () => {
      stopAnalysis();
    };
  }, [stopAnalysis]);

  return {
    state,
    startAnalysis,
    stopAnalysis,
    isAnalyzing: state.isAnalyzing,
    isLoading: state.isLoading,
    currentEmotion: state.currentEmotion as EmotionType,
    emotionConfidence: state.emotionConfidence as number,
    engagementScore: state.engagementScore,
    lookingAtCamera: state.lookingAtCamera,
    emotionHistory: state.emotionHistory,
    insights: state.insights,
    error: state.error,
  };
}

export default useEmotionAnalysis;
