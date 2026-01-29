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

      // Crear membresía como super_admin
      const { error: miembroError } = await supabase
        .from('miembros_espacio')
        .insert({
          espacio_id: espacio.id,
          usuario_id: userId,
          rol: 'super_admin',
          cargo: cargoSeleccionado,
          aceptado: true,
          onboarding_completado: true
        });

      if (miembroError) throw miembroError;

      // Crear departamentos por defecto
      const departamentosDefault = [
        { nombre: 'General', color: '#6366f1', icono: 'users' },
        { nombre: 'Desarrollo', color: '#10b981', icono: 'code' },
        { nombre: 'Diseño', color: '#f59e0b', icono: 'palette' },
        { nombre: 'Marketing', color: '#8b5cf6', icono: 'megaphone' },
        { nombre: 'Ventas', color: '#ef4444', icono: 'trending-up' },
        { nombre: 'Soporte', color: '#06b6d4', icono: 'headphones' }
      ];

      await supabase.from('departamentos').insert(
        departamentosDefault.map(d => ({
          ...d,
          espacio_id: espacio.id
        }))
      );

      setEspacioCreado({ id: espacio.id, nombre: espacio.nombre });
      setPaso('invitar');
    } catch (err: any) {
      console.error('Error creando espacio:', err);
      setError(err.message || 'Error al crear el espacio');
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
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 overflow-y-auto">
      <AnimatePresence mode="wait">
        {/* PASO: Bienvenida */}
        {paso === 'bienvenida' && (
          <motion.div
            key="bienvenida"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-lg text-center"
          >
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">
                ¡Bienvenido, {userName.split(' ')[0]}!
              </h1>
              <p className="text-xl text-slate-300">
                Vamos a configurar tu espacio de trabajo en menos de 2 minutos
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-400 font-bold">1</span>
                </div>
                <span className="text-slate-300">Selecciona tu cargo</span>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-400 font-bold">2</span>
                </div>
                <span className="text-slate-300">Crea tu espacio de trabajo</span>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-400 font-bold">3</span>
                </div>
                <span className="text-slate-300">Invita a tu equipo</span>
              </div>
            </div>

            <button
              onClick={() => setPaso('cargo')}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
            >
              Comenzar
              <ArrowRight className="w-5 h-5" />
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
            className="w-full max-w-lg"
          >
            <button
              onClick={() => setPaso('cargo')}
              className="mb-6 text-slate-400 hover:text-white flex items-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full text-indigo-400 text-xs font-medium mb-4">
                Paso 2 de 3
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Crea tu espacio de trabajo</h2>
              <p className="text-slate-400">Dale un nombre a tu espacio donde colaborará tu equipo</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre del espacio *
                </label>
                <input
                  type="text"
                  value={espacioData.nombre}
                  onChange={(e) => setEspacioData({ ...espacioData, nombre: e.target.value })}
                  placeholder="Ej: Mi Empresa, Equipo Marketing..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={espacioData.descripcion}
                  onChange={(e) => setEspacioData({ ...espacioData, descripcion: e.target.value })}
                  placeholder="¿De qué trata este espacio?"
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleCrearEspacio}
              disabled={loading || !espacioData.nombre.trim()}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
            className="w-full max-w-lg"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full text-indigo-400 text-xs font-medium mb-4">
                Paso 3 de 3
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Invita a tu equipo</h2>
              <p className="text-slate-400">
                Añade los emails de las personas que quieres invitar a <span className="text-violet-400 font-medium">{espacioCreado?.nombre}</span>
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {invitaciones.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      placeholder="email@ejemplo.com"
                      className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                    />
                  </div>
                  {invitaciones.length > 1 && (
                    <button
                      onClick={() => handleRemoveEmail(index)}
                      className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-red-400 hover:border-red-500/50 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddEmail}
              className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-violet-400 hover:border-violet-500/50 transition-all flex items-center justify-center gap-2 mb-6"
            >
              <Plus className="w-5 h-5" />
              Añadir otro email
            </button>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleEnviarInvitaciones}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
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
              </button>

              <button
                onClick={handleSkipInvitaciones}
                disabled={loading}
                className="w-full py-3 text-slate-400 hover:text-white transition-colors text-sm"
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
            className="w-full max-w-md text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30">
              <Check className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">¡Todo listo!</h2>
            <p className="text-slate-300 mb-2">
              Tu espacio <span className="text-emerald-400 font-medium">{espacioCreado?.nombre}</span> está listo
            </p>
            <p className="text-slate-500 text-sm">Redirigiendo...</p>
            
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
