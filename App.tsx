
import React, { useEffect, useState, Suspense } from 'react';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';
import './lib/i18n-config'; // Inicializar i18next
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import { CargoSelector } from './components/onboarding/CargoSelector';
import { OnboardingCreador } from './components/onboarding/OnboardingCreador';
import { MeetingLobby, MeetingRoom } from './components/meetings/videocall';
import type { CargoLaboral } from './components/onboarding/CargoSelector';

const App: React.FC = () => {
  const { session, setSession, view, setView, initialize, initialized } = useStore();

  useEffect(() => {
    // Inicialización al montar
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);
      setSession(session);
      
      if (event === 'SIGNED_IN') {
        // Al entrar, forzamos inicialización profunda para traer espacios
        await initialize();
      } else if (event === 'SIGNED_OUT') {
        setView('dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Detectar si es una invitación de videollamada (URL: /join/TOKEN) o acceso directo (URL: /sala/ID)
  const [meetingToken, setMeetingToken] = useState<string | null>(null);
  const [directSalaId, setDirectSalaId] = useState<string | null>(null);
  const [inMeeting, setInMeeting] = useState(false);
  const [meetingNombre, setMeetingNombre] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/join/')) {
      const token = path.replace('/join/', '');
      if (token) {
        setMeetingToken(token);
      }
    } else if (path.startsWith('/sala/')) {
      const salaId = path.replace('/sala/', '');
      if (salaId) {
        setDirectSalaId(salaId);
      }
    }
  }, []);

  // Si hay token de videollamada, mostrar lobby o sala (no requiere sesión)
  if (meetingToken && !inMeeting) {
    return (
      <MeetingLobby
        tokenInvitacion={meetingToken}
        onJoin={(token, nombre) => {
          setMeetingNombre(nombre);
          setInMeeting(true);
        }}
        onError={(error) => console.error('Error en lobby:', error)}
      />
    );
  }

  // Pantalla de agradecimiento para invitados externos
  if (showThankYou) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 max-w-lg text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">¡Gracias por participar!</h2>
          <p className="text-white/60 mb-2">La reunión ha finalizado.</p>
          <p className="text-white/50 text-sm mb-8">
            Esperamos que haya sido una gran experiencia. Si el organizador configuró un resumen, lo recibirás por email.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setShowThankYou(false);
                setMeetingToken(null);
                window.history.pushState({}, '', '/');
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition-all"
            >
              Cerrar
            </button>
          </div>
          <p className="text-white/30 text-xs mt-8">Powered by Cowork</p>
        </div>
      </div>
    );
  }

  if (meetingToken && inMeeting) {
    return (
      <MeetingRoom
        salaId=""
        tokenInvitacion={meetingToken}
        nombreInvitado={meetingNombre}
        onLeave={() => {
          setInMeeting(false);
          setShowThankYou(true);
        }}
      />
    );
  }

  // Acceso directo a sala de videollamada (URL: /sala/ID)
  if (directSalaId) {
    // Si hay sesión, abrir la sala directamente
    if (session) {
      return (
        <MeetingRoom
          salaId={directSalaId}
          onLeave={() => {
            setDirectSalaId(null);
            window.history.pushState({}, '', '/');
          }}
        />
      );
    }
    // Si no hay sesión pero está inicializando, mostrar loading
    if (!initialized) {
      return (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center gap-6">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Cargando videollamada...</p>
        </div>
      );
    }
    // Si no hay sesión y ya inicializó, mostrar login
    return <LoginScreen />;
  }

  // Si no hay sesión, siempre pantalla de login (excepto si estamos procesando invitación)
  if (!session && view !== 'invitation') {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-inter selection:bg-indigo-500/30">
      {(!initialized || view === 'loading') && (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center gap-6">
           <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
           <div className="text-center">
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 animate-pulse">Sincronizando Workspace</p>
             <p className="text-[8px] font-bold text-zinc-700 uppercase mt-2">Cargando datos de sesión y mapas...</p>
           </div>
        </div>
      )}
      
      {initialized && view === 'dashboard' && <Dashboard />}
      {initialized && view === 'workspace' && <WorkspaceLayout />}
      {view === 'invitation' && <InvitationProcessor />}
      {view === 'onboarding' && <OnboardingCargoView />}
      {view === 'onboarding_creador' && session && (
        <OnboardingCreador
          userId={session.user.id}
          userEmail={session.user.email || ''}
          userName={session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario'}
          onComplete={() => {
            initialize();
            setView('dashboard');
          }}
        />
      )}
    </div>
  );
};

type InvitationState = 'cargando' | 'valido' | 'expirado' | 'usado' | 'error' | 'aceptado';

interface InvitacionInfo {
  email: string;
  rol: string;
  espacio: { nombre: string; slug: string; id: string };
  invitador: { nombre: string };
}

const InvitationProcessor: React.FC = () => {
  const [estado, setEstado] = useState<InvitationState>('cargando');
  const [invitacion, setInvitacion] = useState<InvitacionInfo | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');
  const { session, setAuthFeedback, setView, theme } = useStore();

  const token = new URLSearchParams(window.location.search).get('token');

  useEffect(() => {
    if (token) {
      verificarInvitacion();
    } else {
      setEstado('error');
    }
  }, [token]);

  const verificarInvitacion = async () => {
    try {
      const { data, error } = await supabase
        .from('invitaciones_pendientes')
        .select(`
          email,
          rol,
          usada,
          expira_en,
          espacio:espacios_trabajo (id, nombre, slug),
          invitador:usuarios!creada_por (nombre)
        `)
        .eq('token', token)
        .single();

      if (error || !data) {
        setEstado('error');
        return;
      }

      if (data.usada) {
        setEstado('usado');
        return;
      }

      if (new Date(data.expira_en) < new Date()) {
        setEstado('expirado');
        return;
      }

      setInvitacion({
        email: data.email,
        rol: data.rol,
        espacio: data.espacio as any,
        invitador: { nombre: (data.invitador as any)?.nombre || 'Un colega' }
      });
      setEstado('valido');
    } catch (err) {
      setEstado('error');
    }
  };

  const aceptarInvitacion = async () => {
    if (!token || !invitacion) return;
    setProcesando(true);
    setErrorLocal('');

    try {
      if (!session) {
        setAuthFeedback({ type: 'success', message: 'Inicia sesión con tu correo para aceptar la invitación.' });
        setView('loading');
        setTimeout(() => setView('dashboard'), 100); 
        return;
      }

      if (session.user.email?.toLowerCase() !== invitacion.email.toLowerCase()) {
        setErrorLocal(`Debes iniciar sesión con ${invitacion.email}`);
        setProcesando(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('miembros_espacio')
        .insert({
          espacio_id: invitacion.espacio.id,
          usuario_id: session.user.id,
          rol: invitacion.rol,
          aceptado: true,
          aceptado_en: new Date().toISOString()
        });

      if (insertError) {
        if (insertError.code !== '23505') throw insertError;
      }

      await supabase
        .from('invitaciones_pendientes')
        .update({ usada: true })
        .eq('token', token);

      setEstado('aceptado');
      
      setTimeout(() => {
        setAuthFeedback({ type: 'success', message: `¡Bienvenido a ${invitacion.espacio.nombre}!` });
        // Redirigir a onboarding para selección de cargo
        setView('onboarding');
      }, 2000);
    } catch (err: any) {
      setErrorLocal(err.message || 'Error al aceptar invitación');
    } finally {
      setProcesando(false);
    }
  };

  const isArcade = theme === 'arcade';

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-6 ${isArcade ? 'bg-black' : 'bg-[#09090b]'}`}>
      <div className={`w-full max-w-md p-10 rounded-[32px] text-center border-2 shadow-2xl animate-in zoom-in duration-500 ${
        isArcade ? 'bg-black border-[#00ff41]' : 'bg-zinc-900 border-white/5 shadow-indigo-500/10'
      }`}>
        
        {estado === 'cargando' && (
          <div className="space-y-6">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
            <h1 className="text-xl font-black uppercase tracking-widest">Verificando invitación...</h1>
          </div>
        )}

        {estado === 'error' && (
          <div className="space-y-6">
            <div className="text-6xl">❌</div>
            <h1 className="text-xl font-black uppercase tracking-tight">Invitación no válida</h1>
            <p className="text-sm opacity-50 uppercase font-bold tracking-widest">El enlace es inválido o ha sido eliminado.</p>
            <button onClick={() => setView('dashboard')} className="w-full py-4 bg-zinc-800 rounded-2xl font-black uppercase tracking-widest text-[10px]">Ir al Inicio</button>
          </div>
        )}

        {estado === 'expirado' && (
          <div className="space-y-6">
            <div className="text-6xl">⏰</div>
            <h1 className="text-xl font-black uppercase tracking-tight">Invitación expirada</h1>
            <p className="text-sm opacity-50 uppercase font-bold tracking-widest">Esta invitación ha caducado. Solicita una nueva.</p>
            <button onClick={() => setView('dashboard')} className="w-full py-4 bg-zinc-800 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cerrar</button>
          </div>
        )}

        {estado === 'usado' && (
          <div className="space-y-6">
            <div className="text-6xl">✅</div>
            <h1 className="text-xl font-black uppercase tracking-tight">Invitación ya utilizada</h1>
            <p className="text-sm opacity-50 uppercase font-bold tracking-widest">Ya eres parte de este equipo o el token ya fue canjeado.</p>
            <button onClick={() => setView('dashboard')} className="w-full py-4 bg-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px]">Ir a mi Workspace</button>
          </div>
        )}

        {estado === 'valido' && invitacion && (
          <div className="space-y-8">
            <div className="text-6xl animate-bounce">🎉</div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black uppercase tracking-tight">¡Te han invitado!</h1>
              <p className="text-sm opacity-50 uppercase font-bold tracking-widest">
                <span className="text-indigo-500">{invitacion.invitador.nombre}</span> te invita a unirte a:
              </p>
            </div>
            
            <div className="p-8 rounded-[24px] bg-black/40 border border-white/5">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">{invitacion.espacio.nombre}</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-2">Rol: {invitacion.rol}</p>
            </div>

            {errorLocal && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">
                {errorLocal}
              </div>
            )}

            <button
              onClick={aceptarInvitacion}
              disabled={procesando}
              className={`w-full py-5 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl active:scale-95 disabled:opacity-50 ${
                isArcade ? 'bg-[#00ff41] text-black shadow-[#00ff41]/20' : 'bg-indigo-600 text-white shadow-indigo-600/30'
              }`}
            >
              {procesando ? 'Procesando...' : 'Aceptar invitación'}
            </button>
          </div>
        )}

        {estado === 'aceptado' && (
          <div className="space-y-6">
            <div className="text-6xl animate-ping">🎊</div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-green-500">¡Bienvenido al equipo!</h1>
            <p className="text-sm opacity-50 uppercase font-bold tracking-widest">Redirigiendo a configurar tu perfil...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Tipo para departamento
interface Departamento {
  id: string;
  nombre: string;
  color: string;
  icono: string;
}

// Componente de Onboarding para selección de cargo y departamento
interface OnboardingCargoState {
  isLoading: boolean;
  error: string | null;
  espacioNombre: string;
  espacioId: string | null;
  cargoSugerido: CargoLaboral | null;
  miembroId: string | null;
  departamentos: Departamento[];
  paso: 'cargo' | 'departamento';
  cargoSeleccionado: CargoLaboral | null;
  rolSistema: string; // Rol del sistema (super_admin, admin, member)
}

const OnboardingCargoView: React.FC = () => {
  const { session, setView, setAuthFeedback } = useStore();
  const [state, setState] = useState<OnboardingCargoState>({
    isLoading: true,
    error: null,
    espacioNombre: 'tu espacio',
    espacioId: null,
    cargoSugerido: null,
    miembroId: null,
    departamentos: [],
    paso: 'cargo',
    cargoSeleccionado: null,
    rolSistema: 'member', // Por defecto member (más restrictivo)
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    verificarMiembro();
  }, [session]);

  const verificarMiembro = async () => {
    if (!session?.user?.id) {
      setState(prev => ({ ...prev, isLoading: false, error: 'No hay sesión activa' }));
      return;
    }

    try {
      // Buscar membresía del usuario (incluye ROL del sistema)
      const { data: miembro, error } = await supabase
        .from('miembros_espacio')
        .select(`
          id,
          cargo,
          rol,
          espacio_id,
          onboarding_completado,
          espacios_trabajo:espacio_id (nombre)
        `)
        .eq('usuario_id', session.user.id)
        .eq('aceptado', true)
        .order('aceptado_en', { ascending: false })
        .limit(1)
        .single();

      if (error || !miembro) {
        setState(prev => ({ ...prev, isLoading: false, error: 'No se encontró membresía' }));
        return;
      }

      // Si ya completó onboarding, ir al dashboard
      if (miembro.onboarding_completado) {
        setView('dashboard');
        return;
      }

      // Buscar departamentos del espacio
      const { data: departamentosData } = await supabase
        .from('departamentos')
        .select('id, nombre, color, icono')
        .eq('espacio_id', miembro.espacio_id)
        .order('nombre');

      // Buscar cargo sugerido en invitación
      const { data: invitacion } = await supabase
        .from('invitaciones_pendientes')
        .select('cargo_sugerido')
        .eq('email', session.user.email)
        .eq('usada', true)
        .single();

      const espacioData = miembro.espacios_trabajo as any;
      setState({
        isLoading: false,
        error: null,
        espacioNombre: espacioData?.nombre || 'tu espacio',
        espacioId: miembro.espacio_id,
        cargoSugerido: invitacion?.cargo_sugerido || null,
        miembroId: miembro.id,
        departamentos: departamentosData || [],
        paso: 'cargo',
        cargoSeleccionado: null,
        rolSistema: (miembro as any).rol || 'member', // Rol del sistema para filtrar cargos
      });
    } catch (err) {
      console.error('Error verificando miembro:', err);
      setState(prev => ({ ...prev, isLoading: false, error: 'Error al cargar datos' }));
    }
  };

  const handleSelectCargo = (cargo: CargoLaboral) => {
    // Pasar al paso de departamento
    setState(prev => ({ ...prev, cargoSeleccionado: cargo, paso: 'departamento' }));
  };

  const handleSelectDepartamento = async (departamentoId: string) => {
    if (!state.miembroId || !state.cargoSeleccionado) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('miembros_espacio')
        .update({
          cargo: state.cargoSeleccionado,
          departamento_id: departamentoId,
          onboarding_completado: true,
        })
        .eq('id', state.miembroId);

      if (error) throw error;

      const deptNombre = state.departamentos.find(d => d.id === departamentoId)?.nombre || '';
      setAuthFeedback({ type: 'success', message: `¡Perfil configurado! ${deptNombre}` });
      setView('dashboard');
    } catch (err) {
      console.error('Error guardando:', err);
      setState(prev => ({ ...prev, error: 'Error al guardar' }));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setState(prev => ({ ...prev, paso: 'cargo', cargoSeleccionado: null }));
  };

  if (state.isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-400 mb-4">{state.error}</p>
          <button
            onClick={() => setView('dashboard')}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  // Paso 1: Selección de cargo (filtrado por rol del sistema)
  if (state.paso === 'cargo') {
    return (
      <CargoSelector
        onSelect={handleSelectCargo}
        cargoSugerido={state.cargoSugerido || undefined}
        espacioNombre={state.espacioNombre}
        isLoading={saving}
        rolUsuario={state.rolSistema}
      />
    );
  }

  // Paso 2: Selección de departamento
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={handleBack}
            className="mb-4 text-slate-400 hover:text-white flex items-center gap-2 mx-auto text-sm"
          >
            ← Volver a selección de cargo
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full text-indigo-400 text-xs font-medium mb-4">
            Paso 2 de 2
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">¿A qué departamento perteneces?</h1>
          <p className="text-slate-400">
            Selecciona tu departamento en <span className="text-indigo-400 font-medium">{state.espacioNombre}</span>
          </p>
        </div>

        {/* Grid de departamentos */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {state.departamentos.map((dept) => (
            <button
              key={dept.id}
              onClick={() => handleSelectDepartamento(dept.id)}
              disabled={saving}
              className="group p-6 rounded-2xl border-2 border-slate-700 hover:border-indigo-500 bg-slate-800/50 hover:bg-slate-800 transition-all duration-200 text-left disabled:opacity-50"
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl"
                style={{ backgroundColor: dept.color + '20' }}
              >
                {dept.icono === 'users' && '👥'}
                {dept.icono === 'code' && '💻'}
                {dept.icono === 'palette' && '🎨'}
                {dept.icono === 'megaphone' && '📣'}
                {dept.icono === 'headphones' && '🎧'}
                {dept.icono === 'trending-up' && '📈'}
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                {dept.nombre}
              </h3>
              <div 
                className="w-8 h-1 rounded-full mt-2"
                style={{ backgroundColor: dept.color }}
              />
            </button>
          ))}
        </div>

        {saving && (
          <div className="mt-6 text-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm mt-2">Guardando...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
