/**
 * Módulo de Grabación y AI Notes
 * Fase 2: Grabación, Transcripción, Análisis de Emociones y Resumen AI
 */

// Tipos
export * from './types';

// Hooks
export { useRecording } from './useRecording';
export { useTranscription } from './useTranscription';
export { useEmotionAnalysis } from './useEmotionAnalysis';
export { useAISummary } from './useAISummary';

// Componentes
export { RecordingButton } from './RecordingButton';
export { RecordingIndicator } from './RecordingIndicator';
export { RecordingConsent } from './RecordingConsent';
export { TranscriptionTimeline } from './TranscriptionTimeline';
export { AISummaryPanel } from './AISummaryPanel';
export { RecordingManager } from './RecordingManager';
