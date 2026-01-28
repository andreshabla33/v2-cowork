/**
 * Módulo de Grabación y Análisis Conductual
 * v2.0: Grabación, Transcripción, Análisis Facial/Corporal, Predicciones
 */

// Tipos - Originales
export * from './types';

// Tipos - Análisis Avanzado (v2.0) - Re-exportar selectivamente para evitar conflictos
export type {
  TipoGrabacion,
  PosturaType,
  GestoType,
  ConfiguracionGrabacion,
  MicroexpresionData,
  EmotionFrame,
  BaselineEmocional,
  BodyLanguageFrame,
  PosturaAnalysis,
  PrediccionComportamiento,
  AnalisisRRHH,
  AnalisisDeals,
  AnalisisEquipo,
  AnalisisCompleto,
  ResultadoAnalisis,
} from './types/analysis';
export { CONFIGURACIONES_GRABACION } from './types/analysis';

// Hooks - Originales
export { useRecording } from './useRecording';
export { useTranscription } from './useTranscription';
export { useEmotionAnalysis } from './useEmotionAnalysis';
export { useAISummary } from './useAISummary';

// Hooks - Avanzados (v2.0)
export { useAdvancedEmotionAnalysis } from './useAdvancedEmotionAnalysis';
export { useBodyLanguageAnalysis } from './useBodyLanguageAnalysis';
export { useCombinedAnalysis } from './useCombinedAnalysis';

// Componentes - Originales
export { RecordingButton } from './RecordingButton';
export { RecordingIndicator } from './RecordingIndicator';
export { RecordingConsent } from './RecordingConsent';
export { TranscriptionTimeline } from './TranscriptionTimeline';
export { AISummaryPanel } from './AISummaryPanel';
export { RecordingManager } from './RecordingManager';

// Componentes - Avanzados (v2.0)
export { RecordingTypeSelector } from './RecordingTypeSelector';
export { AnalysisDashboard } from './AnalysisDashboard';
export { RecordingManagerV2 } from './RecordingManagerV2';
