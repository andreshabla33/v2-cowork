'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Users, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Sparkles,
  Mail,
  X,
  Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CargoSelector, CargoLaboral } from './CargoSelector';

interface OnboardingCreadorProps {
  userId: string;
  userEmail: string;
  userName: string;
  onComplete: () => void;
}

type Paso = 'bienvenida' | 'cargo' | 'espacio' | 'invitar' | 'completado';

interface EspacioData {
  nombre: string;
  descripcion: string;
}

export const OnboardingCreador: React.FC<OnboardingCreadorProps> = ({
  userId,
  userEmail,
  userName,
  onComplete
}) => {
  const [paso, setPaso] = useState<Paso>('bienvenida');
  const [cargoSeleccionado, setCargoSeleccionado] = useState<CargoLaboral | null>(null);
  const [espacioData, setEspacioData] = useState<EspacioData>({ nombre: '', descripcion: '' });
  const [invitaciones, setInvitaciones] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [espacioCreado, setEspacioCreado] = useState<{ id: string; nombre: string } | null>(null);

  const handleSelectCargo = (cargo: CargoLaboral) => {
    setCargoSeleccionado(cargo);
    setPaso('espacio');
  };

  const handleCrearEspacio = async () => {
    if (!espacioData.nombre.trim()) {
      setError('El nombre del espacio es requerido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Crear el espacio de trabajo
      const slug = `${espacioData.nombre.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 8)}`;
      
      const { data: espacio, error: espacioError } = await supabase
        .from('espacios_trabajo')
        .insert({
          nombre: espacioData.nombre,
          descripcion: espacioData.descripcion || 'Espacio de trabajo colaborativo',
          slug,
          creado_por: userId
        })
        .select()
        .single();

      if (espacioError) throw espacioError;

      // Crear departamentos por defecto PRIMERO
      const departamentosDefault = [
        { nombre: 'General', color: '#6366f1', icono: 'users' },
        { nombre: 'Desarrollo', color: '#10b981', icono: 'code' },
        { nombre: 'Diseño', color: '#f59e0b', icono: 'palette' },
        { nombre: 'Marketing', color: '#8b5cf6', icono: 'megaphone' },
        { nombre: 'Ventas', color: '#ef4444', icono: 'trending-up' },
        { nombre: 'Soporte', color: '#06b6d4', icono: 'headphones' }
      ];

      const { data: deptData } = await supabase.from('departamentos').insert(
        departamentosDefault.map(d => ({
          ...d,
          espacio_id: espacio.id
        }))
      ).select();

      // Obtener ID del departamento "General" para asignar al creador
      const deptGeneral = deptData?.find(d => d.nombre === 'General');

      // Crear membresía como super_admin con departamento General
      const { error: miembroError } = await supabase
        .from('miembros_espacio')
        .insert({
          espacio_id: espacio.id,
          usuario_id: userId,
          rol: 'super_admin',
          cargo: cargoSeleccionado,
          departamento_id: deptGeneral?.id || null,
          aceptado: true,
          onboarding_completado: true
        });

      if (miembroError) throw miembroError;

      setEspacioCreado({ id: espacio.id, nombre: espacio.nombre });
      setPaso('invitar');
    } catch (err: any) {
      console.error('Error creando espacio:', err);
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
      } else if (err.code === '23503') {
        setError('Error de usuario. Cierra sesión, vuelve a entrar e intenta de nuevo.');
      } else {
        setError(err.message || 'Error al crear el espacio. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = () => {
    setInvitaciones([...invitaciones, '']);
  };

  const handleRemoveEmail = (index: number) => {
    setInvitaciones(invitaciones.filter((_, i) => i !== index));
  };

  const handleEmailChange = (index: number, value: string) => {
    const updated = [...invitaciones];
    updated[index] = value;
    setInvitaciones(updated);
  };

  const handleEnviarInvitaciones = async () => {
    const emailsValidos = invitaciones.filter(e => e.trim() && e.includes('@'));
    
    if (emailsValidos.length === 0) {
      // Si no hay emails, simplemente completar
      setPaso('completado');
      setTimeout(onComplete, 2000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Enviar invitaciones usando la Edge Function
      for (const email of emailsValidos) {
        await supabase.functions.invoke('enviar-invitacion', {
          body: {
            email,
            espacio_id: espacioCreado!.id,
            rol: 'miembro',
            invitador_id: userId
          }
        });
      }

      setPaso('completado');
      setTimeout(onComplete, 2000);
    } catch (err: any) {
      console.error('Error enviando invitaciones:', err);
      setError('Error al enviar algunas invitaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipInvitaciones = () => {
    setPaso('completado');
    setTimeout(onComplete, 2000);
  };

  return (
    <div className="fixed inset-0 bg-[#050508] flex items-center justify-center p-4 lg:p-3 overflow-y-auto min-h-0">
      {/* Fondo con gradientes neon animados - mismo estilo que login */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] rounded-full bg-violet-600/15 blur-[180px] animate-pulse" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full bg-cyan-500/10 blur-[180px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[40%] left-[50%] w-[40%] h-[40%] rounded-full bg-fuchsia-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <AnimatePresence mode="wait">
        {/* PASO: Bienvenida - Compacto */}
        {paso === 'bienvenida' && (
          <motion.div
            key="bienvenida"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md lg:max-w-sm text-center relative z-10"
          >
            <div className="mb-6 lg:mb-5">
              {/* Logo con glow neon */}
              <div className="relative group mx-auto w-14 h-14 lg:w-12 lg:h-12 mb-4 lg:mb-3">
                <div className="absolute -inset-2 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                <div className="relative w-14 h-14 lg:w-12 lg:h-12 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-2xl">
                  <Sparkles className="w-7 h-7 lg:w-6 lg:h-6 text-white" />
                </div>
              </div>
              <h1 className="text-2xl lg:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
                ¡Bienvenido, {userName.split(' ')[0]}!
              </h1>
              <p className="text-sm lg:text-xs text-zinc-400">
                Vamos a configurar tu espacio de trabajo en menos de 2 minutos
              </p>
            </div>

            <div className="space-y-2 lg:space-y-1.5 mb-6 lg:mb-5">
              <div className="flex items-center gap-3 lg:gap-2 p-3 lg:p-2.5 backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-xl lg:rounded-lg group hover:border-violet-500/30 transition-all">
                <div className="w-8 h-8 lg:w-7 lg:h-7 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 rounded-lg flex items-center justify-center border border-violet-500/20">
                  <span className="text-violet-400 font-black text-sm lg:text-xs">1</span>
                </div>
                <span className="text-zinc-300 font-medium text-sm lg:text-xs">Selecciona tu cargo</span>
              </div>
              <div className="flex items-center gap-3 lg:gap-2 p-3 lg:p-2.5 backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-xl lg:rounded-lg group hover:border-violet-500/30 transition-all">
                <div className="w-8 h-8 lg:w-7 lg:h-7 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 rounded-lg flex items-center justify-center border border-violet-500/20">
                  <span className="text-violet-400 font-black text-sm lg:text-xs">2</span>
                </div>
                <span className="text-zinc-300 font-medium text-sm lg:text-xs">Crea tu espacio de trabajo</span>
              </div>
              <div className="flex items-center gap-3 lg:gap-2 p-3 lg:p-2.5 backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-xl lg:rounded-lg group hover:border-violet-500/30 transition-all">
                <div className="w-8 h-8 lg:w-7 lg:h-7 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 rounded-lg flex items-center justify-center border border-violet-500/20">
                  <span className="text-violet-400 font-black text-sm lg:text-xs">3</span>
                </div>
                <span className="text-zinc-300 font-medium text-sm lg:text-xs">Invita a tu equipo</span>
              </div>
            </div>

            <button
              onClick={() => setPaso('cargo')}
              className="relative w-full group overflow-hidden bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 text-white py-3 lg:py-2.5 rounded-xl font-black text-xs lg:text-[10px] uppercase tracking-wider transition-all shadow-2xl shadow-violet-600/30 active:scale-[0.98]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center justify-center gap-2">
                Comenzar
                <ArrowRight className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
              </span>
            </button>
          </motion.div>
        )}

        {/* PASO: Selección de Cargo */}
        {paso === 'cargo' && (
          <motion.div
            key="cargo"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="w-full max-w-4xl"
          >
            <CargoSelector
              onSelect={handleSelectCargo}
              espacioNombre="tu nuevo espacio"
              isLoading={false}
              rolUsuario="super_admin"
            />
          </motion.div>
        )}

        {/* PASO: Crear Espacio */}
        {paso === 'espacio' && (
          <motion.div
            key="espacio"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="w-full max-w-lg relative z-10"
          >
            <button
              onClick={() => setPaso('cargo')}
              className="mb-6 text-zinc-500 hover:text-violet-400 flex items-center gap-2 text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-full text-violet-400 text-xs font-bold uppercase tracking-wider mb-4">
                Paso 2 de 3
              </div>
              <div className="relative group mx-auto w-16 h-16 mb-4">
                <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur-lg opacity-40" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-200 to-white mb-2">Crea tu espacio de trabajo</h2>
              <p className="text-zinc-400">Dale un nombre a tu espacio donde colaborará tu equipo</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Nombre del espacio *
                </label>
                <input
                  type="text"
                  value={espacioData.nombre}
                  onChange={(e) => setEspacioData({ ...espacioData, nombre: e.target.value })}
                  placeholder="Ej: Mi Empresa, Equipo Marketing..."
                  className="w-full px-4 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-white placeholder-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={espacioData.descripcion}
                  onChange={(e) => setEspacioData({ ...espacioData, descripcion: e.target.value })}
                  placeholder="¿De qué trata este espacio?"
                  rows={3}
                  className="w-full px-4 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-white placeholder-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleCrearEspacio}
              disabled={loading || !espacioData.nombre.trim()}
              className="relative w-full group overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-2xl shadow-emerald-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    Crear espacio
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </span>
            </button>
          </motion.div>
        )}

        {/* PASO: Invitar Equipo */}
        {paso === 'invitar' && (
          <motion.div
            key="invitar"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="w-full max-w-lg relative z-10"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-full text-violet-400 text-xs font-bold uppercase tracking-wider mb-4">
                Paso 3 de 3
              </div>
              <div className="relative group mx-auto w-16 h-16 mb-4">
                <div className="absolute -inset-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl blur-lg opacity-40" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">Invita a tu equipo</h2>
              <p className="text-zinc-400">
                Añade los emails de las personas que quieres invitar a <span className="text-violet-400 font-medium">{espacioCreado?.nombre}</span>
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {invitaciones.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      placeholder="email@ejemplo.com"
                      className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/[0.08] rounded-2xl text-white placeholder-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                    />
                  </div>
                  {invitaciones.length > 1 && (
                    <button
                      onClick={() => handleRemoveEmail(index)}
                      className="p-4 bg-black/40 border border-white/[0.08] rounded-2xl text-zinc-500 hover:text-red-400 hover:border-red-500/50 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddEmail}
              className="w-full py-4 border-2 border-dashed border-white/[0.08] rounded-2xl text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 transition-all flex items-center justify-center gap-2 mb-6"
            >
              <Plus className="w-5 h-5" />
              Añadir otro email
            </button>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleEnviarInvitaciones}
                disabled={loading}
                className="relative w-full group overflow-hidden bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-2xl shadow-violet-600/30 active:scale-[0.98] disabled:opacity-50"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar invitaciones
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </span>
              </button>

              <button
                onClick={handleSkipInvitaciones}
                disabled={loading}
                className="w-full py-3 text-zinc-500 hover:text-violet-400 transition-colors text-sm font-medium"
              >
                Omitir por ahora
              </button>
            </div>
          </motion.div>
        )}

        {/* PASO: Completado */}
        {paso === 'completado' && (
          <motion.div
            key="completado"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center relative z-10"
          >
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute -inset-3 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-2xl">
                <Check className="w-12 h-12 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-200 to-white mb-4">¡Todo listo!</h2>
            <p className="text-zinc-300 mb-2">
              Tu espacio <span className="text-emerald-400 font-medium">{espacioCreado?.nombre}</span> está listo
            </p>
            <p className="text-zinc-600 text-sm">Redirigiendo...</p>
            
            <div className="mt-8">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingCreador;
