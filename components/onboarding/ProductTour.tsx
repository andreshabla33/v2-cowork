import React, { useEffect, useState, useCallback } from 'react';
import { driver, type DriveStep, type Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../styles/driver-tour.css';
import { supabase } from '../../lib/supabase';

interface ProductTourProps {
  espacioId: string;
  userId: string;
  rol: string;
  miembroId?: string;
}

interface TourState {
  tour_completado: boolean;
  tour_veces_mostrado: number;
  tour_no_mostrar: boolean;
}

const PASOS_GENERALES: DriveStep[] = [
  {
    element: '[data-tour-step="space-canvas"]',
    popover: {
      title: '🌐 Tu espacio virtual',
      description: 'Aquí es donde tu equipo trabaja en tiempo real. Muévete con las flechas del teclado o WASD. Acércate a alguien para hablar.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour-step="sidebar-nav"]',
    popover: {
      title: '📍 Navegación',
      description: 'Accede a las diferentes secciones: espacio virtual, chat, tareas y grabaciones.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour-step="mic-btn"]',
    popover: {
      title: '🎤 Micrófono',
      description: 'Activa o silencia tu micrófono. El audio es espacial: se escucha más fuerte cuando estás cerca de alguien.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour-step="cam-btn"]',
    popover: {
      title: '📷 Cámara',
      description: 'Activa tu cámara para que tu equipo te vea. Puedes configurar efectos de fondo desde el menú.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour-step="chat-btn"]',
    popover: {
      title: '💬 Chat',
      description: 'Envía mensajes a tu equipo. Los mensajes también aparecen como burbujas sobre los avatares.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour-step="recording-btn"]',
    popover: {
      title: '🔴 Grabar reunión',
      description: 'Graba reuniones para obtener análisis conductual automático con inteligencia artificial.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour-step="sidebar-chat"]',
    popover: {
      title: '📨 Mensajes',
      description: 'Panel de conversaciones. Chats directos y grupales con tu equipo.',
      side: 'right',
      align: 'center',
    },
  },
  {
    element: '[data-tour-step="settings-btn"]',
    popover: {
      title: '⚙️ Configuración',
      description: 'Personaliza audio, video, espacio 3D, notificaciones, privacidad y mucho más.',
      side: 'right',
      align: 'end',
    },
  },
  {
    element: '[data-tour-step="avatar-area"]',
    popover: {
      title: '🧍 Tu Avatar',
      description: 'Este eres t\u00FA en el espacio virtual. Haz doble clic en cualquier lugar del espacio para mover tu avatar autom\u00E1ticamente hasta ese punto.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour-step="viben-btn"]',
    popover: {
      title: '🤖 Mónica AI',
      description: 'Tu asistente de inteligencia artificial. Pregúntale lo que necesites sobre el espacio.',
      side: 'bottom',
      align: 'end',
    },
  },
];

const PASOS_ADMIN: DriveStep[] = [
  {
    element: '[data-tour-step="games-btn"]',
    popover: {
      title: '🎮 Mini Juegos (🚧 En construcci\u00F3n)',
      description: 'Pr\u00F3ximamente: juega con tu equipo para fortalecer la cultura. Ajedrez, trivia y m\u00E1s. \u00A1Estamos trabajando en ello!',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour-step="theme-selector"]',
    popover: {
      title: '🎨 Temas visuales',
      description: 'Como admin, puedes cambiar el tema visual del espacio: Dark, Light, Space o Arcade.',
      side: 'bottom',
      align: 'center',
    },
  },
];

export const ProductTour: React.FC<ProductTourProps> = ({
  espacioId,
  userId,
  rol,
  miembroId,
}) => {
  const [tourState, setTourState] = useState<TourState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tourStarted, setTourStarted] = useState(false);

  const isAdmin = rol === 'super_admin' || rol === 'admin';

  // Cargar estado del tour desde Supabase
  const cargarEstado = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('miembros_espacio')
        .select('id, tour_completado, tour_veces_mostrado, tour_no_mostrar')
        .eq('espacio_id', espacioId)
        .eq('usuario_id', userId)
        .single();

      if (data) {
        const nuevoEstado = {
          tour_completado: data.tour_completado ?? false,
          tour_veces_mostrado: data.tour_veces_mostrado ?? 0,
          tour_no_mostrar: data.tour_no_mostrar ?? false,
        };
        setTourState(nuevoEstado);
        // Si el tour fue reseteado (completado=false, veces=0), permitir re-disparo
        if (!nuevoEstado.tour_completado && nuevoEstado.tour_veces_mostrado === 0) {
          setTourStarted(false);
        }
      }
    } catch (err) {
      console.warn('ProductTour: Error cargando estado', err);
    } finally {
      setLoaded(true);
    }
  }, [espacioId, userId]);

  useEffect(() => {
    if (espacioId && userId) {
      cargarEstado();
    }
  }, [espacioId, userId, cargarEstado]);

  // Escuchar cambios en miembros_espacio (reset desde settings)
  useEffect(() => {
    if (!espacioId || !userId) return;

    const channel = supabase
      .channel(`tour-reset-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'miembros_espacio',
        filter: `usuario_id=eq.${userId}`,
      }, (payload) => {
        const nuevo = payload.new as any;
        if (nuevo.espacio_id === espacioId && nuevo.tour_completado === false) {
          console.log('ProductTour: Tour reseteado desde settings, recargando...');
          cargarEstado();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [espacioId, userId, cargarEstado]);

  // Actualizar estado en Supabase
  const actualizarEstado = useCallback(async (updates: Partial<TourState>) => {
    try {
      await supabase
        .from('miembros_espacio')
        .update(updates)
        .eq('espacio_id', espacioId)
        .eq('usuario_id', userId);
    } catch (err) {
      console.warn('ProductTour: Error actualizando estado', err);
    }
  }, [espacioId, userId]);

  // Iniciar el tour
  useEffect(() => {
    if (!loaded || !tourState || tourStarted) return;

    // Verificar si debe mostrarse
    if (tourState.tour_no_mostrar) return;
    if (tourState.tour_completado) return;
    if (tourState.tour_veces_mostrado >= 3) return;

    // Esperar a que los elementos del DOM estén listos
    const timer = setTimeout(() => {
      // Verificar que al menos el canvas existe
      const canvas = document.querySelector('[data-tour-step="space-canvas"]');
      if (!canvas) {
        console.warn('ProductTour: Elementos del DOM no encontrados, reintentando...');
        return;
      }

      // Filtrar pasos que existen en el DOM
      const pasosBase = PASOS_GENERALES.filter(paso => {
        if (!paso.element) return true;
        return document.querySelector(paso.element as string);
      });

      const pasosExtra = isAdmin
        ? PASOS_ADMIN.filter(paso => {
            if (!paso.element) return true;
            return document.querySelector(paso.element as string);
          })
        : [];

      const todosPasos = [...pasosBase, ...pasosExtra];

      if (todosPasos.length === 0) return;

      const tourConfig: Config = {
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        nextBtnText: 'Siguiente →',
        prevBtnText: '← Anterior',
        doneBtnText: '¡Listo! ✓',
        progressText: '{{current}} de {{total}}',
        allowClose: true,
        stagePadding: 8,
        stageRadius: 12,
        animate: true,
        smoothScroll: true,
        allowKeyboardControl: true,
        steps: todosPasos,
        onDestroyStarted: () => {
          // El usuario cerró el tour (X o click fuera)
          const nuevasVeces = (tourState.tour_veces_mostrado || 0) + 1;
          actualizarEstado({ tour_veces_mostrado: nuevasVeces });
          setTourState(prev => prev ? { ...prev, tour_veces_mostrado: nuevasVeces } : prev);
          driverObj.destroy();
        },
        onDestroyed: () => {
          // Tour terminado
        },
        onCloseClick: () => {
          // Cerrar con X
          driverObj.destroy();
        },
        onHighlightStarted: () => {
          // Paso iniciado
        },
        onDeselected: () => {
          // Paso deseleccionado
        },
        onNextClick: () => {
          // Si es el último paso, marcar como completado
          if (!driverObj.hasNextStep()) {
            actualizarEstado({ 
              tour_completado: true,
              tour_veces_mostrado: (tourState.tour_veces_mostrado || 0) + 1,
            });
            setTourState(prev => prev ? { ...prev, tour_completado: true } : prev);
          }
          driverObj.moveNext();
        },
        onPrevClick: () => {
          driverObj.movePrevious();
        },
      };

      const driverObj = driver(tourConfig);
      driverObj.drive();
      setTourStarted(true);

      // Incrementar veces mostrado
      const nuevasVeces = (tourState.tour_veces_mostrado || 0) + 1;
      actualizarEstado({ tour_veces_mostrado: nuevasVeces });

    }, 2000); // Esperar 2s para que el espacio 3D cargue

    return () => clearTimeout(timer);
  }, [loaded, tourState, tourStarted, isAdmin, actualizarEstado]);

  // Este componente no renderiza nada visible
  return null;
};

export default ProductTour;
