
import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import VirtualSpace3D from './VirtualSpace3D';
import { TaskBoard } from './TaskBoard';
import { MiembrosView } from './MiembrosView';
import AvatarCustomizer3D from './AvatarCustomizer3D';
import { ChatPanel } from './ChatPanel';
import { CalendarPanel } from './meetings/CalendarPanel';
import { GrabacionesHistorial } from './meetings/recording/GrabacionesHistorial';
import { VibenAssistant } from './VibenAssistant';
import { AvatarPreview } from './Navbar';
import { StatusSelector } from './StatusSelector';
import { GameHub, GameInvitationNotification } from './games';
import { SettingsModal } from './settings/SettingsModal';
import { Role, PresenceStatus, ThemeType, User } from '../types';
import { supabase } from '../lib/supabase';

export const WorkspaceLayout: React.FC = () => {
  const { activeWorkspace, activeSubTab, setActiveSubTab, setActiveWorkspace, currentUser, theme, setTheme, setView, session, setOnlineUsers, addNotification, unreadChatCount, clearUnreadChat, userRoleInActiveWorkspace } = useStore();
  const [showViben, setShowViben] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGameHub, setShowGameHub] = useState(false);
  const [pendingGameInvitation, setPendingGameInvitation] = useState<{ invitacion: any; partidaId: string } | null>(null);
  const presenceChannelRef = useRef<any>(null);

  // Handler para cuando se acepta una invitación de juego
  const handleGameInvitationAccepted = (invitacion: any, partidaId: string) => {
    setPendingGameInvitation({ invitacion, partidaId });
    setShowGameHub(true);
  };

  const onVibenToggle = () => setShowViben(prev => !prev);
  const isAdmin = userRoleInActiveWorkspace === 'super_admin' || userRoleInActiveWorkspace === 'admin';

  useEffect(() => {
    if (!activeWorkspace) setView('dashboard');
  }, [activeWorkspace, setView]);

  // Realtime Presence CENTRALIZADO - único lugar que maneja presencia
  useEffect(() => {
    if (!activeWorkspace?.id || !session?.user?.id) return;

    const roomName = `workspace:${activeWorkspace.id}`;
    const channel = supabase.channel(roomName, {
      config: { presence: { key: session.user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: User[] = [];
        Object.keys(state).forEach(key => {
          const presences = state[key] as any[];
          presences.forEach(presence => {
            if (presence.user_id !== session.user.id) {
              users.push({
                id: presence.user_id,
                name: presence.name || 'Usuario',
                role: presence.role || Role.MIEMBRO,
                avatar: '',
                avatarConfig: presence.avatarConfig || { skinColor: '#fcd34d', clothingColor: '#6366f1', hairColor: '#4b2c20', accessory: 'none' },
                x: presence.x || 500,
                y: presence.y || 500,
                direction: presence.direction || 'front',
                isOnline: true,
                isMicOn: presence.isMicOn || false,
                isCameraOn: presence.isCameraOn || false,
                isScreenSharing: false,
                isPrivate: false,
                status: presence.status || PresenceStatus.AVAILABLE,
              });
            }
          });
        });
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        if (newPresences[0]?.name) {
          addNotification(`${newPresences[0].name} se conectó`, 'entry');
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: session.user.id,
            name: currentUser.name,
            role: currentUser.role,
            avatarConfig: currentUser.avatarConfig,
            x: currentUser.x,
            y: currentUser.y,
            direction: currentUser.direction,
            isMicOn: currentUser.isMicOn,
            isCameraOn: currentUser.isCameraOn,
            status: currentUser.status,
          });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [activeWorkspace?.id, session?.user?.id]);

  // Actualizar presencia cuando cambia la posición
  useEffect(() => {
    if (presenceChannelRef.current && session?.user?.id && presenceChannelRef.current.state === 'joined') {
      presenceChannelRef.current.track({
        user_id: session.user.id,
        name: currentUser.name,
        role: currentUser.role,
        avatarConfig: currentUser.avatarConfig,
        x: currentUser.x,
        y: currentUser.y,
        direction: currentUser.direction,
        isMicOn: currentUser.isMicOn,
        isCameraOn: currentUser.isCameraOn,
        status: currentUser.status,
      });
    }
  }, [currentUser.x, currentUser.y, currentUser.isMicOn, currentUser.isCameraOn, currentUser.status, session?.user?.id]);

  if (!activeWorkspace) return null;

  // ============== GLASSMORPHISM 2026 - Sistema de estilos unificado ==============
  // Inspirado en el onboarding para coherencia visual
  const glassBase = 'backdrop-blur-xl';
  const glassPanel = 'bg-white/[0.03] border-white/[0.08]';
  const glassHover = 'hover:bg-white/[0.06] hover:border-violet-500/30';
  const gradientPrimary = 'from-violet-600 via-fuchsia-600 to-cyan-500';
  const gradientText = 'text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white';
  const glowViolet = 'shadow-[0_0_20px_rgba(139,92,246,0.3)]';
  const glowCyan = 'shadow-[0_0_20px_rgba(34,211,238,0.3)]';

  const themeStyles = {
    dark: {
      bg: 'bg-[#0a0a0f]',
      text: 'text-zinc-100',
      globalNav: `${glassBase} bg-black/60 border-r border-white/[0.05]`,
      sidebar: `${glassBase} bg-black/40 border-white/[0.05]`,
      border: 'border-white/[0.08]',
      header: `${glassBase} bg-black/40`,
      accent: 'bg-violet-600',
      btn: `bg-gradient-to-r ${gradientPrimary} hover:opacity-90 text-white font-bold ${glowViolet}`,
      btnSecondary: `${glassBase} bg-white/[0.05] border border-white/[0.1] hover:border-violet-500/50 text-white`
    },
    light: {
      bg: 'bg-slate-50',
      text: 'text-zinc-900',
      globalNav: 'bg-white/80 backdrop-blur-xl border-r border-zinc-200',
      sidebar: 'bg-white/60 backdrop-blur-xl border-zinc-200',
      border: 'border-zinc-200',
      header: 'bg-white/80 backdrop-blur-xl',
      accent: 'bg-violet-600',
      btn: `bg-gradient-to-r ${gradientPrimary} hover:opacity-90 text-white font-bold shadow-lg`,
      btnSecondary: 'bg-white border border-zinc-200 hover:border-violet-500/50 text-zinc-700'
    },
    space: {
      bg: 'bg-[#020617]',
      text: 'text-indigo-100',
      globalNav: `${glassBase} bg-indigo-950/60 border-r border-indigo-500/20`,
      sidebar: `${glassBase} bg-indigo-950/40 border-indigo-500/20`,
      border: 'border-indigo-500/20',
      header: `${glassBase} bg-indigo-950/40`,
      accent: 'bg-cyan-500',
      btn: `bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 hover:opacity-90 text-white font-bold ${glowCyan}`,
      btnSecondary: `${glassBase} bg-indigo-500/10 border border-indigo-500/30 hover:border-cyan-500/50 text-indigo-100`
    },
    arcade: {
      bg: 'bg-black',
      text: 'text-[#00ff41]',
      globalNav: 'bg-black border-r border-[#00ff41]/40',
      sidebar: 'bg-black/90 border-[#00ff41]/30',
      border: 'border-[#00ff41]/40',
      header: 'bg-black/90',
      accent: 'bg-[#00ff41]',
      btn: 'bg-[#00ff41] hover:bg-[#00ff41]/80 text-black font-black uppercase tracking-tighter shadow-[0_0_20px_#00ff41]',
      btnSecondary: 'bg-black border-2 border-[#00ff41]/60 hover:border-[#00ff41] text-[#00ff41]'
    }
  };

  const s = themeStyles[theme] || themeStyles.dark;

  const themes: {id: ThemeType, label: string, icon: string}[] = [
    { id: 'dark', label: 'Oscuro', icon: '🌑' },
    { id: 'light', label: 'Claro', icon: '☀️' },
    { id: 'space', label: 'Espacial', icon: '🚀' },
    { id: 'arcade', label: 'Arcade', icon: '🎮' }
  ];

  return (
    <div className={`flex h-screen w-screen overflow-hidden transition-all duration-500 ${s.bg} ${s.text}`}>
      
      {/* Sidebar Global */}
      <aside className={`w-[70px] ${s.globalNav} flex flex-col items-center py-8 gap-6 shrink-0 z-[100] border-r ${s.border}`}>
        <div 
          onClick={() => setView('dashboard')}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-all shadow-2xl overflow-hidden ${theme === 'arcade' ? 'bg-[#00ff41] border-2 border-[#00ff41]' : 'bg-white'}`}
        >
          {/* Logo SVG reemplazando imagen rota */}
          <svg className={`w-8 h-8 ${theme === 'arcade' ? 'text-black' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>

        <nav className="flex-1 flex flex-col gap-5 mt-4">
          {[
            { id: 'space', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Espacio' },
            { id: 'chat', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', label: 'Mensajes' },
            { id: 'tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'Tareas' },
            { id: 'grabaciones', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', label: 'Grabaciones' }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => {
                setActiveSubTab(item.id as any);
                if (item.id === 'chat') clearUnreadChat();
              }}
              className={`p-3.5 rounded-2xl transition-all shadow-xl relative ${activeSubTab === item.id ? (theme === 'arcade' ? 'bg-[#00ff41] text-black shadow-[0_0_20px_#00ff41]' : 'bg-white/20 text-white') : 'opacity-40 hover:opacity-100 hover:bg-white/5'}`}
              title={item.label}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={item.icon}/></svg>
              {item.id === 'chat' && unreadChatCount > 0 && activeSubTab !== 'chat' && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4 items-center pb-4">
          {/* Botón de Configuración */}
          <button
            onClick={() => setShowSettings(true)}
            className={`p-3 rounded-2xl transition-all ${
              theme === 'arcade' 
                ? 'text-[#00ff41] hover:bg-[#00ff41]/20' 
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Configuración"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          {/* Avatar del usuario */}
          <div 
            onClick={() => setActiveSubTab('avatar')}
            className={`w-11 h-11 rounded-2xl overflow-hidden cursor-pointer hover:ring-4 transition-all relative group ${theme === 'arcade' ? 'ring-[#00ff41]' : 'ring-white/50'}`}
          >
            <AvatarPreview config={currentUser.avatarConfig!} size="small" />
          </div>
        </div>
      </aside>

      {/* Sidebar Workspace */}
      <aside className={`w-[260px] ${s.sidebar} flex flex-col shrink-0 border-r ${s.border} z-90 shadow-2xl relative overflow-hidden`}>
        {theme === 'arcade' && <div className="absolute top-0 left-0 w-full h-1 bg-[#00ff41] animate-pulse" />}
        <ChatPanel sidebarOnly={true} />
      </aside>

      {/* Main Content */}
      <main className={`flex-1 relative h-full flex flex-col min-w-0 ${s.bg}`}>
        <header className={`h-16 border-b ${s.border} flex items-center px-8 justify-between shrink-0 ${s.header} z-50`}>
          <div className="flex items-center gap-4">
             {/* Título con efecto gradient text estilo onboarding */}
             <div className="flex items-center gap-3">
               <div className={`w-2 h-2 rounded-full ${theme === 'arcade' ? 'bg-[#00ff41] animate-pulse' : 'bg-gradient-to-r from-violet-500 to-cyan-500'}`} />
               <h2 className={`text-xs font-black uppercase tracking-[0.2em] ${
                 theme === 'arcade' 
                   ? 'text-[#00ff41] animate-pulse' 
                   : theme === 'light'
                     ? 'text-zinc-700'
                     : 'text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white'
               }`}>
                 {activeSubTab === 'space' ? 'Spatial World' : activeSubTab.toUpperCase()}
               </h2>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* SELECTOR DE ESTADO */}
            <StatusSelector />
            
            {/* SELECTOR DE TEMAS - Glassmorphism */}
            <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl border backdrop-blur-xl ${
              theme === 'arcade' 
                ? 'border-[#00ff41]/40 bg-black/60' 
                : theme === 'light'
                  ? 'border-zinc-200 bg-white/60'
                  : 'border-white/[0.08] bg-white/[0.03]'
            }`}>
              <span className={`text-[8px] font-black uppercase tracking-widest px-2 hidden lg:block ${
                theme === 'light' ? 'text-zinc-400' : 'opacity-40'
              }`}>Estilo</span>
              {themes.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setTheme(t.id)} 
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all transform active:scale-90 ${
                    theme === t.id 
                      ? theme === 'arcade'
                        ? 'bg-[#00ff41] shadow-[0_0_15px_#00ff41] scale-105'
                        : 'bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 shadow-lg scale-105 border border-violet-500/30'
                      : 'opacity-30 hover:opacity-100 hover:bg-white/[0.05]'
                  }`}
                  title={t.label}
                >
                  {t.icon}
                </button>
              ))}
            </div>

            {/* BOTÓN MINI JUEGOS - Estilo glassmorphism */}
            <button 
              onClick={() => setShowGameHub(true)} 
              className={`relative overflow-hidden flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all font-bold text-[10px] tracking-wider group ${
                theme === 'arcade' 
                  ? 'bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/50 hover:bg-[#00ff41]/30' 
                  : 'bg-white/[0.05] border border-white/[0.1] text-white/80 hover:bg-white/[0.1] hover:border-amber-500/50 hover:text-amber-400'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span>Juegos</span>
            </button>

            {/* BOTÓN VIBEN AI - Estilo onboarding con gradiente */}
            <button 
              onClick={onVibenToggle} 
              className={`relative overflow-hidden flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all font-black uppercase text-[10px] tracking-wider group ${
                theme === 'arcade' 
                  ? 'bg-[#00ff41] text-black shadow-[0_0_25px_#00ff41] hover:shadow-[0_0_35px_#00ff41]' 
                  : 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]'
              }`}
            >
              {/* Hover overlay estilo onboarding */}
              <span className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                theme === 'arcade' ? 'bg-white/20' : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400'
              }`} />
              <span className="relative flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full animate-pulse ${theme === 'arcade' ? 'bg-black' : 'bg-white'}`} />
                Viben AI
              </span>
            </button>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          {/* VirtualSpace3D siempre montado pero oculto cuando no está activo
              Esto mantiene el stream y conexiones WebRTC activas */}
          <div className={activeSubTab === 'space' ? 'h-full w-full' : 'hidden'}>
            <VirtualSpace3D theme={theme} />
          </div>
          {activeSubTab !== 'space' && (
            <div className="h-full w-full overflow-y-auto animate-in fade-in duration-500">
              {activeSubTab === 'tasks' && <TaskBoard />}
              {activeSubTab === 'miembros' && <MiembrosView />}
              {activeSubTab === 'avatar' && <AvatarCustomizer3D />}
              {activeSubTab === 'chat' && <ChatPanel chatOnly={true} />}
              {activeSubTab === 'calendar' && <CalendarPanel />}
              {activeSubTab === 'grabaciones' && <GrabacionesHistorial />}
            {activeSubTab === 'settings' && (
              <div className="p-16 max-w-4xl mx-auto">
                <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-10">Configuración</h2>
                <div className={`p-12 rounded-[50px] border-2 ${s.border} bg-black/10 backdrop-blur-3xl shadow-2xl`}>
                  <div className={`flex justify-between items-center pb-10 border-b-2 ${s.border}`}>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30">Workspace en uso</p>
                      <p className="text-4xl font-bold mt-2">{activeWorkspace?.name}</p>
                    </div>
                    <button className={`px-10 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all ${s.btn}`}>Personalizar</button>
                  </div>
                  <div className="pt-10">
                    <button onClick={() => setActiveWorkspace(null)} className="text-red-500 text-[11px] font-black uppercase tracking-[0.2em] hover:text-red-400 flex items-center gap-3 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      Cerrar Sesión de Espacio
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          )}
        </div>

        {/* El contenedor ahora es puramente de posicionamiento, no tiene estilos propios */}
        {showViben && (
          <div className="fixed bottom-4 right-4 z-[200] w-[calc(100vw-2rem)] sm:w-[340px] flex flex-col items-end pointer-events-none">
            <div className="w-full pointer-events-auto animate-in slide-in-from-right-4 duration-500">
              <VibenAssistant onClose={() => setShowViben(false)} />
            </div>
          </div>
        )}

        {/* Game Hub Modal */}
        <GameHub 
          isOpen={showGameHub} 
          onClose={() => {
            setShowGameHub(false);
            setPendingGameInvitation(null);
          }}
          espacioId={activeWorkspace?.id}
          currentUserId={session?.user?.id}
          currentUserName={currentUser?.name}
          pendingInvitation={pendingGameInvitation}
          onPendingInvitationHandled={() => setPendingGameInvitation(null)}
        />

        {/* Notificaciones de invitación a juegos */}
        {activeWorkspace?.id && session?.user?.id && (
          <GameInvitationNotification
            userId={session.user.id}
            espacioId={activeWorkspace.id}
            onAccept={handleGameInvitationAccepted}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        workspaceId={activeWorkspace?.id || ''}
        isAdmin={isAdmin}
        currentTheme={theme}
        onThemeChange={(newTheme) => setTheme(newTheme as any)}
      />
    </div>
  );
};
