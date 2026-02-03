import React, { useEffect, useRef, useState, memo } from 'react';
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
}

export const VideoWithBackground = memo(({
  stream,
  effectType,
  backgroundImage,
  blurAmount = 10,
  muted = false,
  className = '',
  onProcessedStreamReady,
}: VideoWithBackgroundProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const segmentationRef = useRef<SelfieSegmentation | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);

  // Cargar imagen de fondo
  useEffect(() => {
    if (backgroundImage && effectType === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        backgroundImageRef.current = img;
      };
      img.onerror = () => {
        console.error('Error loading background image');
        backgroundImageRef.current = null;
      };
      img.src = backgroundImage;
    } else {
      backgroundImageRef.current = null;
    }
  }, [backgroundImage, effectType]);

  // Inicializar segmentación
  useEffect(() => {
    if (!stream || effectType === 'none') {
      setShowCanvas(false);
      setIsInitialized(false);
      return;
    }

    let mounted = true;
    let processingActive = false;

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

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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
          if (!mounted || !ctx) return;

          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (effectType === 'blur') {
            // Fondo con blur
            ctx.filter = `blur(${blurAmount}px)`;
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';

            // Persona sin blur usando máscara
            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'destination-over';
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
          } else if (effectType === 'image' && backgroundImageRef.current) {
            // Persona con imagen de fondo
            ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-in';
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'destination-over';
            ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
          } else {
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
          }

          ctx.restore();
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
          console.log('Background effect initialized:', effectType);
          
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
      setIsInitialized(false);
    };
  }, [stream, effectType, blurAmount, onProcessedStreamReady]);

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
