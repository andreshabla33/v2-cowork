/**
 * GrabacionesHistorial - Vista de historial de grabaciones con análisis
 * Diseño UI 2026 con micro-interacciones y diseño adaptativo
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStore } from '../../../store/useStore';
import { AnalysisDashboard } from './AnalysisDashboard';
import { ResultadoAnalisis, TipoGrabacion, CargoLaboral, getTiposGrabacionDisponibles } from './types/analysis';

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
  // Relaciones
  transcripciones?: Transcripcion[];
  analisis_comportamiento?: AnalisisComportamiento[];
  resumenes_ai?: ResumenAI[];
  usuario?: { nombre: string; apellido: string };
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
  rrhh: { color: 'from-purple-500 to-pink-600', icon: '👥', label: 'RRHH' },
  rrhh_entrevista: { color: 'from-purple-500 to-pink-600', icon: '🎯', label: 'Entrevista' },
  rrhh_one_to_one: { color: 'from-purple-500 to-pink-600', icon: '🤝', label: 'One-to-One' },
  deals: { color: 'from-emerald-500 to-teal-600', icon: '💼', label: 'Deal/Negociación' },
  equipo: { color: 'from-blue-500 to-indigo-600', icon: '🚀', label: 'Equipo' },
  reunion: { color: 'from-slate-500 to-gray-600', icon: '📹', label: 'Reunión' },
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
    if (!activeWorkspace?.id) {
      console.log('GrabacionesHistorial: No hay activeWorkspace.id');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    console.log('GrabacionesHistorial: Cargando grabaciones para espacio:', activeWorkspace.id);

    try {
      // Primero intentar consulta simple
      const { data, error: fetchError } = await supabase
        .from('grabaciones')
        .select('*')
        .eq('espacio_id', activeWorkspace.id)
        .order('creado_en', { ascending: false });

      console.log('GrabacionesHistorial: Respuesta:', { data, error: fetchError });

      if (fetchError) {
        console.error('GrabacionesHistorial: Error en query:', fetchError);
        throw fetchError;
      }
      
      // Si hay grabaciones, cargar datos relacionados
      if (data && data.length > 0) {
        // Cargar transcripciones y análisis por separado
        const grabacionesConDatos = await Promise.all(
          data.map(async (grabacion) => {
            const [transcRes, analisisRes, resumenRes] = await Promise.all([
              supabase.from('transcripciones').select('*').eq('grabacion_id', grabacion.id),
              supabase.from('analisis_comportamiento').select('*').eq('grabacion_id', grabacion.id),
              supabase.from('resumenes_ai').select('*').eq('grabacion_id', grabacion.id)
            ]);
            
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
      
      console.log('GrabacionesHistorial: Grabaciones cargadas:', data?.length || 0);
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

    // Construir resultado para el dashboard
    const tipoGrab = (grabacion.tipo as TipoGrabacion) || 'equipo';
    const resultado: ResultadoAnalisis = {
      grabacion_id: grabacion.id,
      tipo_grabacion: tipoGrab,
      duracion_segundos: grabacion.duracion_segundos || 0,
      participantes: grabacion.usuario ? [{ id: grabacion.creado_por, nombre: `${grabacion.usuario.nombre} ${grabacion.usuario.apellido}` }] : [],
      frames_faciales: grabacion.analisis_comportamiento.map(a => ({
        timestamp_segundos: a.timestamp_segundos,
        emociones_scores: a.emociones_detalle as any || {},
        emocion_dominante: a.emocion_dominante as any,
        confianza_deteccion: 0.8,
        action_units: {},
        engagement_score: a.engagement_score,
        mirando_camara: true,
        cambio_abrupto: false,
        delta_vs_baseline: 0,
      })),
      frames_corporales: [],
      microexpresiones: [],
      baseline: null,
      analisis: {
        tipo: tipoGrab,
      } as any,
      modelo_version: '1.0.0',
      procesado_en: grabacion.creado_en,
      confianza_general: 0.85,
    };

    setResultadoAnalisis(resultado);
    setGrabacionSeleccionada(grabacion);
    setShowDashboard(true);
  };

  const isArcade = theme === 'arcade';

  return (
    <div className="h-full w-full overflow-y-auto p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-black uppercase tracking-tight ${isArcade ? 'text-[#00ff41]' : 'text-white'}`}>
              📹 Grabaciones
            </h1>
            <p className={`text-sm mt-1 ${isArcade ? 'text-[#00ff41]/60' : 'text-zinc-400'}`}>
              Historial de reuniones grabadas con transcripciones y análisis
            </p>
          </div>
          <button
            onClick={cargarGrabaciones}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              isArcade 
                ? 'bg-[#00ff41] text-black hover:bg-white' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            🔄 Actualizar
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
            <span className="text-6xl mb-4 block">📹</span>
            <h3 className={`text-xl font-bold mb-2 ${isArcade ? 'text-[#00ff41]' : 'text-white'}`}>
              No hay grabaciones
            </h3>
            <p className={`text-sm ${isArcade ? 'text-[#00ff41]/60' : 'text-zinc-400'}`}>
              {grabaciones.length === 0 
                ? 'Inicia una reunión y grábala para ver el análisis aquí'
                : 'No hay grabaciones que coincidan con los filtros'}
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
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tipoConfig.color} flex items-center justify-center text-2xl shadow-lg`}>
                      {tipoConfig.icon}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className={`font-bold text-lg ${isArcade ? 'text-[#00ff41]' : 'text-white'}`}>
                          {tipoConfig.label}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${estadoConfig.color} text-white`}>
                          {estadoConfig.icon} {estadoConfig.label}
                        </span>
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

                      {/* Badges */}
                      <div className="flex items-center gap-2 mt-3">
                        {tieneTranscripcion && (
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            isArcade ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            📝 {grabacion.transcripciones!.length} segmentos
                          </span>
                        )}
                        {tieneAnalisis && (
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            isArcade ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            🧠 Análisis disponible
                          </span>
                        )}
                        {grabacion.resumenes_ai && grabacion.resumenes_ai.length > 0 && (
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            isArcade ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            ✨ Resumen AI
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-2">
                      {tieneAnalisis && (
                        <button
                          onClick={() => verAnalisis(grabacion)}
                          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            isArcade 
                              ? 'bg-[#00ff41] text-black hover:bg-white' 
                              : 'bg-indigo-600 text-white hover:bg-indigo-500'
                          }`}
                        >
                          📊 Ver Análisis
                        </button>
                      )}
                      {tieneTranscripcion && (
                        <button
                          onClick={() => {
                            setGrabacionSeleccionada(grabacion);
                            // Aquí se podría abrir un modal de transcripción
                          }}
                          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            isArcade 
                              ? 'border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black' 
                              : 'border border-white/20 text-white hover:bg-white/10'
                          }`}
                        >
                          📝 Transcripción
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
    </div>
  );
};

export default GrabacionesHistorial;
