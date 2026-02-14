import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

export type BackgroundEffectType = 'none' | 'blur' | 'image';

interface VideoWithBackgroundProps {
  stream: MediaStream | null;
  effectType: BackgroundEffectType;
  backgroundImage?: string | null;
  blurAmount?: number;
  muted?: boolean;
  className?: string;
  onProcessedStreamReady?: (stream: MediaStream) => void;
  mirrorVideo?: boolean;
}

const supportsOffscreenCanvas = (): boolean => {
  try {
    return typeof OffscreenCanvas !== 'undefined' && typeof (new OffscreenCanvas(1, 1)).transferToImageBitmap === 'function';
  } catch {
    return false;
  }
};

const USE_OFFSCREEN = supportsOffscreenCanvas();

export const VideoWithBackground = memo(({
  stream,
  effectType,
  backgroundImage,
  blurAmount = 10,
  muted = false,
  className = '',
  onProcessedStreamReady,
  mirrorVideo = false,
}: VideoWithBackgroundProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const segmentationRef = useRef<SelfieSegmentation | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerReadyRef = useRef(false);
  const workerBusyRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);

  // Cargar imagen de fondo
  useEffect(() => {
    if (backgroundImage && effectType === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        backgroundImageRef.current = img;
        // Si hay worker, enviar la imagen como blob
        if (workerRef.current && workerReadyRef.current) {
          const tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = img.naturalWidth;
          tmpCanvas.height = img.naturalHeight;
          const tmpCtx = tmpCanvas.getContext('2d');
          if (tmpCtx) {
            tmpCtx.drawImage(img, 0, 0);
            tmpCanvas.toBlob((blob) => {
              if (blob && workerRef.current) {
                workerRef.current.postMessage({ type: 'config', backgroundImageBlob: blob });
              }
            });
          }
        }
      };
      img.onerror = () => {
        console.error('Error loading background image');
        backgroundImageRef.current = null;
      };
      img.src = backgroundImage;
    } else {
      backgroundImageRef.current = null;
      if (workerRef.current && workerReadyRef.current) {
        workerRef.current.postMessage({ type: 'config', clearBackground: true });
      }
    }
  }, [backgroundImage, effectType]);

  // Enviar config al worker cuando cambian parámetros
  useEffect(() => {
    if (!USE_OFFSCREEN || !workerRef.current || !workerReadyRef.current) return;
    workerRef.current.postMessage({ type: 'config', effectType, blurAmount, mirrorVideo });
  }, [effectType, blurAmount, mirrorVideo]);

  // Callback para composición en main thread (fallback)
  const compositeFallback = useCallback((
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    image: CanvasImageSource,
    mask: CanvasImageSource,
  ) => {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mirrorVideo) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    if (effectType === 'blur') {
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    } else if (effectType === 'image' && backgroundImageRef.current) {
      ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'destination-over';
      if (mirrorVideo) {
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
      }
      ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    ctx.restore();
  }, [effectType, blurAmount, mirrorVideo]);

  // Inicializar segmentación
  useEffect(() => {
    if (!stream || effectType === 'none') {
      setShowCanvas(false);
      setIsInitialized(false);
      return;
    }

    let mounted = true;
    let processingActive = false;
    let worker: Worker | null = null;

    const initSegmentation = async () => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        // Esperar a que el video tenga dimensiones
        await new Promise<void>((resolve) => {
          if (video.videoWidth > 0) {
            resolve();
          } else {
            video.onloadedmetadata = () => resolve();
          }
        });

        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Inicializar worker si soporta OffscreenCanvas
        if (USE_OFFSCREEN) {
          try {
            worker = new Worker(
              new URL('../workers/videoCompositorWorker.ts', import.meta.url),
              { type: 'module' }
            );
            workerRef.current = worker;
            workerBusyRef.current = false;

            worker.onmessage = (ev) => {
              if (ev.data.type === 'ready') {
                workerReadyRef.current = true;
                worker!.postMessage({ type: 'config', effectType, blurAmount, mirrorVideo });
                // Si hay imagen de fondo cargada, enviarla al worker ahora
                if (effectType === 'image' && backgroundImageRef.current) {
                  const tmpCanvas = document.createElement('canvas');
                  tmpCanvas.width = backgroundImageRef.current.naturalWidth;
                  tmpCanvas.height = backgroundImageRef.current.naturalHeight;
                  const tmpCtx = tmpCanvas.getContext('2d');
                  if (tmpCtx) {
                    tmpCtx.drawImage(backgroundImageRef.current, 0, 0);
                    tmpCanvas.toBlob((blob) => {
                      if (blob && worker) {
                        worker.postMessage({ type: 'config', backgroundImageBlob: blob });
                        console.log('🖼️ Background image enviada al worker (on ready)');
                      }
                    });
                  }
                }
                console.log('🖼️ OffscreenCanvas compositor worker listo');
              } else if (ev.data.type === 'composited') {
                workerBusyRef.current = false;
                const bitmap = ev.data.bitmap as ImageBitmap;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                bitmap.close();
              }
            };

            worker.postMessage({ type: 'init', width: w, height: h });
          } catch (err) {
            console.warn('⚠️ No se pudo crear compositor worker, usando fallback:', err);
            worker = null;
            workerRef.current = null;
          }
        }

        // Inicializar MediaPipe
        const selfieSegmentation = new SelfieSegmentation({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
          },
        });

        selfieSegmentation.setOptions({
          modelSelection: 1,
          selfieMode: true,
        });

        selfieSegmentation.onResults((results) => {
          if (!mounted) return;

          if (worker && workerReadyRef.current && !workerBusyRef.current) {
            // OffscreenCanvas path: enviar bitmaps al worker
            Promise.all([
              createImageBitmap(results.image as ImageBitmapSource),
              createImageBitmap(results.segmentationMask as ImageBitmapSource),
            ]).then(([imgBitmap, maskBitmap]) => {
              if (!mounted || !worker) {
                imgBitmap.close();
                maskBitmap.close();
                return;
              }
              workerBusyRef.current = true;
              worker.postMessage(
                { type: 'frame', image: imgBitmap, mask: maskBitmap },
                [imgBitmap, maskBitmap]
              );
            }).catch(() => {
              // Fallback si createImageBitmap falla
              compositeFallback(ctx, canvas, results.image, results.segmentationMask);
            });
          } else {
            // Fallback: composición en main thread
            compositeFallback(ctx, canvas, results.image, results.segmentationMask);
          }
        });

        segmentationRef.current = selfieSegmentation;

        // Loop de procesamiento
        const processFrame = async () => {
          if (!mounted || !video || !segmentationRef.current || processingActive) return;
          
          processingActive = true;
          try {
            if (video.readyState >= 2) {
              await segmentationRef.current.send({ image: video });
            }
          } catch (e) {
            // Ignorar errores de frames
          }
          processingActive = false;
          
          if (mounted) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
          }
        };

        if (mounted) {
          setIsInitialized(true);
          setShowCanvas(true);
          console.log('Background effect initialized:', effectType, USE_OFFSCREEN ? '(OffscreenCanvas)' : '(main thread)');
          
          // Crear stream del canvas para transmitir
          if (onProcessedStreamReady) {
            const canvasStream = canvas.captureStream(30);
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach(track => canvasStream.addTrack(track.clone()));
            onProcessedStreamReady(canvasStream);
          }
          
          processFrame();
        }

      } catch (err) {
        console.error('Error initializing background effect:', err);
        if (mounted) {
          setShowCanvas(false);
        }
      }
    };

    // Pequeño delay para asegurar que el video esté listo
    const timer = setTimeout(initSegmentation, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (segmentationRef.current) {
        segmentationRef.current.close();
        segmentationRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'destroy' });
        workerRef.current.terminate();
        workerRef.current = null;
        workerReadyRef.current = false;
      }
      setIsInitialized(false);
    };
  }, [stream, effectType, blurAmount, onProcessedStreamReady, mirrorVideo, compositeFallback]);

  // Actualizar video source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }

    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  if (!stream) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Video original (oculto cuando hay efecto activo) */}
      <video
        ref={videoRef}
        muted={muted}
        playsInline
        autoPlay
        className={`w-full h-full object-cover ${showCanvas && effectType !== 'none' ? 'hidden' : ''}`}
      />
      
      {/* Canvas con efecto (visible cuando hay efecto activo) */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover ${showCanvas && effectType !== 'none' ? '' : 'hidden'}`}
      />

      {/* Indicador de carga */}
      {effectType !== 'none' && !isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-white/70">Cargando efecto...</span>
          </div>
        </div>
      )}
    </div>
  );
});

VideoWithBackground.displayName = 'VideoWithBackground';

export default VideoWithBackground;
