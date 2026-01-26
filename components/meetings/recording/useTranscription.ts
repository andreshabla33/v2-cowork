/**
 * Hook para transcripción en tiempo real usando MoonshineJS
 * Procesa audio localmente en el navegador - sin enviar datos a servidores
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { TranscriptionSegment, TranscriptionState } from './types';

declare global {
  interface Window {
    Moonshine: any;
  }
}

interface UseTranscriptionOptions {
  grabacionId: string;
  idioma?: string;
  onSegmentUpdate?: (segment: TranscriptionSegment) => void;
  onFullTranscriptUpdate?: (fullText: string) => void;
}

const MOONSHINE_CDN = 'https://cdn.jsdelivr.net/npm/@moonshine-ai/moonshine-js@latest/dist/moonshine.min.js';

export function useTranscription(options: UseTranscriptionOptions) {
  const { grabacionId, idioma = 'es', onSegmentUpdate, onFullTranscriptUpdate } = options;

  const [state, setState] = useState<TranscriptionState>({
    isLoading: false,
    isTranscribing: false,
    error: null,
    segments: [],
    fullTranscript: '',
    currentSegment: '',
  });

  const transcriberRef = useRef<any>(null);
  const segmentIdRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const moonshineLoadedRef = useRef(false);

  const loadMoonshine = useCallback(async (): Promise<boolean> => {
    if (moonshineLoadedRef.current && window.Moonshine) {
      return true;
    }

    return new Promise((resolve) => {
      if (window.Moonshine) {
        moonshineLoadedRef.current = true;
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = MOONSHINE_CDN;
      script.type = 'module';
      script.async = true;

      script.onload = () => {
        moonshineLoadedRef.current = true;
        console.log('✅ MoonshineJS cargado');
        resolve(true);
      };

      script.onerror = () => {
        console.error('❌ Error cargando MoonshineJS');
        resolve(false);
      };

      document.head.appendChild(script);
    });
  }, []);

  const startTranscription = useCallback(async (audioStream?: MediaStream) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const loaded = await loadMoonshine();
      if (!loaded || !window.Moonshine) {
        throw new Error('No se pudo cargar el motor de transcripción');
      }

      startTimeRef.current = Date.now();

      const transcriber = new window.Moonshine.MicrophoneTranscriber(
        'model/tiny',
        {
          onTranscriptionCommitted: (text: string) => {
            const segmentId = `seg_${grabacionId}_${segmentIdRef.current++}`;
            const currentTime = (Date.now() - startTimeRef.current) / 1000;
            
            const segment: TranscriptionSegment = {
              id: segmentId,
              grabacion_id: grabacionId,
              texto: text.trim(),
              inicio_segundos: Math.max(0, currentTime - 5),
              fin_segundos: currentTime,
              idioma: idioma,
              confianza: 0.9,
            };

            setState(prev => {
              const newSegments = [...prev.segments, segment];
              const newFullTranscript = newSegments.map(s => s.texto).join(' ');
              
              onSegmentUpdate?.(segment);
              onFullTranscriptUpdate?.(newFullTranscript);

              return {
                ...prev,
                segments: newSegments,
                fullTranscript: newFullTranscript,
                currentSegment: '',
              };
            });
          },
          onTranscriptionUpdated: (text: string) => {
            setState(prev => ({
              ...prev,
              currentSegment: text,
            }));
          },
        },
        true
      );

      if (audioStream) {
        transcriber.setAudioStream?.(audioStream);
      }

      transcriberRef.current = transcriber;
      await transcriber.start();

      setState(prev => ({ ...prev, isLoading: false, isTranscribing: true }));
      console.log('🎤 Transcripción iniciada');

    } catch (err: any) {
      console.error('Error iniciando transcripción:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Error al iniciar transcripción',
      }));
    }
  }, [grabacionId, idioma, loadMoonshine, onSegmentUpdate, onFullTranscriptUpdate]);

  const stopTranscription = useCallback(async () => {
    if (transcriberRef.current) {
      try {
        await transcriberRef.current.stop();
        transcriberRef.current = null;
        setState(prev => ({ ...prev, isTranscribing: false }));
        console.log('🛑 Transcripción detenida');
      } catch (err) {
        console.error('Error deteniendo transcripción:', err);
      }
    }
  }, []);

  const transcribeAudioBlob = useCallback(async (audioBlob: Blob): Promise<string> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const loaded = await loadMoonshine();
      if (!loaded || !window.Moonshine) {
        throw new Error('No se pudo cargar el motor de transcripción');
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);

      const transcriber = new window.Moonshine.Transcriber('model/tiny');
      const result = await transcriber.transcribe(audioData);
      const fullText = result.text || result;

      setState(prev => ({
        ...prev,
        isLoading: false,
        fullTranscript: fullText,
      }));

      onFullTranscriptUpdate?.(fullText);
      return fullText;

    } catch (err: any) {
      console.error('Error transcribiendo audio:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Error al transcribir audio',
      }));
      return '';
    }
  }, [loadMoonshine, onFullTranscriptUpdate]);

  useEffect(() => {
    return () => {
      transcriberRef.current?.stop?.();
    };
  }, []);

  return {
    state,
    startTranscription,
    stopTranscription,
    transcribeAudioBlob,
    isTranscribing: state.isTranscribing,
    isLoading: state.isLoading,
    segments: state.segments,
    fullTranscript: state.fullTranscript,
    currentSegment: state.currentSegment,
    error: state.error,
  };
}

export default useTranscription;
