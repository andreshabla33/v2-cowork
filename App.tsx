
import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import { CargoSelector } from './components/onboarding/CargoSelector';
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

// Componente de Onboarding para selección de cargo
interface OnboardingCargoState {
  isLoading: boolean;
  error: string | null;
  espacioNombre: string;
  cargoSugerido: CargoLaboral | null;
  miembroId: string | null;
}

const OnboardingCargoView: React.FC = () => {
  const { session, setView, setAuthFeedback } = useStore();
  const [state, setState] = useState<OnboardingCargoState>({
    isLoading: true,
    error: null,
    espacioNombre: 'tu espacio',
    cargoSugerido: null,
    miembroId: null,
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
      // Buscar membresía del usuario
      const { data: miembro, error } = await supabase
        .from('miembros_espacio')
        .select(`
          id,
          cargo,
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
        cargoSugerido: invitacion?.cargo_sugerido || null,
        miembroId: miembro.id,
      });
    } catch (err) {
      console.error('Error verificando miembro:', err);
      setState(prev => ({ ...prev, isLoading: false, error: 'Error al cargar datos' }));
    }
  };

  const handleSelectCargo = async (cargo: CargoLaboral) => {
    if (!state.miembroId) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('miembros_espacio')
        .update({
          cargo,
          onboarding_completado: true,
        })
        .eq('id', state.miembroId);

      if (error) throw error;

      setAuthFeedback({ type: 'success', message: `¡Perfil configurado! Cargo: ${cargo}` });
      setView('dashboard');
    } catch (err) {
      console.error('Error guardando cargo:', err);
      setState(prev => ({ ...prev, error: 'Error al guardar el cargo' }));
    } finally {
      setSaving(false);
    }
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

  return (
    <CargoSelector
      onSelect={handleSelectCargo}
      cargoSugerido={state.cargoSugerido || undefined}
      espacioNombre={state.espacioNombre}
      isLoading={saving}
    />
  );
};

export default App;
