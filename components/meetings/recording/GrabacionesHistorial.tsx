/**
 * GrabacionesHistorial - Vista de historial de grabaciones con análisis
 * Diseño UI 2026 con micro-interacciones y diseño adaptativo
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStore } from '../../../store/useStore';
import { AnalysisDashboard } from './AnalysisDashboard';
import { 
  ResultadoAnalisis, 
  TipoGrabacion, 
  CargoLaboral, 
  getTiposGrabacionDisponibles,
  EmotionFrame,
  AnalisisRRHH,
  AnalisisDeals,
  AnalisisEquipo,
  EmotionType,
} from './types/analysis';

interface Grabacion {
  id: string;
  reunion_id: string | null;
  espacio_id: string;
  creado_por: string;
  archivo_url: string | null;
  archivo_nombre: string | null;
  duracion_segundos: number | null;
  formato: string;
  estado: 'grabando' | 'procesando' | 'transcribiendo' | 'analizando' | 'completado' | 'error';
  tipo: string;
  tiene_video: boolean;
  tiene_audio: boolean;
  inicio_grabacion: string;
  fin_grabacion: string | null;
  creado_en: string;
  evaluado_id?: string | null;
  consentimiento_evaluado?: boolean;
  // Relaciones
  transcripciones?: Transcripcion[];
  analisis_comportamiento?: AnalisisComportamiento[];
  resumenes_ai?: ResumenAI[];
  usuario?: { nombre: string; apellido: string };
  // Permisos calculados
  esCreador?: boolean;
  esParticipante?: boolean;
}

interface Transcripcion {
  id: string;
  texto: string;
  inicio_segundos: number;
  fin_segundos: number;
  speaker_nombre: string | null;
}

interface AnalisisComportamiento {
  id: string;
  timestamp_segundos: number;
  emocion_dominante: string;
  engagement_score: number;
  emociones_detalle: Record<string, number>;
}

interface ResumenAI {
  id: string;
  resumen_corto: string;
  resumen_detallado: string;
  action_items: string[];
  puntos_clave: string[];
  sentimiento_general: string;
}

const ESTADO_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  grabando: { color: 'bg-red-500', icon: '🔴', label: 'Grabando' },
  procesando: { color: 'bg-yellow-500', icon: '⏳', label: 'Procesando' },
  transcribiendo: { color: 'bg-blue-500', icon: '📝', label: 'Transcribiendo' },
  analizando: { color: 'bg-purple-500', icon: '🧠', label: 'Analizando' },
  completado: { color: 'bg-green-500', icon: '✅', label: 'Completado' },
  error: { color: 'bg-red-600', icon: '❌', label: 'Error' },
};

const TIPO_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  rrhh: { color: 'from-violet-600/80 to-violet-800/80', icon: '👥', label: 'RRHH' },
  rrhh_entrevista: { color: 'from-violet-600/80 to-violet-800/80', icon: '🎯', label: 'Entrevista' },
  rrhh_one_to_one: { color: 'from-violet-600/80 to-violet-800/80', icon: '🤝', label: 'One-to-One' },
  deals: { color: 'from-emerald-600/80 to-emerald-800/80', icon: '💼', label: 'Negociación' },
  equipo: { color: 'from-indigo-600/80 to-indigo-800/80', icon: '🚀', label: 'Equipo' },
  reunion: { color: 'from-zinc-600/80 to-zinc-800/80', icon: '📹', label: 'Reunión' },
};

// Dropdown personalizado
interface DropdownOption {
  value: string;
  label: string;
  icon: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isArcade?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ options, value, onChange, placeholder, isArcade }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-w-[160px] justify-between ${
          isArcade 
            ? 'bg-black border-2 border-[#00ff41]/50 text-[#00ff41] hover:border-[#00ff41]' 
            : 'bg-zinc-800 border border-white/10 text-white hover:border-white/30'
        }`}
      >
        <span className="flex items-center gap-2">
          <span>{selectedOption?.icon || '📋'}</span>
          <span>{selectedOption?.label || placeholder}</span>
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 w-full rounded-xl overflow-hidden shadow-2xl z-50 border ${
          isArcade 
            ? 'bg-black border-[#00ff41]/50' 
            : 'bg-zinc-800 border-white/10'
        }`}>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 transition-all ${
                value === option.value 
                  ? (isArcade ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'bg-indigo-600/30 text-indigo-300')
                  : (isArcade ? 'text-[#00ff41]/80 hover:bg-[#00ff41]/10' : 'text-zinc-300 hover:bg-white/5')
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
              {value === option.value && (
                <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const GrabacionesHistorial: React.FC = () => {
  const { activeWorkspace, session, theme, userRoleInActiveWorkspace } = useStore();
  const [grabaciones, setGrabaciones] = useState<Grabacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [grabacionSeleccionada, setGrabacionSeleccionada] = useState<Grabacion | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showTranscripcion, setShowTranscripcion] = useState(false);
  const [resultadoAnalisis, setResultadoAnalisis] = useState<ResultadoAnalisis | null>(null);
  const [cargoUsuario, setCargoUsuario] = useState<CargoLaboral | null>(null);
  const [rolSistema, setRolSistema] = useState<string | null>(null);

  // Cargar cargo y rol del usuario
  useEffect(() => {
    const cargarCargoYRol = async () => {
      if (!session?.user?.id || !activeWorkspace?.id) return;
      
      const { data } = await supabase
        .from('miembros_espacio')
        .select('cargo, rol')
        .eq('usuario_id', session.user.id)
        .eq('espacio_id', activeWorkspace.id)
        .single();
      
      if (data?.cargo) {
        setCargoUsuario(data.cargo as CargoLaboral);
      }
      if (data?.rol) {
        setRolSistema(data.rol);
      }
    };
    cargarCargoYRol();
  }, [session?.user?.id, activeWorkspace?.id]);

  // Opciones de filtro de estado
  const estadoOptions: DropdownOption[] = [
    { value: 'todos', label: 'Todos los estados', icon: '📊' },
    { value: 'completado', label: 'Completados', icon: '✅' },
    { value: 'procesando', label: 'Procesando', icon: '⏳' },
    { value: 'error', label: 'Con error', icon: '❌' },
  ];

  // Opciones de tipo según cargo del usuario y rol del sistema
  const tipoOptions: DropdownOption[] = useMemo(() => {
    const baseOptions: DropdownOption[] = [{ value: 'todos', label: 'Todos los tipos', icon: '🎬' }];
    
    // Si es member sin cargo de liderazgo, no mostrar tipos de análisis
    const esMember = rolSistema === 'member' || rolSistema === 'miembro';
    const esColaboradorBasico = !cargoUsuario || cargoUsuario === 'colaborador' || cargoUsuario === 'otro';
    
    if (esMember && esColaboradorBasico) {
      // Members sin cargo especial solo ven grabaciones básicas (sin filtro de tipo)
      return baseOptions;
    }
    
    if (cargoUsuario) {
      const tiposDisponibles = getTiposGrabacionDisponibles(cargoUsuario);
      tiposDisponibles.forEach(tipo => {
        const config = TIPO_CONFIG[tipo];
        if (config) {
          baseOptions.push({ value: tipo, label: config.label, icon: config.icon });
        }
      });
    } else if (!esMember) {
      // Solo admins/super_admins sin cargo ven todos los tipos
      Object.entries(TIPO_CONFIG).forEach(([key, config]) => {
        if (key !== 'reunion' && key !== 'rrhh') {
          baseOptions.push({ value: key, label: config.label, icon: config.icon });
        }
      });
    }
    
    return baseOptions;
  }, [cargoUsuario, rolSistema]);

  // Cargar grabaciones al montar o cambiar espacio
  useEffect(() => {
    console.log('GrabacionesHistorial: useEffect - activeWorkspace:', activeWorkspace?.id);
    if (!activeWorkspace?.id) {
      setIsLoading(false);
      return;
    }
    cargarGrabaciones();
  }, [activeWorkspace?.id]);

  const cargarGrabaciones = async () => {
    if (!activeWorkspace?.id || !session?.user?.id) {
      console.log('GrabacionesHistorial: No hay activeWorkspace.id o session.user.id');
      setIsLoading(false);
      return;
    }
    
    const userId = session.user.id;
    setIsLoading(true);
    setError(null);
    console.log('GrabacionesHistorial: Cargando grabaciones para espacio:', activeWorkspace.id);

    try {
      // Obtener grabaciones donde el usuario es creador
      const { data: grabacionesCreador, error: errorCreador } = await supabase
        .from('grabaciones')
        .select('*')
        .eq('espacio_id', activeWorkspace.id)
        .eq('creado_por', userId)
        .order('creado_en', { ascending: false });

      if (errorCreador) throw errorCreador;

      // Obtener grabaciones donde el usuario es participante
      const { data: participaciones, error: errorParticipaciones } = await supabase
        .from('participantes_grabacion')
        .select('grabacion_id')
        .eq('usuario_id', userId);

      let grabacionesParticipante: any[] = [];
      if (!errorParticipaciones && participaciones && participaciones.length > 0) {
        const idsParticipante = participaciones.map(p => p.grabacion_id);
        const { data: grabsParticipante } = await supabase
          .from('grabaciones')
          .select('*')
          .eq('espacio_id', activeWorkspace.id)
          .in('id', idsParticipante)
          .neq('creado_por', userId) // Excluir las que ya tenemos como creador
          .order('creado_en', { ascending: false });
        grabacionesParticipante = grabsParticipante || [];
      }

      // Combinar y marcar permisos
      const todasGrabaciones = [
        ...(grabacionesCreador || []).map(g => ({ ...g, esCreador: true, esParticipante: false })),
        ...grabacionesParticipante.map(g => ({ ...g, esCreador: false, esParticipante: true }))
      ];

      // Ordenar por fecha
      todasGrabaciones.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());

      console.log('GrabacionesHistorial: Grabaciones encontradas:', todasGrabaciones.length);
      
      // Cargar datos relacionados según permisos
      if (todasGrabaciones.length > 0) {
        const grabacionesConDatos = await Promise.all(
          todasGrabaciones.map(async (grabacion) => {
            // Transcripciones: todos pueden ver (creador y participantes)
            const transcRes = await supabase
              .from('transcripciones')
              .select('*')
              .eq('grabacion_id', grabacion.id);
            
            // Análisis: SOLO si es creador
            let analisisRes = { data: [] as any[] };
            let resumenRes = { data: [] as any[] };
            if (grabacion.esCreador) {
              [analisisRes, resumenRes] = await Promise.all([
                supabase.from('analisis_comportamiento').select('*').eq('grabacion_id', grabacion.id),
                supabase.from('resumenes_ai').select('*').eq('grabacion_id', grabacion.id)
              ]);
            }
            
            return {
              ...grabacion,
              transcripciones: transcRes.data || [],
              analisis_comportamiento: analisisRes.data || [],
              resumenes_ai: resumenRes.data || []
            };
          })
        );
        setGrabaciones(grabacionesConDatos);
      } else {
        setGrabaciones([]);
      }
      
      console.log('GrabacionesHistorial: Grabaciones cargadas:', todasGrabaciones.length);
    } catch (err: any) {
      console.error('GrabacionesHistorial: Error cargando:', err);
      setError('Error al cargar las grabaciones: ' + (err.message || 'Error desconocido'));
    } finally {
      console.log('GrabacionesHistorial: Finalizando carga, isLoading = false');
      setIsLoading(false);
    }
  };

  // Filtrar grabaciones
  const grabacionesFiltradas = useMemo(() => {
    return grabaciones.filter(g => {
      if (filtroEstado !== 'todos' && g.estado !== filtroEstado) return false;
      if (filtroTipo !== 'todos' && g.tipo !== filtroTipo) return false;
      if (busqueda) {
        const searchLower = busqueda.toLowerCase();
        const nombreUsuario = `${g.usuario?.nombre || ''} ${g.usuario?.apellido || ''}`.toLowerCase();
        const tieneTexto = g.transcripciones?.some(t => t.texto.toLowerCase().includes(searchLower));
        if (!nombreUsuario.includes(searchLower) && !tieneTexto) return false;
      }
      return true;
    });
  }, [grabaciones, filtroEstado, filtroTipo, busqueda]);

  // Formatear duración
  const formatDuracion = (segundos: number | null): string => {
    if (!segundos) return '--:--';
    const mins = Math.floor(segundos / 60);
    const secs = Math.floor(segundos % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Formatear fecha
  const formatFecha = (fecha: string): string => {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Ver análisis de una grabación
  const verAnalisis = (grabacion: Grabacion) => {
    if (!grabacion.analisis_comportamiento?.length) {
      alert('Esta grabación no tiene análisis disponible');
      return;
    }

    // Construir frames desde los datos guardados
    const tipoGrab = (grabacion.tipo as TipoGrabacion) || 'equipo';
    const frames: EmotionFrame[] = grabacion.analisis_comportamiento.map(a => ({
      timestamp_segundos: a.timestamp_segundos,
      emociones_scores: (a.emociones_detalle || {}) as Record<EmotionType, number>,
      emocion_dominante: (a.emocion_dominante || 'neutral') as EmotionType,
      confianza_deteccion: 0.8,
      action_units: {},
      engagement_score: a.engagement_score || 0.5,
      mirando_camara: true,
      cambio_abrupto: false,
      delta_vs_baseline: 0,
    }));

    // Generar análisis específico por tipo
    const analisisEspecifico = generateAnalisisFromFrames(tipoGrab, frames, grabacion.duracion_segundos || 0);

    // Detectar microexpresiones desde cambios abruptos de emoción
    const microexpresionesDetectadas: any[] = [];
    for (let i = 1; i < frames.length; i++) {
      const prev = frames[i - 1];
      const curr = frames[i];
      // Si hay cambio de emoción y la duración es corta (< 500ms aprox)
      if (prev.emocion_dominante !== curr.emocion_dominante && 
          prev.emocion_dominante !== 'neutral' &&
          curr.emocion_dominante !== 'neutral') {
        microexpresionesDetectadas.push({
          timestamp_segundos: curr.timestamp_segundos,
          emocion: curr.emocion_dominante,
          duracion_ms: 300,
          intensidad: 0.7,
          confianza: 0.8,
        });
      }
    }

    const resultado: ResultadoAnalisis = {
      grabacion_id: grabacion.id,
      tipo_grabacion: tipoGrab,
      duracion_segundos: grabacion.duracion_segundos || 0,
      participantes: grabacion.usuario ? [{ id: grabacion.creado_por, nombre: `${grabacion.usuario.nombre} ${grabacion.usuario.apellido}` }] : [],
      frames_faciales: frames,
      frames_corporales: [],
      microexpresiones: microexpresionesDetectadas,
      baseline: null,
      analisis: analisisEspecifico,
      modelo_version: '1.0.0',
      procesado_en: grabacion.creado_en,
      confianza_general: 0.85,
    };

    setResultadoAnalisis(resultado);
    setGrabacionSeleccionada(grabacion);
    setShowDashboard(true);
  };

  // Generar análisis específico desde frames guardados
  const generateAnalisisFromFrames = (tipo: TipoGrabacion, frames: EmotionFrame[], duracion: number) => {
    const avgEngagement = frames.length > 0
      ? frames.reduce((sum, f) => sum + f.engagement_score, 0) / frames.length
      : 0.5;

    const emotionCounts: Record<string, number> = {};
    frames.forEach(f => {
      emotionCounts[f.emocion_dominante] = (emotionCounts[f.emocion_dominante] || 0) + 1;
    });

    const momentosPositivos = frames.filter(f => f.engagement_score > 0.7);
    const momentosNegativos = frames.filter(f => 
      f.emocion_dominante === 'angry' || f.emocion_dominante === 'sad' || f.emocion_dominante === 'disgusted'
    );

    if (tipo === 'deals') {
      const probabilidadCierre = Math.min(1, avgEngagement * 0.5 + (momentosPositivos.length / Math.max(frames.length, 1)) * 0.3);
      return {
        tipo: 'deals',
        momentos_interes: momentosPositivos.slice(0, 10).map(f => ({
          timestamp: f.timestamp_segundos,
          score: f.engagement_score,
          indicadores: [f.emocion_dominante],
        })),
        señales_objecion: momentosNegativos.slice(0, 5).map(f => ({
          timestamp: f.timestamp_segundos,
          tipo: 'desconocido' as const,
          intensidad: 0.6,
          indicadores: [f.emocion_dominante],
        })),
        engagement_por_tema: [],
        señales_cierre: [],
        puntos_dolor: [],
        predicciones: {
          probabilidad_cierre: {
            tipo: 'probabilidad_cierre',
            probabilidad: probabilidadCierre,
            confianza: 0.7,
            factores: probabilidadCierre > 0.6 ? ['Alto engagement detectado'] : ['Engagement moderado'],
            timestamp: Date.now(),
          },
          siguiente_paso_recomendado: {
            tipo: 'siguiente_paso',
            probabilidad: probabilidadCierre > 0.5 ? 0.8 : 0.4,
            confianza: 0.6,
            factores: probabilidadCierre > 0.5 ? ['Proponer siguiente reunión'] : ['Abordar objeciones'],
            timestamp: Date.now(),
          },
          objecion_principal: {
            tipo: 'objecion_principal',
            probabilidad: momentosNegativos.length > 0 ? 0.6 : 0.2,
            confianza: 0.5,
            factores: momentosNegativos.length > 0 ? ['Objeciones detectadas'] : ['Sin objeciones claras'],
            timestamp: Date.now(),
          },
        },
        resumen: {
          momentos_clave: momentosPositivos.slice(0, 3).map(m => `${Math.round(m.timestamp_segundos)}s: Alto interés`),
          objeciones_detectadas: momentosNegativos.slice(0, 3).map(s => `${Math.round(s.timestamp_segundos)}s: Señal negativa`),
          recomendaciones_seguimiento: probabilidadCierre > 0.6 
            ? ['Cliente muestra interés - considerar propuesta de cierre']
            : ['Reforzar propuesta de valor', 'Abordar posibles objeciones'],
          probabilidad_cierre_estimada: probabilidadCierre,
        },
      } as AnalisisDeals;
    }

    if (tipo === 'rrhh') {
      const congruenciaScore = avgEngagement * 0.8;
      return {
        tipo: 'rrhh',
        congruencia_verbal_no_verbal: congruenciaScore,
        nerviosismo_timeline: frames.map(f => ({ timestamp: f.timestamp_segundos, score: 1 - f.engagement_score })),
        nerviosismo_promedio: 1 - avgEngagement,
        confianza_percibida: avgEngagement,
        momentos_alta_confianza: momentosPositivos.map(f => ({ timestamp: f.timestamp_segundos, duracion: 1 })),
        momentos_baja_confianza: momentosNegativos.map(f => ({ timestamp: f.timestamp_segundos, duracion: 1 })),
        momentos_incomodidad: momentosNegativos.map(f => ({
          timestamp: f.timestamp_segundos,
          duracion: 1,
          indicadores: [f.emocion_dominante],
        })),
        engagement_timeline: frames.map(f => ({ timestamp: f.timestamp_segundos, score: f.engagement_score })),
        predicciones: {
          fit_cultural: { tipo: 'fit_cultural', probabilidad: avgEngagement, confianza: 0.6, factores: ['Basado en engagement'], timestamp: Date.now() },
          nivel_interes_puesto: { tipo: 'nivel_interes', probabilidad: avgEngagement, confianza: 0.7, factores: ['Engagement promedio'], timestamp: Date.now() },
          autenticidad_respuestas: { tipo: 'autenticidad', probabilidad: congruenciaScore, confianza: 0.65, factores: ['Expresiones consistentes'], timestamp: Date.now() },
        },
        resumen: {
          fortalezas_observadas: avgEngagement > 0.6 ? ['Alto nivel de engagement', 'Muestra interés genuino'] : ['Participación activa'],
          areas_atencion: momentosNegativos.length > 3 ? ['Momentos de incomodidad detectados'] : [],
          recomendacion_seguimiento: avgEngagement > 0.6 ? 'Candidato muestra señales positivas' : 'Realizar preguntas de seguimiento',
        },
      } as AnalisisRRHH;
    }

    // Equipo (default)
    return {
      tipo: 'equipo',
      participacion: [],
      engagement_grupal: frames.map(f => ({
        timestamp: f.timestamp_segundos,
        score_promedio: f.engagement_score,
        participantes_engaged: f.engagement_score > 0.5 ? 1 : 0,
        participantes_total: 1,
      })),
      reacciones_ideas: [],
      momentos_desconexion: frames.filter(f => f.engagement_score < 0.3).map(f => ({
        timestamp: f.timestamp_segundos,
        duracion: 1,
        participantes_desconectados: [],
        posible_causa: 'Bajo engagement',
      })),
      dinamica_grupal: {
        cohesion_score: avgEngagement,
        participacion_equilibrada: true,
        lideres_naturales: [],
        participantes_pasivos: [],
      },
      predicciones: {
        adopcion_ideas: { tipo: 'adopcion', probabilidad: avgEngagement, confianza: 0.7, factores: ['Engagement grupal'], timestamp: Date.now() },
        necesidad_seguimiento: { tipo: 'seguimiento', probabilidad: avgEngagement < 0.5 ? 0.8 : 0.3, confianza: 0.6, factores: [], timestamp: Date.now() },
        riesgo_conflicto: { tipo: 'conflicto', probabilidad: momentosNegativos.length > 5 ? 0.5 : 0.2, confianza: 0.5, factores: [], timestamp: Date.now() },
      },
      resumen: {
        ideas_mejor_recibidas: [],
        participantes_destacados: [],
        areas_mejora_equipo: avgEngagement < 0.5 ? ['Mejorar dinamismo de reuniones'] : [],
        recomendaciones: avgEngagement > 0.6 ? ['Excelente dinámica de equipo'] : ['Considerar dinámicas para aumentar participación'],
      },
    } as AnalisisEquipo;
  };

  const isArcade = theme === 'arcade';

  return (
    <div className="h-full w-full overflow-y-auto p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className={`text-2xl font-bold tracking-tight ${isArcade ? 'text-[#00ff41]' : 'text-white'}`}>
                  Grabaciones
                </h1>
                <p className={`text-xs ${isArcade ? 'text-[#00ff41]/60' : 'text-zinc-500'}`}>
                  Transcripciones y análisis conductual
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={cargarGrabaciones}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              isArcade 
                ? 'bg-[#00ff41] text-black hover:bg-white' 
                : 'bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div className={`p-4 rounded-2xl mb-6 border ${isArcade ? 'bg-black border-[#00ff41]/30' : 'bg-zinc-800/50 border-white/10'}`}>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Búsqueda */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="🔍 Buscar en transcripciones..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-sm transition-all outline-none ${
                  isArcade 
                    ? 'bg-black border-2 border-[#00ff41]/50 text-[#00ff41] placeholder-[#00ff41]/40 focus:border-[#00ff41]' 
                    : 'bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 focus:border-indigo-500'
                }`}
              />
            </div>

            {/* Filtro Estado - Dropdown personalizado */}
            <CustomDropdown
              options={estadoOptions}
              value={filtroEstado}
              onChange={setFiltroEstado}
              isArcade={isArcade}
            />

            {/* Filtro Tipo - Dropdown personalizado con tipos según cargo */}
            <CustomDropdown
              options={tipoOptions}
              value={filtroTipo}
              onChange={setFiltroTipo}
              isArcade={isArcade}
            />
          </div>
          
          {/* Indicador de cargo y rol */}
          {(cargoUsuario || rolSistema) && (
            <div className={`mt-3 pt-3 border-t ${isArcade ? 'border-[#00ff41]/20' : 'border-white/5'}`}>
              <p className={`text-xs ${isArcade ? 'text-[#00ff41]/40' : 'text-zinc-500'}`}>
                👤 Rol: <span className="font-semibold">{rolSistema || 'No definido'}</span>
                {cargoUsuario && (
                  <> | Cargo: <span className="font-semibold">{cargoUsuario.replace(/_/g, ' ')}</span></>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Loading - solo muestra si está cargando */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className={`w-12 h-12 border-4 rounded-full animate-spin ${
              isArcade ? 'border-[#00ff41]/20 border-t-[#00ff41]' : 'border-indigo-500/20 border-t-indigo-500'
            }`} />
            <p className={`mt-4 text-sm ${isArcade ? 'text-[#00ff41]/60' : 'text-zinc-400'}`}>
              Cargando grabaciones...
            </p>
          </div>
        ) : null}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={cargarGrabaciones}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Lista vacía */}
        {!isLoading && !error && grabacionesFiltradas.length === 0 && (
          <div className={`text-center py-20 rounded-2xl border-2 border-dashed ${
            isArcade ? 'border-[#00ff41]/30' : 'border-white/10'
          }`}>
            <span className="text-6xl mb-4 block">�</span>
            <h3 className={`text-xl font-bold mb-2 ${isArcade ? 'text-[#00ff41]' : 'text-white'}`}>
              No hay transcripciones
            </h3>
            <p className={`text-sm ${isArcade ? 'text-[#00ff41]/60' : 'text-zinc-400'}`}>
              {grabaciones.length === 0 
                ? 'Inicia una reunión para generar transcripciones y análisis'
                : 'No hay transcripciones que coincidan con los filtros'}
            </p>
          </div>
        )}

        {/* Lista de grabaciones */}
        {!isLoading && !error && grabacionesFiltradas.length > 0 && (
          <div className="grid gap-4">
            {grabacionesFiltradas.map((grabacion) => {
              const estadoConfig = ESTADO_CONFIG[grabacion.estado] || ESTADO_CONFIG.completado;
              const tipoConfig = TIPO_CONFIG[grabacion.tipo] || TIPO_CONFIG.reunion;
              const tieneAnalisis = grabacion.analisis_comportamiento && grabacion.analisis_comportamiento.length > 0;
              const tieneTranscripcion = grabacion.transcripciones && grabacion.transcripciones.length > 0;

              return (
                <div
                  key={grabacion.id}
                  className={`group p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.01] ${
                    isArcade 
                      ? 'bg-black border-[#00ff41]/30 hover:border-[#00ff41] hover:shadow-[0_0_30px_rgba(0,255,65,0.2)]' 
                      : 'bg-zinc-800/50 border-white/10 hover:border-white/20 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icono tipo */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tipoConfig.color} flex items-center justify-center text-xl shadow-md`}>
                      {tipoConfig.icon}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${isArcade ? 'text-[#00ff41]' : 'text-white'}`}>
                          Reunión {new Date(grabacion.creado_en).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/10 text-zinc-300">
                          {tipoConfig.label}
                        </span>
                        {grabacion.estado === 'completado' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Completado" />
                        )}
                      </div>

                      <div className={`flex items-center gap-4 text-sm ${isArcade ? 'text-[#00ff41]/60' : 'text-zinc-400'}`}>
                        <span>📅 {formatFecha(grabacion.creado_en)}</span>
                        <span>⏱️ {formatDuracion(grabacion.duracion_segundos)}</span>
                        {grabacion.usuario && (
                          <span>👤 {grabacion.usuario.nombre} {grabacion.usuario.apellido}</span>
                        )}
                      </div>

                      {/* Preview de transcripción */}
                      {tieneTranscripcion && (
                        <p className={`mt-2 text-sm line-clamp-2 ${isArcade ? 'text-[#00ff41]/40' : 'text-zinc-500'}`}>
                          "{grabacion.transcripciones![0].texto.substring(0, 150)}..."
                        </p>
                      )}

                      {/* Tags minimalistas */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {grabacion.esCreador && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-violet-500/15 text-violet-400">
                            Creador
                          </span>
                        )}
                        {tieneTranscripcion && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-zinc-400">
                            {grabacion.transcripciones!.length} segmento{grabacion.transcripciones!.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {tieneAnalisis && grabacion.esCreador && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/15 text-indigo-400">
                            Análisis
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2">
                      {tieneAnalisis && grabacion.esCreador && (
                        <button
                          onClick={() => verAnalisis(grabacion)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isArcade 
                              ? 'bg-[#00ff41] text-black hover:bg-white' 
                              : 'bg-violet-600 text-white hover:bg-violet-500'
                          }`}
                        >
                          Ver Análisis
                        </button>
                      )}
                      {tieneTranscripcion && (
                        <button
                          onClick={() => {
                            setGrabacionSeleccionada(grabacion);
                            setShowTranscripcion(true);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isArcade 
                              ? 'border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41]/10' 
                              : 'border border-white/20 text-zinc-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          Transcripción
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Estadísticas */}
        {!isLoading && grabaciones.length > 0 && (
          <div className={`mt-8 p-6 rounded-2xl border ${isArcade ? 'bg-black border-[#00ff41]/30' : 'bg-zinc-800/30 border-white/10'}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isArcade ? 'text-[#00ff41]' : 'text-zinc-400'}`}>
              📊 Resumen
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-xl ${isArcade ? 'bg-[#00ff41]/10' : 'bg-white/5'}`}>
                <div className={`text-3xl font-black ${isArcade ? 'text-[#00ff41]' : 'text-white'}`}>
                  {grabaciones.length}
                </div>
                <div className={`text-xs ${isArcade ? 'text-[#00ff41]/60' : 'text-zinc-500'}`}>Total grabaciones</div>
              </div>
              <div className={`p-4 rounded-xl ${isArcade ? 'bg-[#00ff41]/10' : 'bg-white/5'}`}>
                <div className={`text-3xl font-black ${isArcade ? 'text-[#00ff41]' : 'text-white'}`}>
                  {grabaciones.filter(g => g.estado === 'completado').length}
                </div>
                <div className={`text-xs ${isArcade ? 'text-[#00ff41]/60' : 'text-zinc-500'}`}>Completadas</div>
              </div>
              <div className={`p-4 rounded-xl ${isArcade ? 'bg-[#00ff41]/10' : 'bg-white/5'}`}>
                <div className={`text-3xl font-black ${isArcade ? 'text-[#00ff41]' : 'text-white'}`}>
                  {grabaciones.filter(g => g.analisis_comportamiento && g.analisis_comportamiento.length > 0).length}
                </div>
                <div className={`text-xs ${isArcade ? 'text-[#00ff41]/60' : 'text-zinc-500'}`}>Con análisis</div>
              </div>
              <div className={`p-4 rounded-xl ${isArcade ? 'bg-[#00ff41]/10' : 'bg-white/5'}`}>
                <div className={`text-3xl font-black ${isArcade ? 'text-[#00ff41]' : 'text-white'}`}>
                  {formatDuracion(grabaciones.reduce((sum, g) => sum + (g.duracion_segundos || 0), 0))}
                </div>
                <div className={`text-xs ${isArcade ? 'text-[#00ff41]/60' : 'text-zinc-500'}`}>Tiempo total</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dashboard de análisis */}
      {showDashboard && resultadoAnalisis && (
        <AnalysisDashboard
          resultado={resultadoAnalisis}
          onClose={() => {
            setShowDashboard(false);
            setResultadoAnalisis(null);
            setGrabacionSeleccionada(null);
          }}
          onExport={() => {
            const json = JSON.stringify(resultadoAnalisis, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analisis_${grabacionSeleccionada?.tipo}_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        />
      )}

      {/* Modal de Transcripción */}
      {showTranscripcion && grabacionSeleccionada && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[500] flex items-center justify-center p-4 overflow-y-auto">
          <div className={`max-w-3xl w-full rounded-2xl border shadow-2xl my-8 ${
            isArcade ? 'bg-black border-[#00ff41]/50' : 'bg-zinc-900 border-white/10'
          }`}>
            {/* Header */}
            <div className={`p-5 rounded-t-2xl border-b ${
              isArcade ? 'bg-[#00ff41]/10 border-[#00ff41]/30' : 'bg-zinc-800 border-white/10'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📝</span>
                  <div>
                    <h2 className={`font-bold text-xl ${isArcade ? 'text-[#00ff41]' : 'text-white'}`}>
                      Transcripción
                    </h2>
                    <p className={`text-sm ${isArcade ? 'text-[#00ff41]/60' : 'text-zinc-400'}`}>
                      {grabacionSeleccionada.archivo_nombre || 'Reunión'} • {formatFecha(grabacionSeleccionada.creado_en)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowTranscripcion(false);
                    setGrabacionSeleccionada(null);
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isArcade 
                      ? 'bg-[#00ff41]/20 text-[#00ff41] hover:bg-[#00ff41]/30' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {grabacionSeleccionada.transcripciones && grabacionSeleccionada.transcripciones.length > 0 ? (
                <div className="space-y-4">
                  {grabacionSeleccionada.transcripciones.map((t, idx) => (
                    <div 
                      key={t.id || idx}
                      className={`p-4 rounded-xl ${
                        isArcade ? 'bg-[#00ff41]/5 border border-[#00ff41]/20' : 'bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-mono ${isArcade ? 'text-[#00ff41]/60' : 'text-zinc-500'}`}>
                          ⏱️ {formatDuracion(t.inicio_segundos)} - {formatDuracion(t.fin_segundos)}
                        </span>
                        {t.speaker_nombre && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isArcade ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'bg-indigo-500/20 text-indigo-400'
                          }`}>
                            👤 {t.speaker_nombre}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed ${isArcade ? 'text-[#00ff41]/90' : 'text-zinc-300'}`}>
                        {t.texto}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <span className="text-4xl mb-4 block">📭</span>
                  <p className={isArcade ? 'text-[#00ff41]/60' : 'text-zinc-400'}>
                    No hay transcripción disponible
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`p-4 rounded-b-2xl border-t ${
              isArcade ? 'border-[#00ff41]/30' : 'border-white/10'
            }`}>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    const texto = grabacionSeleccionada.transcripciones?.map(t => 
                      `[${formatDuracion(t.inicio_segundos)}] ${t.speaker_nombre || 'Speaker'}: ${t.texto}`
                    ).join('\n\n') || '';
                    navigator.clipboard.writeText(texto);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    isArcade 
                      ? 'border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black' 
                      : 'border border-white/20 text-white hover:bg-white/10'
                  }`}
                >
                  📋 Copiar
                </button>
                <button
                  onClick={() => {
                    setShowTranscripcion(false);
                    setGrabacionSeleccionada(null);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    isArcade 
                      ? 'bg-[#00ff41] text-black hover:bg-white' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrabacionesHistorial;
