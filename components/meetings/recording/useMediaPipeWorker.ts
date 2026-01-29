/**
 * useMediaPipeWorker - Hook para comunicación con el Web Worker de MediaPipe
 * ==========================================================================
 * Gestiona la inicialización, comunicación y limpieza del worker.
 * Mantiene el hilo principal libre para WebRTC y audio.
 * 
 * Uso:
 * const { isReady, analyze, stop } = useMediaPipeWorker({ enableFace: true, enablePose: true });
 * const result = await analyze(videoElement);
 * 
 * Fecha: 2026-01-29
 */

import { useRef, useCallback, useEffect, useState } from 'react';

interface UseMediaPipeWorkerOptions {
  enableFace?: boolean;
  enablePose?: boolean;
  onResult?: (result: MediaPipeResult) => void;
  onError?: (error: string) => void;
}

export interface FaceResult {
  blendshapes: Record<string, number>;
  landmarks: any[] | null;
  hasDetection: boolean;
}

export interface PoseResult {
  landmarks: any[];
  hasDetection: boolean;
}

export interface MediaPipeResult {
  timestamp: number;
  face: FaceResult | null;
  pose: PoseResult | null;
  error?: string;
}

interface WorkerMessage {
  type: 'init' | 'analyze' | 'stop' | 'ready' | 'result' | 'error';
  payload?: any;
}

export const useMediaPipeWorker = (options: UseMediaPipeWorkerOptions = {}) => {
  const { 
    enableFace = true, 
    enablePose = true,
    onResult,
    onError 
  } = options;

  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const pendingCallbacksRef = useRef<Map<number, (result: MediaPipeResult) => void>>(new Map());
  const requestIdRef = useRef(0);

  /**
   * Inicializar el worker
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    if (workerRef.current || isInitializing) {
      return isReady;
    }

    setIsInitializing(true);

    return new Promise((resolve) => {
      try {
        // Crear worker usando Vite's worker import syntax
        // @ts-ignore - Vite maneja esto en build time
        const worker = new Worker(new URL('./mediapipe.worker.ts', import.meta.url), { type: 'module' });
        
        worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
          const { type, payload } = event.data;

          switch (type) {
            case 'ready':
              if (payload?.workerReady) {
                // Worker cargado, ahora inicializar MediaPipe
                worker.postMessage({
                  type: 'init',
                  payload: { enableFace, enablePose }
                });
              } else if (payload?.success) {
                // MediaPipe inicializado
                console.log('✅ [Hook] Worker MediaPipe listo');
                setIsReady(true);
                setIsInitializing(false);
                resolve(true);
              } else if (payload?.stopped) {
                setIsReady(false);
              } else if (payload?.error) {
                console.error('❌ [Hook] Error en worker:', payload.error);
                onError?.(payload.error);
                setIsInitializing(false);
                resolve(false);
              }
              break;

            case 'result':
              // Resultado de análisis
              if (payload.timestamp) {
                const callback = pendingCallbacksRef.current.get(payload.timestamp);
                if (callback) {
                  callback(payload);
                  pendingCallbacksRef.current.delete(payload.timestamp);
                }
                onResult?.(payload);
              }
              break;

            case 'error':
              console.error('❌ [Hook] Error del worker:', payload);
              onError?.(payload?.message || 'Error desconocido');
              break;
          }
        };

        worker.onerror = (error) => {
          console.error('❌ [Hook] Error fatal del worker:', error);
          onError?.(error.message);
          setIsInitializing(false);
          resolve(false);
        };

        workerRef.current = worker;

      } catch (error) {
        console.error('❌ [Hook] No se pudo crear el worker:', error);
        setIsInitializing(false);
        resolve(false);
      }
    });
  }, [enableFace, enablePose, isInitializing, isReady, onError, onResult]);

  /**
   * Analizar un frame de video
   */
  const analyze = useCallback(async (
    videoElement: HTMLVideoElement,
    options?: { analyzeFace?: boolean; analyzePose?: boolean }
  ): Promise<MediaPipeResult | null> => {
    if (!workerRef.current || !isReady) {
      return null;
    }

    try {
      // Crear ImageBitmap del video
      const imageBitmap = await createImageBitmap(videoElement);
      const timestamp = performance.now();

      return new Promise((resolve) => {
        // Guardar callback para esta solicitud
        pendingCallbacksRef.current.set(timestamp, resolve);

        // Enviar al worker
        workerRef.current!.postMessage({
          type: 'analyze',
          payload: {
            imageData: imageBitmap,
            timestamp,
            analyzeFace: options?.analyzeFace ?? enableFace,
            analyzePose: options?.analyzePose ?? enablePose,
          }
        });

        // Timeout de seguridad (3 segundos)
        setTimeout(() => {
          if (pendingCallbacksRef.current.has(timestamp)) {
            pendingCallbacksRef.current.delete(timestamp);
            resolve(null);
          }
        }, 3000);
      });

    } catch (error) {
      console.error('❌ [Hook] Error creando ImageBitmap:', error);
      return null;
    }
  }, [isReady, enableFace, enablePose]);

  /**
   * Detener el worker
   */
  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsReady(false);
    pendingCallbacksRef.current.clear();
    console.log('🛑 [Hook] Worker detenido');
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isReady,
    isInitializing,
    initialize,
    analyze,
    stop,
  };
};

export default useMediaPipeWorker;
