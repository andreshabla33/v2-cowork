import { useEffect, useRef, useCallback, useState } from 'react';
import { SelfieSegmentation, Results } from '@mediapipe/selfie_segmentation';

export type BackgroundEffectType = 'none' | 'blur' | 'image';

interface UseBackgroundEffectOptions {
  effectType: BackgroundEffectType;
  backgroundImage?: string | null;
  blurAmount?: number;
}

interface UseBackgroundEffectReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isProcessing: boolean;
  isSupported: boolean;
  error: string | null;
  processedStream: MediaStream | null;
}

export const useBackgroundEffect = (
  sourceStream: MediaStream | null,
  options: UseBackgroundEffectOptions
): UseBackgroundEffectReturn => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const segmentationRef = useRef<SelfieSegmentation | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Cargar imagen de fondo
  useEffect(() => {
    if (options.backgroundImage && options.effectType === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        backgroundImageRef.current = img;
      };
      img.onerror = () => {
        console.error('Error loading background image');
        backgroundImageRef.current = null;
      };
      img.src = options.backgroundImage;
    } else {
      backgroundImageRef.current = null;
    }
  }, [options.backgroundImage, options.effectType]);

  // Procesar resultados de segmentación
  const onResults = useCallback((results: Results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { effectType } = options;
    const blurAmount = options.blurAmount || 10;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (effectType === 'none') {
      // Sin efecto - dibujar video original
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    } else if (effectType === 'blur') {
      // Efecto blur
      // Primero dibujar fondo con blur
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';

      // Usar máscara de segmentación para dibujar persona sin blur
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    } else if (effectType === 'image' && backgroundImageRef.current) {
      // Efecto con imagen de fondo
      // Dibujar persona (usando máscara)
      ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      
      // Dibujar imagen de fondo detrás
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      // Fallback - dibujar video original
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }

    ctx.restore();
  }, [options]);

  // Inicializar segmentación
  useEffect(() => {
    if (!sourceStream || options.effectType === 'none') {
      setIsProcessing(false);
      setProcessedStream(null);
      return;
    }

    let mounted = true;

    const initSegmentation = async () => {
      try {
        // Crear elemento de video para el stream
        const video = document.createElement('video');
        video.srcObject = sourceStream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        videoRef.current = video;

        // Configurar canvas
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        // Inicializar MediaPipe Selfie Segmentation
        const selfieSegmentation = new SelfieSegmentation({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
          },
        });

        selfieSegmentation.setOptions({
          modelSelection: 1, // 0 = general, 1 = landscape (más rápido)
          selfieMode: true,
        });

        selfieSegmentation.onResults(onResults);
        segmentationRef.current = selfieSegmentation;

        setIsProcessing(true);

        // Loop de procesamiento
        const processFrame = async () => {
          if (!mounted || !videoRef.current || !segmentationRef.current) return;
          
          try {
            await segmentationRef.current.send({ image: videoRef.current });
          } catch (e) {
            // Ignorar errores de frames perdidos
          }
          
          if (mounted) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
          }
        };

        // Crear stream del canvas
        const canvasStream = canvas.captureStream(30);
        
        // Agregar audio track del stream original si existe
        const audioTracks = sourceStream.getAudioTracks();
        audioTracks.forEach(track => {
          canvasStream.addTrack(track);
        });

        if (mounted) {
          setProcessedStream(canvasStream);
          processFrame();
        }

      } catch (err: any) {
        console.error('Error initializing background effect:', err);
        if (mounted) {
          setError(err.message || 'Error al inicializar efecto de fondo');
          setIsSupported(false);
          setProcessedStream(null);
        }
      }
    };

    initSegmentation();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (segmentationRef.current) {
        segmentationRef.current.close();
        segmentationRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
      setIsProcessing(false);
    };
  }, [sourceStream, options.effectType, onResults]);

  return {
    canvasRef,
    isProcessing,
    isSupported,
    error,
    processedStream,
  };
};

export default useBackgroundEffect;
