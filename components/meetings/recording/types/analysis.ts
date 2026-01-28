/**
 * Tipos e interfaces para el sistema de análisis conductual
 * Incluye definiciones para: RRHH, Deals, Reuniones de Equipo
 */

// ==================== TIPOS BASE ====================

export type TipoGrabacion = 'rrhh' | 'deals' | 'equipo';

export type EmotionType = 'happy' | 'sad' | 'angry' | 'surprised' | 'fearful' | 'disgusted' | 'neutral' | 'contempt';

export type PosturaType = 'abierta' | 'cerrada' | 'inclinado_adelante' | 'inclinado_atras' | 'neutral';

export type GestoType = 'manos_activas' | 'auto_toque' | 'brazos_cruzados' | 'manos_juntas' | 'neutral';

// ==================== CONFIGURACIÓN POR TIPO ====================

export interface ConfiguracionGrabacion {
  tipo: TipoGrabacion;
  titulo: string;
  descripcion: string;
  icono: string;
  color: string;
  requiereDisclaimer: boolean;
  disclaimerTexto?: string;
  metricas: string[];
}

export const CONFIGURACIONES_GRABACION: Record<TipoGrabacion, ConfiguracionGrabacion> = {
  rrhh: {
    tipo: 'rrhh',
    titulo: 'Entrevista RRHH',
    descripcion: 'Entrevistas con candidatos o reuniones one-to-one',
    icono: '👔',
    color: 'from-blue-600 to-indigo-600',
    requiereDisclaimer: true,
    disclaimerTexto: `⚠️ AVISO IMPORTANTE

Este análisis es una herramienta de APOYO para la reflexión post-entrevista.

• Los datos reflejan expresiones faciales observadas, NO estados mentales reales
• No debe usarse como único criterio para decisiones de contratación
• El candidato debe ser informado de que se realiza análisis conductual
• Cumple con las normativas de protección de datos aplicables

Al continuar, confirmas que el participante ha dado su consentimiento.`,
    metricas: [
      'congruencia_verbal_no_verbal',
      'nivel_nerviosismo',
      'confianza_percibida',
      'engagement_por_pregunta',
      'momentos_incomodidad',
      'prediccion_fit_cultural',
    ],
  },
  deals: {
    tipo: 'deals',
    titulo: 'Reunión de Ventas',
    descripcion: 'Deals, presentaciones comerciales y negociaciones',
    icono: '🤝',
    color: 'from-green-600 to-emerald-600',
    requiereDisclaimer: false,
    metricas: [
      'momentos_interes',
      'señales_objecion',
      'engagement_por_tema',
      'señales_cierre',
      'prediccion_probabilidad_cierre',
      'puntos_dolor_detectados',
    ],
  },
  equipo: {
    tipo: 'equipo',
    titulo: 'Reunión de Equipo',
    descripcion: 'Reuniones de trabajo, brainstorming, presentación de ideas',
    icono: '👥',
    color: 'from-purple-600 to-violet-600',
    requiereDisclaimer: false,
    metricas: [
      'participacion_por_persona',
      'engagement_grupal',
      'reacciones_a_ideas',
      'momentos_desconexion',
      'dinamica_grupal',
      'prediccion_adopcion_ideas',
    ],
  },
};

// ==================== ANÁLISIS FACIAL ====================

export interface MicroexpresionData {
  timestamp_ms: number;
  emocion: EmotionType;
  intensidad: number; // 0-1
  duracion_ms: number;
  es_microexpresion: boolean; // < 500ms
  action_units: Record<string, number>;
}

export interface EmotionFrame {
  timestamp_segundos: number;
  emocion_dominante: EmotionType;
  emociones_scores: Record<EmotionType, number>;
  engagement_score: number;
  confianza_deteccion: number;
  action_units: Record<string, number>;
  mirando_camara: boolean;
  cambio_abrupto: boolean;
  delta_vs_baseline: number;
}

export interface BaselineEmocional {
  emociones_promedio: Record<EmotionType, number>;
  engagement_promedio: number;
  variabilidad: number;
  timestamp_inicio: number;
  timestamp_fin: number;
}

// ==================== ANÁLISIS CORPORAL ====================

export interface BodyLanguageFrame {
  timestamp_segundos: number;
  postura: PosturaType;
  postura_score: number; // -1 (cerrada) a 1 (abierta)
  inclinacion_x: number; // grados
  inclinacion_y: number;
  gestos_manos: GestoType;
  actividad_manos: number; // 0-1
  auto_toque_detectado: boolean;
  brazos_cruzados: boolean;
  hombros_tension: number; // 0-1
}

export interface PosturaAnalysis {
  postura_dominante: PosturaType;
  tiempo_postura_abierta_pct: number;
  tiempo_postura_cerrada_pct: number;
  cambios_postura: number;
  momentos_tension: { timestamp: number; intensidad: number }[];
}

// ==================== PREDICCIONES DE COMPORTAMIENTO ====================

export interface PrediccionComportamiento {
  tipo: string;
  probabilidad: number; // 0-1
  confianza: number; // 0-1
  factores: string[];
  timestamp: number;
}

// ==================== ANÁLISIS POR TIPO DE GRABACIÓN ====================

// RRHH / Entrevistas
export interface AnalisisRRHH {
  tipo: 'rrhh';
  
  // Métricas de congruencia
  congruencia_verbal_no_verbal: number; // 0-1
  
  // Timeline de nerviosismo (normalizado por baseline)
  nerviosismo_timeline: { timestamp: number; score: number; trigger?: string }[];
  nerviosismo_promedio: number;
  
  // Confianza percibida
  confianza_percibida: number;
  momentos_alta_confianza: { timestamp: number; duracion: number }[];
  momentos_baja_confianza: { timestamp: number; duracion: number }[];
  
  // Incomodidad por temas
  momentos_incomodidad: { 
    timestamp: number; 
    duracion: number; 
    indicadores: string[];
  }[];
  
  // Engagement durante la entrevista
  engagement_timeline: { timestamp: number; score: number }[];
  
  // Predicciones
  predicciones: {
    fit_cultural: PrediccionComportamiento;
    nivel_interes_puesto: PrediccionComportamiento;
    autenticidad_respuestas: PrediccionComportamiento;
  };
  
  // Resumen ejecutivo
  resumen: {
    fortalezas_observadas: string[];
    areas_atencion: string[];
    recomendacion_seguimiento: string;
  };
}

// Deals / Ventas
export interface AnalisisDeals {
  tipo: 'deals';
  
  // Momentos de interés del cliente
  momentos_interes: { 
    timestamp: number; 
    score: number; 
    tema_discutido?: string;
    indicadores: string[];
  }[];
  
  // Señales de objeción
  señales_objecion: { 
    timestamp: number; 
    tipo: 'precio' | 'timing' | 'caracteristicas' | 'competencia' | 'desconocido';
    intensidad: number;
    indicadores: string[];
  }[];
  
  // Engagement por tema
  engagement_por_tema: { 
    tema: string; 
    inicio: number;
    fin: number;
    engagement_promedio: number;
    pico_engagement: number;
  }[];
  
  // Señales de cierre
  señales_cierre: { 
    timestamp: number; 
    tipo: 'positiva' | 'negativa';
    indicadores: string[];
  }[];
  
  // Puntos de dolor detectados
  puntos_dolor: {
    timestamp: number;
    descripcion: string;
    reaccion_emocional: EmotionType;
    intensidad: number;
  }[];
  
  // Predicciones
  predicciones: {
    probabilidad_cierre: PrediccionComportamiento;
    siguiente_paso_recomendado: PrediccionComportamiento;
    objecion_principal: PrediccionComportamiento;
  };
  
  // Resumen ejecutivo
  resumen: {
    momentos_clave: string[];
    objeciones_detectadas: string[];
    recomendaciones_seguimiento: string[];
    probabilidad_cierre_estimada: number;
  };
}

// Reuniones de Equipo
export interface AnalisisEquipo {
  tipo: 'equipo';
  
  // Participación por persona
  participacion: {
    usuario_id: string;
    usuario_nombre: string;
    tiempo_hablando_segundos: number;
    tiempo_hablando_pct: number;
    engagement_promedio: number;
    intervenciones: number;
    reacciones_positivas_recibidas: number;
    reacciones_negativas_recibidas: number;
  }[];
  
  // Engagement grupal timeline
  engagement_grupal: { 
    timestamp: number; 
    score_promedio: number;
    participantes_engaged: number;
    participantes_total: number;
  }[];
  
  // Reacciones a ideas presentadas
  reacciones_ideas: {
    presenter_id: string;
    presenter_nombre: string;
    timestamp: number;
    duracion_presentacion: number;
    reaccion_grupal: 'positiva' | 'neutral' | 'mixta' | 'negativa';
    engagement_promedio: number;
    emociones_predominantes: EmotionType[];
  }[];
  
  // Momentos de desconexión grupal
  momentos_desconexion: {
    timestamp: number;
    duracion: number;
    participantes_desconectados: string[];
    posible_causa: string;
  }[];
  
  // Dinámica grupal
  dinamica_grupal: {
    cohesion_score: number; // 0-1
    participacion_equilibrada: boolean;
    lideres_naturales: string[];
    participantes_pasivos: string[];
  };
  
  // Predicciones
  predicciones: {
    adopcion_ideas: PrediccionComportamiento;
    necesidad_seguimiento: PrediccionComportamiento;
    riesgo_conflicto: PrediccionComportamiento;
  };
  
  // Resumen ejecutivo
  resumen: {
    ideas_mejor_recibidas: string[];
    participantes_destacados: string[];
    areas_mejora_equipo: string[];
    recomendaciones: string[];
  };
}

export type AnalisisCompleto = AnalisisRRHH | AnalisisDeals | AnalisisEquipo;

// ==================== RESULTADO FINAL ====================

export interface ResultadoAnalisis {
  grabacion_id: string;
  tipo_grabacion: TipoGrabacion;
  duracion_segundos: number;
  participantes: { id: string; nombre: string }[];
  
  // Datos raw
  frames_faciales: EmotionFrame[];
  frames_corporales: BodyLanguageFrame[];
  microexpresiones: MicroexpresionData[];
  baseline: BaselineEmocional | null;
  
  // Análisis específico por tipo
  analisis: AnalisisCompleto;
  
  // Metadatos
  modelo_version: string;
  procesado_en: string;
  confianza_general: number;
}
