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

// Tipo flexible — ahora viene de BD, no es un enum fijo
export type CargoLaboral = string;

// Categorías de cargos para organizar la UI
export type CategoriaCargoInfo = {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  icono: React.ComponentType<{ className?: string }>;
};

// Cargo individual (puede venir de BD o hardcoded como fallback)
export type CargoInfo = {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  icono: React.ComponentType<{ className?: string }>;
  tieneAnalisisAvanzado: boolean;
  analisisDisponibles: string[];
  soloAdmin?: boolean;
};

// Cargo desde BD
export interface CargoDB {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  icono: string;
  orden: number;
  activo: boolean;
  tiene_analisis_avanzado: boolean;
  analisis_disponibles: string[];
  solo_admin: boolean;
}

// Mapeo de nombre de icono (BD) a componente Lucide
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  crown: Crown,
  settings: Settings,
  users: Users,
  'user-check': UserCheck,
  search: Search,
  'trending-up': TrendingUp,
  target: Target,
  briefcase: Briefcase,
  rocket: Rocket,
  package: Package,
  'refresh-cw': RefreshCw,
  user: User,
  'help-circle': HelpCircle,
};

// Colores por categoría
const COLORES_CATEGORIA: Record<string, string> = {
  liderazgo: 'from-amber-500 to-orange-600',
  rrhh: 'from-purple-500 to-pink-600',
  comercial: 'from-emerald-500 to-teal-600',
  producto: 'from-blue-500 to-indigo-600',
  otros: 'from-slate-500 to-gray-600',
  general: 'from-slate-500 to-gray-600',
};

// Nombres de categoría para UI
const NOMBRES_CATEGORIA: Record<string, { nombre: string; descripcion: string }> = {
  liderazgo: { nombre: 'Liderazgo Ejecutivo', descripcion: 'Roles de alta dirección con acceso completo' },
  rrhh: { nombre: 'Recursos Humanos', descripcion: 'Gestión del talento y desarrollo organizacional' },
  comercial: { nombre: 'Área Comercial', descripcion: 'Ventas, negocios y relación con clientes' },
  producto: { nombre: 'Producto y Desarrollo', descripcion: 'Gestión de producto y metodologías ágiles' },
  otros: { nombre: 'Otros Roles', descripcion: 'Colaboradores y roles adicionales' },
  general: { nombre: 'Otros Roles', descripcion: 'Colaboradores y roles adicionales' },
};

// Función para convertir cargos de BD a formato del componente
function cargosDBToCargoInfo(cargosDB: CargoDB[]): CargoInfo[] {
  return cargosDB
    .filter(c => c.activo)
    .sort((a, b) => a.orden - b.orden)
    .map(c => ({
      id: c.nombre.toLowerCase().replace(/\s+/g, '_'),
      nombre: c.nombre,
      descripcion: c.descripcion || '',
      categoria: c.categoria,
      icono: ICON_MAP[c.icono] || User,
      tieneAnalisisAvanzado: c.tiene_analisis_avanzado,
      analisisDisponibles: c.analisis_disponibles || [],
      soloAdmin: c.solo_admin,
    }));
}

// Función para derivar categorías únicas de los cargos
function derivarCategorias(cargos: CargoInfo[]): Record<string, CategoriaCargoInfo> {
  const cats: Record<string, CategoriaCargoInfo> = {};
  const seen = new Set<string>();
  for (const c of cargos) {
    if (seen.has(c.categoria)) continue;
    seen.add(c.categoria);
    const catIcon = ICON_MAP[c.categoria === 'liderazgo' ? 'crown' : c.categoria === 'rrhh' ? 'users' : c.categoria === 'comercial' ? 'trending-up' : c.categoria === 'producto' ? 'package' : 'user'] || User;
    const meta = NOMBRES_CATEGORIA[c.categoria] || { nombre: c.categoria, descripcion: '' };
    cats[c.categoria] = {
      id: c.categoria,
      nombre: meta.nombre,
      descripcion: meta.descripcion,
      color: COLORES_CATEGORIA[c.categoria] || 'from-slate-500 to-gray-600',
      icono: catIcon,
    };
  }
  return cats;
}

interface CargoSelectorProps {
  onSelect: (cargo: string) => void;
  cargoSugerido?: string;
  espacioNombre?: string;
  isLoading?: boolean;
  rolUsuario?: string;
  cargosDB?: CargoDB[];
}

export const CargoSelector: React.FC<CargoSelectorProps> = ({
  onSelect,
  cargoSugerido,
  espacioNombre = 'tu nuevo espacio',
  isLoading = false,
  rolUsuario = 'member',
  cargosDB,
}) => {
  // Convertir cargos de BD a formato interno
  const cargosInfo = cargosDB ? cargosDBToCargoInfo(cargosDB) : [];
  const CATEGORIAS = derivarCategorias(cargosInfo);

  const [cargoSeleccionado, setCargoSeleccionado] = useState<string | null>(
    cargoSugerido || null
  );
  const [categoriaExpandida, setCategoriaExpandida] = useState<string | null>(
    cargoSugerido ? cargosInfo.find(c => c.id === cargoSugerido)?.categoria || null : null
  );
  const [hoveredCargo, setHoveredCargo] = useState<string | null>(null);

  // Filtrar categorías según el rol del usuario (members no ven liderazgo)
  const esMember = rolUsuario === 'member' || rolUsuario === 'miembro';
  const categoriasVisibles = Object.entries(CATEGORIAS).filter(
    ([catId]) => !esMember || catId !== 'liderazgo'
  );

  // Filtrar cargos restringidos para members (solo_admin)
  const cargosPermitidos = esMember
    ? cargosInfo.filter(c => !c.soloAdmin)
    : cargosInfo;

  const handleSelectCargo = useCallback((cargo: string) => {
    setCargoSeleccionado(cargo);
  }, []);

  const handleConfirm = useCallback(() => {
    if (cargoSeleccionado) {
      onSelect(cargoSeleccionado);
    }
  }, [cargoSeleccionado, onSelect]);

  // Usar cargosPermitidos (filtrados según rol) en lugar de CARGOS_INFO
  const cargosPorCategoria = cargosPermitidos.reduce((acc, cargo) => {
    if (!acc[cargo.categoria]) {
      acc[cargo.categoria] = [];
    }
    acc[cargo.categoria].push(cargo);
    return acc;
  }, {} as Record<string, CargoInfo[]>);

  const cargoActual = cargoSeleccionado
    ? cargosPermitidos.find(c => c.id === cargoSeleccionado)
    : null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 overflow-y-auto">
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
            {categoriasVisibles.map(([catId, categoria], index) => {
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
export { ICON_MAP, COLORES_CATEGORIA, NOMBRES_CATEGORIA };
