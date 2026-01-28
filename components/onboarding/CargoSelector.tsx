'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Settings,
  Users,
  UserCheck,
  Search,
  TrendingUp,
  Target,
  Briefcase,
  Rocket,
  Package,
  RefreshCw,
  User,
  HelpCircle,
  Check,
  ChevronRight,
  Sparkles,
  Shield,
} from 'lucide-react';

// Tipos de cargo laboral (sincronizado con Supabase ENUM)
export type CargoLaboral =
  | 'ceo'
  | 'coo'
  | 'director_rrhh'
  | 'coordinador_rrhh'
  | 'reclutador'
  | 'director_comercial'
  | 'coordinador_ventas'
  | 'asesor_comercial'
  | 'manager_equipo'
  | 'team_lead'
  | 'product_owner'
  | 'scrum_master'
  | 'colaborador'
  | 'otro';

// Categorías de cargos para organizar la UI
type CategoriaCargoInfo = {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  icono: React.ComponentType<{ className?: string }>;
};

type CargoInfo = {
  id: CargoLaboral;
  nombre: string;
  descripcion: string;
  categoria: string;
  icono: React.ComponentType<{ className?: string }>;
  tieneAnalisisAvanzado: boolean;
  analisisDisponibles: string[];
};

// Información de categorías
const CATEGORIAS: Record<string, CategoriaCargoInfo> = {
  liderazgo: {
    id: 'liderazgo',
    nombre: 'Liderazgo Ejecutivo',
    descripcion: 'Roles de alta dirección con acceso completo',
    color: 'from-amber-500 to-orange-600',
    icono: Crown,
  },
  rrhh: {
    id: 'rrhh',
    nombre: 'Recursos Humanos',
    descripcion: 'Gestión del talento y desarrollo organizacional',
    color: 'from-purple-500 to-pink-600',
    icono: Users,
  },
  comercial: {
    id: 'comercial',
    nombre: 'Área Comercial',
    descripcion: 'Ventas, negocios y relación con clientes',
    color: 'from-emerald-500 to-teal-600',
    icono: TrendingUp,
  },
  producto: {
    id: 'producto',
    nombre: 'Producto y Desarrollo',
    descripcion: 'Gestión de producto y metodologías ágiles',
    color: 'from-blue-500 to-indigo-600',
    icono: Package,
  },
  general: {
    id: 'general',
    nombre: 'Otros Roles',
    descripcion: 'Colaboradores y roles adicionales',
    color: 'from-slate-500 to-gray-600',
    icono: User,
  },
};

// Información detallada de cada cargo
const CARGOS_INFO: CargoInfo[] = [
  // Liderazgo
  {
    id: 'ceo',
    nombre: 'CEO / Director General',
    descripcion: 'Máxima autoridad ejecutiva de la organización',
    categoria: 'liderazgo',
    icono: Crown,
    tieneAnalisisAvanzado: true,
    analisisDisponibles: ['RRHH', 'Comercial', 'Equipo'],
  },
  {
    id: 'coo',
    nombre: 'COO / Director de Operaciones',
    descripcion: 'Responsable de operaciones y procesos',
    categoria: 'liderazgo',
    icono: Settings,
    tieneAnalisisAvanzado: true,
    analisisDisponibles: ['RRHH', 'Comercial', 'Equipo'],
  },
  // RRHH
  {
    id: 'director_rrhh',
    nombre: 'Director de RRHH',
    descripcion: 'Lidera estrategia de gestión del talento',
    categoria: 'rrhh',
    icono: Users,
    tieneAnalisisAvanzado: true,
    analisisDisponibles: ['Entrevistas', 'One-to-One'],
  },
  {
    id: 'coordinador_rrhh',
    nombre: 'Coordinador de RRHH',
    descripcion: 'Coordina procesos de recursos humanos',
    categoria: 'rrhh',
    icono: UserCheck,
    tieneAnalisisAvanzado: true,
    analisisDisponibles: ['Entrevistas', 'One-to-One'],
  },
  {
    id: 'reclutador',
    nombre: 'Reclutador',
    descripcion: 'Especialista en selección de talento',
    categoria: 'rrhh',
    icono: Search,
    tieneAnalisisAvanzado: true,
    analisisDisponibles: ['Entrevistas a candidatos'],
  },
  // Comercial
  {
    id: 'director_comercial',
    nombre: 'Director Comercial',
    descripcion: 'Lidera estrategia comercial y ventas',
    categoria: 'comercial',
    icono: TrendingUp,
    tieneAnalisisAvanzado: true,
    analisisDisponibles: ['Deals', 'Negociaciones'],
  },
  {
    id: 'coordinador_ventas',
    nombre: 'Coordinador de Ventas',
    descripcion: 'Coordina equipo y procesos de venta',
    categoria: 'comercial',
    icono: Target,
    tieneAnalisisAvanzado: true,
    analisisDisponibles: ['Deals', 'Negociaciones'],
  },
  {
    id: 'asesor_comercial',
    nombre: 'Asesor Comercial',
    descripcion: 'Ejecutivo de ventas y atención a clientes',
    categoria: 'comercial',
    icono: Briefcase,
    tieneAnalisisAvanzado: true,
    analisisDisponibles: ['Deals', 'Negociaciones'],
  },
  // Producto
  {
    id: 'manager_equipo',
    nombre: 'Manager de Equipo',
    descripcion: 'Gestiona y desarrolla equipos de trabajo',
    categoria: 'producto',
    icono: Users,
    tieneAnalisisAvanzado: true,
    analisisDisponibles: ['Reuniones de equipo'],
  },
  {
    id: 'team_lead',
    nombre: 'Team Lead',
    descripcion: 'Líder técnico del equipo',
    categoria: 'producto',
    icono: Rocket,
    tieneAnalisisAvanzado: true,
    analisisDisponibles: ['Reuniones de equipo'],
  },
  {
    id: 'product_owner',
    nombre: 'Product Owner',
    descripcion: 'Responsable de la visión del producto',
    categoria: 'producto',
    icono: Package,
    tieneAnalisisAvanzado: true,
    analisisDisponibles: ['Reuniones de equipo'],
  },
  {
    id: 'scrum_master',
    nombre: 'Scrum Master',
    descripcion: 'Facilita procesos ágiles del equipo',
    categoria: 'producto',
    icono: RefreshCw,
    tieneAnalisisAvanzado: true,
    analisisDisponibles: ['Reuniones de equipo'],
  },
  // General
  {
    id: 'colaborador',
    nombre: 'Colaborador',
    descripcion: 'Miembro activo del equipo',
    categoria: 'general',
    icono: User,
    tieneAnalisisAvanzado: false,
    analisisDisponibles: [],
  },
  {
    id: 'otro',
    nombre: 'Otro cargo',
    descripcion: 'Mi cargo no está en la lista',
    categoria: 'general',
    icono: HelpCircle,
    tieneAnalisisAvanzado: false,
    analisisDisponibles: [],
  },
];

interface CargoSelectorProps {
  onSelect: (cargo: CargoLaboral) => void;
  cargoSugerido?: CargoLaboral;
  espacioNombre?: string;
  isLoading?: boolean;
}

export const CargoSelector: React.FC<CargoSelectorProps> = ({
  onSelect,
  cargoSugerido,
  espacioNombre = 'tu nuevo espacio',
  isLoading = false,
}) => {
  const [cargoSeleccionado, setCargoSeleccionado] = useState<CargoLaboral | null>(
    cargoSugerido || null
  );
  const [categoriaExpandida, setCategoriaExpandida] = useState<string | null>(
    cargoSugerido ? CARGOS_INFO.find(c => c.id === cargoSugerido)?.categoria || null : null
  );
  const [hoveredCargo, setHoveredCargo] = useState<CargoLaboral | null>(null);

  const handleSelectCargo = useCallback((cargo: CargoLaboral) => {
    setCargoSeleccionado(cargo);
  }, []);

  const handleConfirm = useCallback(() => {
    if (cargoSeleccionado) {
      onSelect(cargoSeleccionado);
    }
  }, [cargoSeleccionado, onSelect]);

  const cargosPorCategoria = CARGOS_INFO.reduce((acc, cargo) => {
    if (!acc[cargo.categoria]) {
      acc[cargo.categoria] = [];
    }
    acc[cargo.categoria].push(cargo);
    return acc;
  }, {} as Record<string, CargoInfo[]>);

  const cargoActual = cargoSeleccionado
    ? CARGOS_INFO.find(c => c.id === cargoSeleccionado)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/30"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">
            ¡Bienvenido a {espacioNombre}!
          </h1>
          <p className="text-slate-400 text-lg">
            Para personalizar tu experiencia, cuéntanos cuál es tu cargo en el equipo
          </p>
        </div>

        {/* Categorías y Cargos */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 mb-6">
          <div className="space-y-4">
            {Object.entries(CATEGORIAS).map(([catId, categoria], index) => {
              const cargos = cargosPorCategoria[catId] || [];
              const isExpanded = categoriaExpandida === catId;
              const hasSelectedCargo = cargos.some(c => c.id === cargoSeleccionado);
              const CatIcon = categoria.icono;

              return (
                <motion.div
                  key={catId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Categoría Header */}
                  <button
                    onClick={() => setCategoriaExpandida(isExpanded ? null : catId)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                      isExpanded || hasSelectedCargo
                        ? `bg-gradient-to-r ${categoria.color} text-white shadow-lg`
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isExpanded || hasSelectedCargo ? 'bg-white/20' : 'bg-slate-600'}`}>
                        <CatIcon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">{categoria.nombre}</div>
                        <div className={`text-sm ${isExpanded || hasSelectedCargo ? 'text-white/70' : 'text-slate-400'}`}>
                          {categoria.descripcion}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 transition-transform duration-300 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {/* Cargos dentro de la categoría */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 pl-4">
                          {cargos.map((cargo) => {
                            const CargoIcon = cargo.icono;
                            const isSelected = cargoSeleccionado === cargo.id;
                            const isHovered = hoveredCargo === cargo.id;

                            return (
                              <motion.button
                                key={cargo.id}
                                onClick={() => handleSelectCargo(cargo.id)}
                                onMouseEnter={() => setHoveredCargo(cargo.id)}
                                onMouseLeave={() => setHoveredCargo(null)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`relative p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                                  isSelected
                                    ? 'border-indigo-500 bg-indigo-500/20 shadow-lg shadow-indigo-500/20'
                                    : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`p-2 rounded-lg ${
                                    isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-600 text-slate-300'
                                  }`}>
                                    <CargoIcon className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-medium ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                      {cargo.nombre}
                                    </div>
                                    <div className="text-sm text-slate-400 truncate">
                                      {cargo.descripcion}
                                    </div>
                                    {/* Indicador de análisis avanzado */}
                                    {cargo.tieneAnalisisAvanzado && (
                                      <div className="mt-2 flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-xs text-emerald-400">
                                          Análisis avanzado disponible
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center"
                                    >
                                      <Check className="w-4 h-4 text-white" />
                                    </motion.div>
                                  )}
                                </div>

                                {/* Tooltip con análisis disponibles */}
                                <AnimatePresence>
                                  {isHovered && cargo.analisisDisponibles.length > 0 && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 5 }}
                                      className="absolute left-0 right-0 -bottom-2 translate-y-full z-10 p-3 bg-slate-800 border border-slate-600 rounded-lg shadow-xl"
                                    >
                                      <div className="text-xs text-slate-400 mb-1">Análisis disponibles:</div>
                                      <div className="flex flex-wrap gap-1">
                                        {cargo.analisisDisponibles.map((a, i) => (
                                          <span key={i} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs">
                                            {a}
                                          </span>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer con información y botón */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Info del cargo seleccionado */}
          <div className="flex-1">
            {cargoActual ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 text-slate-300"
              >
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <cargoActual.icono className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Cargo seleccionado:</div>
                  <div className="font-medium text-white">{cargoActual.nombre}</div>
                </div>
              </motion.div>
            ) : (
              <p className="text-sm text-slate-400">
                Selecciona tu cargo para continuar
              </p>
            )}
          </div>

          {/* Botón Continuar */}
          <motion.button
            onClick={handleConfirm}
            disabled={!cargoSeleccionado || isLoading}
            whileHover={{ scale: cargoSeleccionado ? 1.02 : 1 }}
            whileTap={{ scale: cargoSeleccionado ? 0.98 : 1 }}
            className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-300 ${
              cargoSeleccionado
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                Continuar
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </div>

        {/* Nota informativa */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50"
        >
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-400">
              <p className="mb-1">
                <strong className="text-slate-300">¿Por qué es importante?</strong>
              </p>
              <p>
                Tu cargo determina qué funciones de análisis avanzado tendrás disponibles 
                durante las grabaciones de reuniones. Algunos roles tienen acceso a 
                análisis de lenguaje corporal y microexpresiones específicos para su área.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CargoSelector;
export { CARGOS_INFO, CATEGORIAS };
export type { CargoInfo, CategoriaCargoInfo };
