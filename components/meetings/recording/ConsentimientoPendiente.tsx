/**
 * ConsentimientoPendiente - Modal para que el evaluado acepte/rechace grabación
 * Se muestra cuando alguien solicita grabar una entrevista o one-to-one
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStore } from '../../../store/useStore';

interface SolicitudConsentimiento {
  grabacion_id: string;
  tipo_grabacion: string;
  creador_id: string;
  creador_nombre: string;
  espacio_id: string;
  titulo?: string;
}

interface ConsentimientoPendienteProps {
  onConsentimientoRespondido?: (grabacionId: string, acepto: boolean) => void;
}

const TIPO_LABELS: Record<string, { titulo: string; descripcion: string; icono: string }> = {
  rrhh_entrevista: {
    titulo: 'Entrevista de Candidato',
    descripcion: 'Se analizarán tus expresiones faciales y lenguaje corporal para evaluar tu candidatura.',
    icono: '🎯',
  },
  rrhh_one_to_one: {
    titulo: 'Reunión One-to-One',
    descripcion: 'Se realizará un análisis de tu comunicación y engagement durante la sesión.',
    icono: '🤝',
  },
};

export const ConsentimientoPendiente: React.FC<ConsentimientoPendienteProps> = ({
  onConsentimientoRespondido,
}) => {
  const { session } = useStore();
  const [solicitud, setSolicitud] = useState<SolicitudConsentimiento | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResponding, setIsResponding] = useState(false);

  // Escuchar notificaciones de consentimiento
  useEffect(() => {
    if (!session?.user?.id) return;

    const cargarSolicitudesPendientes = async () => {
      // Buscar notificaciones de consentimiento pendientes
      const { data: notificaciones, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', session.user.id)
        .eq('tipo', 'consentimiento_grabacion')
        .eq('leida', false)
        .order('creado_en', { ascending: false })
        .limit(1);

      console.log('🔔 Buscando solicitudes de consentimiento:', { notificaciones, error });

      if (notificaciones && notificaciones.length > 0) {
        const notif = notificaciones[0];
        const datos = notif.datos_extra as any; // Columna correcta: datos_extra
        
        console.log('📩 Notificación encontrada:', notif);
        console.log('📦 Datos extra:', datos);
        
        // Verificar que la grabación aún necesita consentimiento
        const { data: grabacion } = await supabase
          .from('grabaciones')
          .select('id, consentimiento_evaluado, estado')
          .eq('id', notif.entidad_id)
          .single();

        console.log('📹 Estado de grabación:', grabacion);

        // Mostrar si la grabación existe y no tiene consentimiento aún
        if (grabacion && !grabacion.consentimiento_evaluado) {
          setSolicitud({
            grabacion_id: notif.entidad_id,
            tipo_grabacion: datos?.tipo_grabacion || 'rrhh_entrevista',
            creador_id: datos?.creador_id || '',
            creador_nombre: datos?.creador_nombre || 'Alguien',
            espacio_id: notif.espacio_id,
            titulo: notif.titulo,
          });
          console.log('✅ Mostrando modal de consentimiento');
        }
      }
    };

    cargarSolicitudesPendientes();

    // Suscribirse a nuevas notificaciones en tiempo real
    const channel = supabase
      .channel('consentimiento_notificaciones')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${session.user.id}`,
        },
        (payload) => {
          const notif = payload.new as any;
          console.log('🔔 Nueva notificación en tiempo real:', notif);
          if (notif.tipo === 'consentimiento_grabacion') {
            const datos = notif.datos_extra as any; // Columna correcta: datos_extra
            console.log('📦 Datos extra (realtime):', datos);
            setSolicitud({
              grabacion_id: notif.entidad_id,
              tipo_grabacion: datos?.tipo_grabacion || 'rrhh_entrevista',
              creador_id: datos?.creador_id || '',
              creador_nombre: datos?.creador_nombre || 'Alguien',
              espacio_id: notif.espacio_id,
              titulo: notif.titulo,
            });
            console.log('✅ Modal de consentimiento activado via realtime');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const responderConsentimiento = useCallback(async (acepta: boolean) => {
    if (!solicitud) return;

    setIsResponding(true);
    try {
      const { data, error } = await supabase.rpc('responder_consentimiento_grabacion', {
        p_grabacion_id: solicitud.grabacion_id,
        p_acepta: acepta,
      });

      if (error) throw error;

      // Marcar notificación como leída
      await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('entidad_id', solicitud.grabacion_id)
        .eq('tipo', 'consentimiento_grabacion');

      onConsentimientoRespondido?.(solicitud.grabacion_id, acepta);
      setSolicitud(null);
    } catch (err) {
      console.error('Error respondiendo consentimiento:', err);
    } finally {
      setIsResponding(false);
    }
  }, [solicitud, onConsentimientoRespondido]);

  if (!solicitud) return null;

  const tipoInfo = TIPO_LABELS[solicitud.tipo_grabacion] || TIPO_LABELS.rrhh_entrevista;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header con icono grande */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center shadow-lg">
            <span className="text-4xl">{tipoInfo.icono}</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Solicitud de Grabación
          </h2>
          <p className="text-zinc-400 text-sm">
            Se requiere tu consentimiento para continuar
          </p>
        </div>

        {/* Información del solicitante */}
        <div className="bg-zinc-800/50 rounded-2xl p-4 mb-5">
          <p className="text-white text-center">
            <span className="font-bold text-indigo-400">{solicitud.creador_nombre}</span>
            {' '}desea grabarte en una sesión de{' '}
            <span className="font-bold text-amber-400">{tipoInfo.titulo}</span>
          </p>
        </div>

        {/* Disclaimer importante */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <h4 className="text-amber-300 font-bold mb-2">Información Importante</h4>
              <p className="text-amber-200/90 text-sm leading-relaxed">
                {tipoInfo.descripcion}
              </p>
              <ul className="mt-3 space-y-1.5 text-amber-200/80 text-xs">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                  El análisis incluye expresiones faciales y lenguaje corporal
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                  Los resultados serán visibles solo para {solicitud.creador_nombre}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                  Podrás acceder a la transcripción posteriormente
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Lo que recibirás */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
          <h5 className="text-green-400 font-semibold text-sm mb-2">✓ Si aceptas, tendrás acceso a:</h5>
          <ul className="text-green-300/80 text-xs space-y-1">
            <li>• Transcripción completa de la reunión</li>
            <li>• Resumen de los puntos clave discutidos</li>
          </ul>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <button
            onClick={() => responderConsentimiento(false)}
            disabled={isResponding}
            className="flex-1 px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          >
            {isResponding ? '...' : '❌ Rechazar'}
          </button>
          <button
            onClick={() => responderConsentimiento(true)}
            disabled={isResponding}
            className="flex-1 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-green-500/25"
          >
            {isResponding ? 'Procesando...' : '✓ Aceptar Grabación'}
          </button>
        </div>

        {/* Nota de privacidad */}
        <p className="text-center text-zinc-500 text-xs mt-4">
          🔒 Tu decisión se registrará de forma segura
        </p>
      </div>
    </div>
  );
};

export default ConsentimientoPendiente;
