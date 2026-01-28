/**
 * RecordingTypeSelector v2.0 - Selector de tipo de grabación con UX 2026
 * 
 * Características UX 2026:
 * - Micro-interacciones avanzadas con motion design
 * - Interfaces adaptativas según cargo del usuario
 * - Diseño emocional con feedback visual
 * - Minimalismo con profundidad y capas
 * - Accesibilidad first
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TipoGrabacionDetallado, 
  CargoLaboral,
  CONFIGURACIONES_GRABACION_DETALLADO,
  getTiposGrabacionDisponibles,
  puedeIniciarGrabacionConAnalisis,
  INFO_CARGOS,
  ConfiguracionGrabacion,
} from './types/analysis';

interface RecordingTypeSelectorV2Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tipo: TipoGrabacionDetallado, conAnalisis: boolean) => void;
  cargoUsuario: CargoLaboral;
}

export const RecordingTypeSelectorV2: React.FC<RecordingTypeSelectorV2Props> = ({
  isOpen,
  onClose,
  onSelect,
  cargoUsuario,
}) => {
  const [selectedType, setSelectedType] = useState<TipoGrabacionDetallado | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoveredType, setHoveredType] = useState<TipoGrabacionDetallado | null>(null);

  // Tipos disponibles según cargo
  const tiposDisponibles = useMemo(() => 
    getTiposGrabacionDisponibles(cargoUsuario), 
    [cargoUsuario]
  );
  
  const puedeAnalizar = useMemo(() => 
    puedeIniciarGrabacionConAnalisis(cargoUsuario),
    [cargoUsuario]
  );

  const cargoInfo = INFO_CARGOS[cargoUsuario];

  // Animación de entrada
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTypeClick = (tipo: TipoGrabacionDetallado) => {
    const config = CONFIGURACIONES_GRABACION_DETALLADO[tipo];
    setSelectedType(tipo);
    
    if (config.requiereDisclaimer) {
      setShowDisclaimer(true);
      setDisclaimerAccepted(false);
    } else {
      onSelect(tipo, true);
      resetState();
    }
  };

  const handleDisclaimerAccept = () => {
    if (selectedType) {
      onSelect(selectedType, true);
      resetState();
    }
  };

  const handleDisclaimerCancel = () => {
    setShowDisclaimer(false);
    setSelectedType(null);
    setDisclaimerAccepted(false);
  };

  const handleGrabarSinAnalisis = () => {
    onSelect('equipo', false);
    resetState();
  };

  const resetState = () => {
    setSelectedType(null);
    setShowDisclaimer(false);
    setDisclaimerAccepted(false);
    setHoveredType(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Modal de disclaimer para RRHH
  if (showDisclaimer && selectedType) {
    const config = CONFIGURACIONES_GRABACION_DETALLADO[selectedType];
    
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[400] flex items-center justify-center p-4">
        <div 
          className={`bg-zinc-900 rounded-3xl max-w-lg w-full border border-white/10 shadow-2xl overflow-hidden transform transition-all duration-300 ${
            isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {/* Header con gradiente */}
          <div className={`p-6 bg-gradient-to-r ${config.color} relative overflow-hidden`}>
            {/* Patrón de fondo sutil */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '24px 24px'
              }} />
            </div>
            
            <div className="relative flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <span className="text-4xl">{config.icono}</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-xl">{config.titulo}</h3>
                <p className="text-white/80 text-sm">Análisis conductual avanzado</p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-6">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">⚠️</span>
                <h4 className="text-amber-300 font-semibold">Aviso Legal Importante</h4>
              </div>
              <div className="text-amber-200/90 text-sm leading-relaxed whitespace-pre-wrap pl-9">
                {config.disclaimerTexto}
              </div>
            </div>

            {/* Checkbox de aceptación mejorado */}
            <label className="flex items-start gap-4 cursor-pointer group p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={disclaimerAccepted}
                  onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                  disclaimerAccepted 
                    ? 'bg-green-500 border-green-500 scale-110' 
                    : 'border-white/30 group-hover:border-white/50'
                }`}>
                  {disclaimerAccepted && (
                    <svg className="w-4 h-4 text-white animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-white/80 text-sm leading-relaxed">
                Confirmo que el participante ha sido <strong className="text-white">informado</strong> y ha dado su <strong className="text-white">consentimiento expreso</strong> para el análisis conductual
              </span>
            </label>
          </div>

          {/* Botones */}
          <div className="p-6 pt-0 flex gap-3">
            <button
              onClick={handleDisclaimerCancel}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/80 text-sm transition-all border border-white/10"
            >
              Cancelar
            </button>
            <button
              onClick={handleDisclaimerAccept}
              disabled={!disclaimerAccepted}
              className={`flex-1 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                disclaimerAccepted
                  ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-500/25 cursor-pointer'
                  : 'bg-white/10 cursor-not-allowed opacity-50'
              }`}
            >
              <span className="relative flex h-3 w-3">
                <span className={`${disclaimerAccepted ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-white opacity-75`}></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              Iniciar Grabación
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Selector principal de tipo
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[400] flex items-center justify-center p-4">
      <div 
        className={`bg-zinc-900/95 rounded-3xl max-w-3xl w-full border border-white/10 shadow-2xl overflow-hidden transform transition-all duration-300 ${
          isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-xl mb-1">Iniciar Grabación</h3>
              <p className="text-white/50 text-sm flex items-center gap-2">
                <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs">
                  {cargoInfo.icono} {cargoInfo.nombre}
                </span>
                <span>•</span>
                <span>
                  {puedeAnalizar 
                    ? `${tiposDisponibles.length} tipo${tiposDisponibles.length > 1 ? 's' : ''} de análisis disponible${tiposDisponibles.length > 1 ? 's' : ''}`
                    : 'Solo transcripción disponible'
                  }
                </span>
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Opciones con análisis conductual */}
        {puedeAnalizar && (
          <div className="p-6">
            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px]">🧠</span>
              Con Análisis Conductual
            </h4>
            
            <div className={`grid gap-4 ${
              tiposDisponibles.length === 1 ? 'grid-cols-1 max-w-md' :
              tiposDisponibles.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
              tiposDisponibles.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
              'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
            }`}>
              {tiposDisponibles.map((tipo) => {
                const config = CONFIGURACIONES_GRABACION_DETALLADO[tipo];
                const isHovered = hoveredType === tipo;
                
                return (
                  <button
                    key={tipo}
                    onClick={() => handleTypeClick(tipo)}
                    onMouseEnter={() => setHoveredType(tipo)}
                    onMouseLeave={() => setHoveredType(null)}
                    className={`group relative p-5 rounded-2xl border text-left transition-all duration-300 overflow-hidden ${
                      isHovered 
                        ? `border-transparent bg-gradient-to-br ${config.color} shadow-lg` 
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                    style={{
                      boxShadow: isHovered ? `0 20px 40px -15px ${config.colorAccent}40` : undefined
                    }}
                  >
                    {/* Efecto de brillo en hover */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}>
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent" />
                    </div>
                    
                    {/* Contenido */}
                    <div className="relative">
                      {/* Icono con animación */}
                      <div className={`text-4xl mb-4 transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>
                        {config.icono}
                      </div>
                      
                      {/* Título */}
                      <h4 className="text-white font-bold text-lg mb-1">
                        {config.titulo}
                      </h4>
                      
                      {/* Descripción */}
                      <p className={`text-sm mb-4 transition-colors ${isHovered ? 'text-white/90' : 'text-white/50'}`}>
                        {config.descripcion}
                      </p>

                      {/* Métricas preview con animación escalonada */}
                      <div className="flex flex-wrap gap-1.5">
                        {config.metricas.slice(0, 3).map((metrica, i) => (
                          <span 
                            key={i}
                            className={`px-2 py-1 rounded-lg text-xs transition-all duration-300 ${
                              isHovered 
                                ? 'bg-white/20 text-white' 
                                : 'bg-white/5 text-white/40'
                            }`}
                            style={{ transitionDelay: `${i * 50}ms` }}
                          >
                            {metrica.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {config.metricas.length > 3 && (
                          <span className={`px-2 py-1 rounded-lg text-xs ${
                            isHovered ? 'bg-white/10 text-white/70' : 'bg-white/5 text-white/30'
                          }`}>
                            +{config.metricas.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Badge de disclaimer */}
                      {config.requiereDisclaimer && (
                        <div className="absolute top-0 right-0">
                          <span className={`px-2 py-1 text-xs rounded-lg flex items-center gap-1 transition-colors ${
                            isHovered 
                              ? 'bg-amber-400/30 text-amber-200' 
                              : 'bg-amber-500/10 text-amber-400/80'
                          }`}>
                            ⚠️
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Indicador de acción */}
                    <div className={`absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-all duration-300 ${
                      isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
                    }`}>
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Separador */}
        {puedeAnalizar && (
          <div className="px-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-zinc-900 px-4 text-xs text-white/30 uppercase tracking-wider">o</span>
              </div>
            </div>
          </div>
        )}

        {/* Opción de grabar sin análisis */}
        <div className="p-6">
          <button
            onClick={handleGrabarSinAnalisis}
            className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-2xl">📝</span>
            </div>
            <div className="flex-1">
              <h4 className="text-white font-semibold mb-0.5">Solo Transcripción</h4>
              <p className="text-white/50 text-sm">Grabar sin análisis conductual - Solo texto de la reunión</p>
            </div>
            <div className="text-white/30 group-hover:text-white/60 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="px-6 pb-6">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-start gap-3 text-white/40 text-xs">
              <span className="text-lg">🔒</span>
              <p className="leading-relaxed">
                <strong className="text-white/60">Privacidad garantizada:</strong> Todo el análisis facial y corporal se procesa localmente en tu navegador. 
                No se envían datos biométricos a servidores externos. Solo la transcripción y resumen se almacenan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingTypeSelectorV2;
