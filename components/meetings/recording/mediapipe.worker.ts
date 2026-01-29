/**
 * MediaPipe Web Worker
 * =====================
 * Ejecuta el análisis facial y corporal en un hilo separado
 * para no bloquear el hilo principal y mejorar el rendimiento del audio.
 * 
 * Arquitectura:
 * - Hilo Principal: WebRTC, Web Speech API, UI
 * - Web Worker: MediaPipe FaceLandmarker, PoseLandmarker, cálculos
 * 
 * Fecha: 2026-01-29
 * Optimización: Mover procesamiento pesado fuera del hilo principal
 */

// Tipos de mensajes
type WorkerMessageType = 'init' | 'analyze' | 'stop' | 'ready' | 'result' | 'error';

interface WorkerMessage {
  type: WorkerMessageType;
  payload?: any;
}

interface AnalyzePayload {
  imageData: ImageBitmap;
  timestamp: number;
  analyzeFace: boolean;
  analyzePose: boolean;
}

// Estado del worker
let faceLandmarker: any = null;
let poseLandmarker: any = null;
let isInitialized = false;

// CDN de MediaPipe
const MEDIAPIPE_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const POSE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

// Declarar variables globales de MediaPipe (se cargan vía importScripts)
declare const FilesetResolver: any;
declare const FaceLandmarker: any;
declare const PoseLandmarker: any;

/**
 * Inicializar MediaPipe en el worker
 */
async function initializeMediaPipe(options: { enableFace: boolean; enablePose: boolean }) {
  try {
    console.log('🔧 [Worker] Inicializando MediaPipe...');
    
    // Cargar MediaPipe via importScripts (forma estándar para Workers)
    // @ts-ignore
    importScripts('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs');
    
    console.log('🔧 [Worker] MediaPipe script cargado, inicializando FilesetResolver...');
    
    // Resolver fileset
    const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN);
    
    // Inicializar FaceLandmarker si está habilitado
    if (options.enableFace) {
      faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: FACE_MODEL_URL,
          delegate: 'GPU',
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
        numFaces: 1,
      });
      console.log('✅ [Worker] FaceLandmarker inicializado');
    }
    
    // Inicializar PoseLandmarker si está habilitado
    if (options.enablePose) {
      poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: POSE_MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      console.log('✅ [Worker] PoseLandmarker inicializado');
    }
    
    isInitialized = true;
    console.log('✅ [Worker] MediaPipe completamente inicializado');
    
    return { success: true };
  } catch (error) {
    console.error('❌ [Worker] Error inicializando MediaPipe:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Analizar un frame de video
 */
function analyzeFrame(payload: AnalyzePayload) {
  if (!isInitialized) {
    return { error: 'MediaPipe no inicializado' };
  }
  
  const results: any = {
    timestamp: payload.timestamp,
    face: null,
    pose: null,
  };
  
  try {
    // Análisis facial
    if (payload.analyzeFace && faceLandmarker) {
      const faceResult = faceLandmarker.detectForVideo(payload.imageData, payload.timestamp);
      
      if (faceResult.faceBlendshapes && faceResult.faceBlendshapes.length > 0) {
        // Convertir blendshapes a objeto simple
        const blendshapes: Record<string, number> = {};
        faceResult.faceBlendshapes[0].categories.forEach((cat: any) => {
          blendshapes[cat.categoryName] = cat.score;
        });
        
        results.face = {
          blendshapes,
          landmarks: faceResult.faceLandmarks?.[0] || null,
          hasDetection: true,
        };
      } else {
        results.face = { hasDetection: false };
      }
    }
    
    // Análisis de pose
    if (payload.analyzePose && poseLandmarker) {
      const poseResult = poseLandmarker.detectForVideo(payload.imageData, payload.timestamp);
      
      if (poseResult.landmarks && poseResult.landmarks.length > 0) {
        results.pose = {
          landmarks: poseResult.landmarks[0],
          hasDetection: true,
        };
      } else {
        results.pose = { hasDetection: false };
      }
    }
    
    return results;
  } catch (error) {
    console.error('❌ [Worker] Error en análisis:', error);
    return { error: String(error) };
  }
}

/**
 * Limpiar recursos
 */
function cleanup() {
  try {
    if (faceLandmarker) {
      faceLandmarker.close();
      faceLandmarker = null;
    }
    if (poseLandmarker) {
      poseLandmarker.close();
      poseLandmarker = null;
    }
    isInitialized = false;
    console.log('🧹 [Worker] Recursos liberados');
  } catch (error) {
    console.error('❌ [Worker] Error limpiando recursos:', error);
  }
}

/**
 * Manejador de mensajes del hilo principal
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'init':
      const initResult = await initializeMediaPipe(payload || { enableFace: true, enablePose: true });
      self.postMessage({ type: 'ready', payload: initResult });
      break;
      
    case 'analyze':
      const analyzeResult = analyzeFrame(payload);
      self.postMessage({ type: 'result', payload: analyzeResult });
      break;
      
    case 'stop':
      cleanup();
      self.postMessage({ type: 'ready', payload: { stopped: true } });
      break;
      
    default:
      console.warn('[Worker] Mensaje desconocido:', type);
  }
};

// Notificar que el worker está listo
self.postMessage({ type: 'ready', payload: { workerReady: true } });

export {};
