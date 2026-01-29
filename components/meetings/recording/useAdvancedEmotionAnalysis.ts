/**
 * useAdvancedEmotionAnalysis - Hook avanzado para análisis de emociones
 * Mejoras sobre el original:
 * - Detección de microexpresiones (200ms)
 * - Baseline personalizado
 * - Detección de cambios abruptos
 * - Predicción de comportamiento
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  EmotionType,
  EmotionFrame,
  MicroexpresionData,
  BaselineEmocional,
  PrediccionComportamiento,
  TipoGrabacion,
} from './types/analysis';

interface UseAdvancedEmotionAnalysisOptions {
  tipoGrabacion: TipoGrabacion;
  onFrameUpdate?: (frame: EmotionFrame) => void;
  onMicroexpresion?: (micro: MicroexpresionData) => void;
  onBaselineComplete?: (baseline: BaselineEmocional) => void;
  onPrediccion?: (prediccion: PrediccionComportamiento) => void;
}

interface AdvancedEmotionAnalysisState {
  isAnalyzing: boolean;
  isCalibrating: boolean;
  currentEmotion: EmotionType;
  engagementScore: number;
  stressScore: number;
  confidenceScore: number;
  baselineComplete: boolean;
  framesAnalyzed: number;
  microexpresionesDetectadas: number;
}

const MEDIAPIPE_VISION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const ANALYSIS_INTERVAL_MS = 500; // 2 FPS - reducido para mejor rendimiento de audio
const BASELINE_DURATION_MS = 5000; // 5 segundos de calibración
const MICROEXPRESSION_MAX_DURATION_MS = 500;
const ABRUPT_CHANGE_THRESHOLD = 0.3;

// Mapeo de blendshapes a emociones con pesos refinados
const EMOTION_BLENDSHAPE_WEIGHTS: Record<EmotionType, { shapes: string[]; weights: number[] }> = {
  happy: { 
    shapes: ['mouthSmileLeft', 'mouthSmileRight', 'cheekSquintLeft', 'cheekSquintRight'], 
    weights: [0.3, 0.3, 0.2, 0.2] 
  },
  sad: { 
    shapes: ['mouthFrownLeft', 'mouthFrownRight', 'browInnerUp', 'mouthPucker'], 
    weights: [0.3, 0.3, 0.25, 0.15] 
  },
  angry: { 
    shapes: ['browDownLeft', 'browDownRight', 'mouthPressLeft', 'mouthPressRight', 'jawForward'], 
    weights: [0.25, 0.25, 0.2, 0.2, 0.1] 
  },
  surprised: { 
    shapes: ['eyeWideLeft', 'eyeWideRight', 'jawOpen', 'browOuterUpLeft', 'browOuterUpRight'], 
    weights: [0.2, 0.2, 0.3, 0.15, 0.15] 
  },
  fearful: { 
    shapes: ['eyeWideLeft', 'eyeWideRight', 'browInnerUp', 'mouthStretchLeft', 'mouthStretchRight'], 
    weights: [0.25, 0.25, 0.2, 0.15, 0.15] 
  },
  disgusted: { 
    shapes: ['noseSneerLeft', 'noseSneerRight', 'mouthUpperUpLeft', 'mouthUpperUpRight'], 
    weights: [0.3, 0.3, 0.2, 0.2] 
  },
  contempt: {
    shapes: ['mouthSmileLeft', 'mouthDimpleLeft', 'mouthPressRight'],
    weights: [0.4, 0.3, 0.3]
  },
  neutral: { 
    shapes: [], 
    weights: [] 
  },
};

// Indicadores de estrés/nerviosismo
const STRESS_INDICATORS = [
  'eyeBlinkLeft', 'eyeBlinkRight', // Parpadeo excesivo
  'browInnerUp', // Cejas tensas
  'mouthPressLeft', 'mouthPressRight', // Labios apretados
  'jawClench', // Mandíbula tensa
];

// Indicadores de confianza
const CONFIDENCE_INDICATORS = {
  positive: ['mouthSmileLeft', 'mouthSmileRight', 'cheekSquintLeft', 'cheekSquintRight'],
  negative: ['eyeLookDownLeft', 'eyeLookDownRight', 'browInnerUp'],
};

export const useAdvancedEmotionAnalysis = (options: UseAdvancedEmotionAnalysisOptions) => {
  const {
    tipoGrabacion,
    onFrameUpdate,
    onMicroexpresion,
    onBaselineComplete,
    onPrediccion,
  } = options;

  const [state, setState] = useState<AdvancedEmotionAnalysisState>({
    isAnalyzing: false,
    isCalibrating: false,
    currentEmotion: 'neutral',
    engagementScore: 0.5,
    stressScore: 0,
    confidenceScore: 0.5,
    baselineComplete: false,
    framesAnalyzed: 0,
    microexpresionesDetectadas: 0,
  });

  const faceLandmarkerRef = useRef<any>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const analysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Historial para análisis temporal
  const framesHistoryRef = useRef<EmotionFrame[]>([]);
  const microexpresionesRef = useRef<MicroexpresionData[]>([]);
  const baselineRef = useRef<BaselineEmocional | null>(null);
  
  // Para detección de cambios abruptos
  const lastEmotionScoresRef = useRef<Record<EmotionType, number> | null>(null);
  const emotionStartTimeRef = useRef<{ emotion: EmotionType; startTime: number } | null>(null);

  // Cargar MediaPipe Face Landmarker
  const loadFaceLandmarker = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🎭 [Advanced] Cargando MediaPipe Face Landmarker...');
      
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
      console.log('✅ [Advanced] MediaPipe cargado - modo optimizado (500ms)');
      return true;

    } catch (err) {
      console.error('⚠️ [Advanced] Error cargando MediaPipe:', err);
      return false;
    }
  }, []);

  // Calcular score de emoción desde blendshapes
  const calculateEmotionScores = useCallback((blendshapes: Record<string, number>): Record<EmotionType, number> => {
    const scores: Record<EmotionType, number> = {
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      fearful: 0,
      disgusted: 0,
      contempt: 0,
      neutral: 0.2, // Base para neutral
    };

    for (const [emotion, config] of Object.entries(EMOTION_BLENDSHAPE_WEIGHTS)) {
      if (config.shapes.length === 0) continue;
      
      let score = 0;
      config.shapes.forEach((shape, i) => {
        score += (blendshapes[shape] || 0) * config.weights[i];
      });
      scores[emotion as EmotionType] = Math.min(1, score);
    }

    return scores;
  }, []);

  // Detectar emoción dominante
  const getDominantEmotion = useCallback((scores: Record<EmotionType, number>): { emotion: EmotionType; score: number } => {
    let maxEmotion: EmotionType = 'neutral';
    let maxScore = 0.15; // Umbral mínimo

    for (const [emotion, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxEmotion = emotion as EmotionType;
      }
    }

    return { emotion: maxEmotion, score: maxScore };
  }, []);

  // Calcular estrés
  const calculateStressScore = useCallback((blendshapes: Record<string, number>): number => {
    let stressSum = 0;
    STRESS_INDICATORS.forEach(indicator => {
      stressSum += blendshapes[indicator] || 0;
    });
    return Math.min(1, stressSum / STRESS_INDICATORS.length * 2);
  }, []);

  // Calcular confianza
  const calculateConfidenceScore = useCallback((blendshapes: Record<string, number>): number => {
    let positiveSum = 0;
    let negativeSum = 0;

    CONFIDENCE_INDICATORS.positive.forEach(ind => {
      positiveSum += blendshapes[ind] || 0;
    });
    CONFIDENCE_INDICATORS.negative.forEach(ind => {
      negativeSum += blendshapes[ind] || 0;
    });

    const positive = positiveSum / CONFIDENCE_INDICATORS.positive.length;
    const negative = negativeSum / CONFIDENCE_INDICATORS.negative.length;
    
    return Math.max(0, Math.min(1, 0.5 + positive - negative));
  }, []);

  // Calcular engagement
  const calculateEngagement = useCallback((blendshapes: Record<string, number>, mirandoCamara: boolean): number => {
    let score = 0.5;

    // Factores positivos
    const positiveFactors = ['mouthSmileLeft', 'mouthSmileRight', 'eyeSquintLeft', 'eyeSquintRight', 'browInnerUp'];
    positiveFactors.forEach(factor => {
      score += (blendshapes[factor] || 0) * 0.1;
    });

    // Factores negativos
    const negativeFactors = ['eyeBlinkLeft', 'eyeBlinkRight', 'eyeLookDownLeft', 'eyeLookDownRight'];
    negativeFactors.forEach(factor => {
      score -= (blendshapes[factor] || 0) * 0.08;
    });

    // Bonus por mirar a cámara
    if (mirandoCamara) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }, []);

  // Detectar si mira a cámara
  const isLookingAtCamera = useCallback((matrices: any[]): boolean => {
    if (!matrices || matrices.length === 0) return false;
    
    try {
      const matrix = matrices[0].data;
      // Extraer rotación aproximada
      const rotationY = Math.abs(Math.asin(matrix[8]));
      const rotationX = Math.abs(Math.atan2(matrix[9], matrix[10]));
      
      // Umbral de 20 grados
      return rotationX < 0.35 && rotationY < 0.35;
    } catch {
      return true;
    }
  }, []);

  // Detectar cambio abrupto
  const detectAbruptChange = useCallback((currentScores: Record<EmotionType, number>): boolean => {
    if (!lastEmotionScoresRef.current) {
      lastEmotionScoresRef.current = currentScores;
      return false;
    }

    for (const emotion of Object.keys(currentScores) as EmotionType[]) {
      const delta = Math.abs(currentScores[emotion] - (lastEmotionScoresRef.current[emotion] || 0));
      if (delta > ABRUPT_CHANGE_THRESHOLD) {
        lastEmotionScoresRef.current = currentScores;
        return true;
      }
    }

    lastEmotionScoresRef.current = currentScores;
    return false;
  }, []);

  // Detectar y registrar microexpresiones
  const checkMicroexpression = useCallback((emotion: EmotionType, intensity: number, blendshapes: Record<string, number>) => {
    const now = performance.now();
    
    if (!emotionStartTimeRef.current || emotionStartTimeRef.current.emotion !== emotion) {
      // Nueva emoción detectada
      if (emotionStartTimeRef.current && emotionStartTimeRef.current.emotion !== 'neutral') {
        const duration = now - emotionStartTimeRef.current.startTime;
        
        if (duration < MICROEXPRESSION_MAX_DURATION_MS && intensity > 0.2) {
          const micro: MicroexpresionData = {
            timestamp_ms: now - startTimeRef.current,
            emocion: emotionStartTimeRef.current.emotion,
            intensidad: intensity,
            duracion_ms: duration,
            es_microexpresion: true,
            action_units: blendshapes,
          };
          
          microexpresionesRef.current.push(micro);
          setState(prev => ({ 
            ...prev, 
            microexpresionesDetectadas: prev.microexpresionesDetectadas + 1 
          }));
          
          onMicroexpresion?.(micro);
          console.log(`⚡ Microexpresión detectada: ${micro.emocion} (${Math.round(micro.duracion_ms)}ms)`);
        }
      }
      
      emotionStartTimeRef.current = { emotion, startTime: now };
    }
  }, [onMicroexpresion]);

  // Calcular baseline
  const calculateBaseline = useCallback(() => {
    if (framesHistoryRef.current.length < 10) return;

    const frames = framesHistoryRef.current;
    const emocionesSuma: Record<EmotionType, number> = {
      happy: 0, sad: 0, angry: 0, surprised: 0, 
      fearful: 0, disgusted: 0, contempt: 0, neutral: 0
    };
    let engagementSuma = 0;
    let variabilidadSuma = 0;

    frames.forEach((frame, i) => {
      for (const [emocion, score] of Object.entries(frame.emociones_scores)) {
        emocionesSuma[emocion as EmotionType] += score;
      }
      engagementSuma += frame.engagement_score;

      if (i > 0) {
        const prevFrame = frames[i - 1];
        for (const emocion of Object.keys(frame.emociones_scores) as EmotionType[]) {
          variabilidadSuma += Math.abs(
            frame.emociones_scores[emocion] - prevFrame.emociones_scores[emocion]
          );
        }
      }
    });

    const n = frames.length;
    const baseline: BaselineEmocional = {
      emociones_promedio: Object.fromEntries(
        Object.entries(emocionesSuma).map(([k, v]) => [k, v / n])
      ) as Record<EmotionType, number>,
      engagement_promedio: engagementSuma / n,
      variabilidad: variabilidadSuma / (n - 1) / Object.keys(emocionesSuma).length,
      timestamp_inicio: frames[0].timestamp_segundos,
      timestamp_fin: frames[n - 1].timestamp_segundos,
    };

    baselineRef.current = baseline;
    setState(prev => ({ ...prev, baselineComplete: true, isCalibrating: false }));
    onBaselineComplete?.(baseline);
    
    console.log('📊 Baseline establecido:', {
      engagement: Math.round(baseline.engagement_promedio * 100) + '%',
      variabilidad: baseline.variabilidad.toFixed(3),
    });
  }, [onBaselineComplete]);

  // Generar predicciones basadas en el tipo de grabación
  const generatePredictions = useCallback(() => {
    if (framesHistoryRef.current.length < 30) return;

    const recentFrames = framesHistoryRef.current.slice(-30);
    const avgEngagement = recentFrames.reduce((sum, f) => sum + f.engagement_score, 0) / recentFrames.length;
    const avgStress = recentFrames.reduce((sum, f) => {
      // Calcular estrés aproximado desde emociones negativas
      return sum + (f.emociones_scores.fearful || 0) + (f.emociones_scores.angry || 0) * 0.5;
    }, 0) / recentFrames.length;

    let prediccion: PrediccionComportamiento | null = null;

    switch (tipoGrabacion) {
      case 'deals':
        prediccion = {
          tipo: 'probabilidad_cierre',
          probabilidad: Math.min(1, avgEngagement * 1.2 - avgStress * 0.5),
          confianza: 0.7,
          factores: avgEngagement > 0.6 
            ? ['Alto engagement detectado', 'Postura receptiva']
            : ['Engagement moderado', 'Revisar objeciones'],
          timestamp: Date.now(),
        };
        break;

      case 'rrhh':
        prediccion = {
          tipo: 'autenticidad_respuestas',
          probabilidad: Math.min(1, 0.5 + avgEngagement * 0.3 - avgStress * 0.2),
          confianza: 0.65,
          factores: avgStress < 0.3
            ? ['Nivel de estrés normal', 'Expresiones congruentes']
            : ['Estrés elevado detectado', 'Verificar con preguntas de seguimiento'],
          timestamp: Date.now(),
        };
        break;

      case 'equipo':
        prediccion = {
          tipo: 'adopcion_ideas',
          probabilidad: avgEngagement,
          confianza: 0.75,
          factores: avgEngagement > 0.5
            ? ['Equipo engaged', 'Reacciones positivas']
            : ['Engagement bajo', 'Considerar dinamizar'],
          timestamp: Date.now(),
        };
        break;
    }

    if (prediccion) {
      onPrediccion?.(prediccion);
    }
  }, [tipoGrabacion, onPrediccion]);

  // Analizar frame de video
  const analyzeFrame = useCallback(() => {
    if (!faceLandmarkerRef.current || !videoElementRef.current) return;

    const video = videoElementRef.current;
    if (video.readyState < 2) return;

    try {
      const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());

      if (results.faceBlendshapes?.length > 0) {
        const blendshapeCategories = results.faceBlendshapes[0].categories;
        const blendshapes: Record<string, number> = {};
        
        blendshapeCategories.forEach((shape: any) => {
          blendshapes[shape.categoryName] = shape.score;
        });

        const currentTime = (Date.now() - startTimeRef.current) / 1000;
        const emotionScores = calculateEmotionScores(blendshapes);
        const { emotion, score } = getDominantEmotion(emotionScores);
        const mirandoCamara = isLookingAtCamera(results.facialTransformationMatrixes);
        const engagement = calculateEngagement(blendshapes, mirandoCamara);
        const stress = calculateStressScore(blendshapes);
        const confidence = calculateConfidenceScore(blendshapes);
        const cambioAbrupto = detectAbruptChange(emotionScores);

        // Calcular delta vs baseline
        let deltaVsBaseline = 0;
        if (baselineRef.current) {
          deltaVsBaseline = engagement - baselineRef.current.engagement_promedio;
        }

        const frame: EmotionFrame = {
          timestamp_segundos: currentTime,
          emocion_dominante: emotion,
          emociones_scores: emotionScores,
          engagement_score: engagement,
          confianza_deteccion: score,
          action_units: blendshapes,
          mirando_camara: mirandoCamara,
          cambio_abrupto: cambioAbrupto,
          delta_vs_baseline: deltaVsBaseline,
        };

        framesHistoryRef.current.push(frame);
        
        // Detectar microexpresiones
        checkMicroexpression(emotion, score, blendshapes);

        // Actualizar estado
        setState(prev => ({
          ...prev,
          currentEmotion: emotion,
          engagementScore: engagement,
          stressScore: stress,
          confidenceScore: confidence,
          framesAnalyzed: prev.framesAnalyzed + 1,
        }));

        onFrameUpdate?.(frame);

        // Calibración de baseline
        if (state.isCalibrating && currentTime * 1000 >= BASELINE_DURATION_MS) {
          calculateBaseline();
        }

        // Generar predicciones cada 10 segundos
        if (Math.floor(currentTime) % 10 === 0 && state.framesAnalyzed % 50 === 0) {
          generatePredictions();
        }

        // Log periódico
        if (Math.floor(currentTime) % 5 === 0 && framesHistoryRef.current.length % 25 === 0) {
          console.log(`🎭 [${currentTime.toFixed(1)}s] ${emotion} | Eng: ${Math.round(engagement * 100)}% | Stress: ${Math.round(stress * 100)}% | Micro: ${microexpresionesRef.current.length}`);
        }
      }
    } catch (err) {
      // Silenciar errores para no interrumpir
    }
  }, [
    calculateEmotionScores, getDominantEmotion, isLookingAtCamera,
    calculateEngagement, calculateStressScore, calculateConfidenceScore,
    detectAbruptChange, checkMicroexpression, calculateBaseline,
    generatePredictions, onFrameUpdate, state.isCalibrating, state.framesAnalyzed,
  ]);

  // Iniciar análisis
  const startAnalysis = useCallback(async (videoElement: HTMLVideoElement) => {
    videoElementRef.current = videoElement;
    startTimeRef.current = Date.now();
    framesHistoryRef.current = [];
    microexpresionesRef.current = [];
    baselineRef.current = null;
    lastEmotionScoresRef.current = null;
    emotionStartTimeRef.current = null;

    const loaded = await loadFaceLandmarker();
    if (!loaded) {
      console.warn('⚠️ MediaPipe no disponible, continuando sin análisis facial');
      return;
    }

    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      isCalibrating: true,
      framesAnalyzed: 0,
      microexpresionesDetectadas: 0,
      baselineComplete: false,
    }));

    // Análisis cada 500ms - optimizado para rendimiento de audio
    analysisIntervalRef.current = setInterval(analyzeFrame, ANALYSIS_INTERVAL_MS);

    console.log(`🎭 [Advanced] Análisis iniciado para: ${tipoGrabacion.toUpperCase()}`);
  }, [loadFaceLandmarker, analyzeFrame, tipoGrabacion]);

  // Detener análisis
  const stopAnalysis = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }

    faceLandmarkerRef.current?.close?.();
    faceLandmarkerRef.current = null;
    videoElementRef.current = null;

    setState(prev => ({
      ...prev,
      isAnalyzing: false,
      isCalibrating: false,
    }));

    console.log(`🛑 [Advanced] Análisis detenido. Frames: ${framesHistoryRef.current.length}, Microexpresiones: ${microexpresionesRef.current.length}`);
  }, []);

  // Obtener resultados
  const getResults = useCallback(() => {
    return {
      frames: framesHistoryRef.current,
      microexpresiones: microexpresionesRef.current,
      baseline: baselineRef.current,
      resumen: {
        framesAnalizados: framesHistoryRef.current.length,
        microexpresionesDetectadas: microexpresionesRef.current.length,
        engagementPromedio: framesHistoryRef.current.length > 0
          ? framesHistoryRef.current.reduce((sum, f) => sum + f.engagement_score, 0) / framesHistoryRef.current.length
          : 0,
        emocionDominante: getMostFrequentEmotion(framesHistoryRef.current),
      },
    };
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
      faceLandmarkerRef.current?.close?.();
    };
  }, []);

  return {
    ...state,
    startAnalysis,
    stopAnalysis,
    getResults,
  };
};

// Helper: obtener emoción más frecuente
function getMostFrequentEmotion(frames: EmotionFrame[]): EmotionType {
  if (frames.length === 0) return 'neutral';

  const counts: Record<string, number> = {};
  frames.forEach(f => {
    counts[f.emocion_dominante] = (counts[f.emocion_dominante] || 0) + 1;
  });

  let maxEmotion = 'neutral';
  let maxCount = 0;
  for (const [emotion, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxEmotion = emotion;
    }
  }

  return maxEmotion as EmotionType;
}

export default useAdvancedEmotionAnalysis;
