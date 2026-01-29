
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Role } from '../types';

export const Dashboard: React.FC = () => {
  const { workspaces, setActiveWorkspace, currentUser, signOut, setAuthFeedback, authFeedback, fetchWorkspaces } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newSpaceName.trim()) return;
    setLoading(true);
    setAuthFeedback(null);
    
    try {
      const { data, error } = await supabase.rpc('crear_espacio_trabajo', {
        p_nombre: newSpaceName,
        p_descripcion: 'Espacio creado desde Dashboard'
      });
      
      if (error) throw error;
      
      setAuthFeedback({ type: 'success', message: '¡Espacio creado con éxito!' });
      
      await fetchWorkspaces();
      setShowCreate(false);
      setNewSpaceName('');
    } catch (e: any) {
      const msg = e?.message || e?.error_description || (typeof e === 'string' ? e : 'Error al crear el espacio');
      console.error("Create Workspace Error:", e);
      setAuthFeedback({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050508]">
      {/* Fondo con grid pattern estilo gaming */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
      
      {/* Gradientes de fondo neon */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-violet-600/10 via-fuchsia-600/5 to-transparent blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-cyan-600/10 via-violet-600/5 to-transparent blur-[100px] rounded-full -z-10 pointer-events-none" />
      
      <div className="p-8 md:p-12 max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
          <div>
            <div className="flex items-center gap-4 mb-3">
              {/* Logo con glow neon */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl blur-lg opacity-60" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-500 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg">
                  C
                </div>
              </div>
              {/* Título con gradiente */}
              <h1 className="text-5xl md:text-6xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-white via-violet-200 to-white bg-clip-text text-transparent">
                  COWORK
                </span>
              </h1>
            </div>
            <p className="text-zinc-500 font-semibold uppercase tracking-[0.25em] text-[11px] ml-16">
              Bienvenido, <span className="text-violet-400">{currentUser.name}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Botón Nuevo Espacio con gradiente neon */}
            <button 
              onClick={() => setShowCreate(true)} 
              className="group relative px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs overflow-hidden transition-all duration-300 hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 opacity-100" />
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative text-white flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Espacio
              </span>
            </button>
            
            {/* Botón Salir */}
            <button 
              onClick={signOut} 
              className="px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] text-zinc-400 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-violet-500/30 transition-all"
            >
              Salir
            </button>
          </div>
        </header>

      {/* Feedback de la operación */}
      {authFeedback && (
        <div className={`mb-10 p-5 rounded-[24px] border-2 animate-in slide-in-from-top-2 flex items-center justify-between gap-4 ${
          authFeedback.type === 'success' 
            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{authFeedback.type === 'success' ? '🚀' : '⚠️'}</span>
            <p className="text-[11px] font-black uppercase tracking-widest leading-relaxed">
              {authFeedback.message}
            </p>
          </div>
          <button onClick={() => setAuthFeedback(null)} className="opacity-50 hover:opacity-100 p-2 text-xl font-bold">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((ws: any) => (
          <div 
            key={ws.id} 
            onClick={() => setActiveWorkspace(ws, ws.userRole)}
            className="group relative p-8 rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl hover:border-violet-500/40 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            {/* Glow de fondo en hover */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-violet-600/10 via-fuchsia-600/5 to-transparent blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                {/* Icono del espacio con gradiente */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
                  <div className="relative w-14 h-14 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-2xl flex items-center justify-center text-2xl font-black text-violet-400 group-hover:scale-105 transition-transform">
                    {ws.name ? ws.name.charAt(0).toUpperCase() : 'W'}
                  </div>
                </div>
                {/* Indicador de estado */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-emerald-400 text-[9px] font-bold uppercase tracking-wider">Activo</span>
                </div>
              </div>

              {/* Nombre del espacio */}
              <h3 className="text-2xl font-bold tracking-tight mb-3 text-white group-hover:bg-gradient-to-r group-hover:from-violet-400 group-hover:to-fuchsia-400 group-hover:bg-clip-text group-hover:text-transparent transition-all truncate">
                {ws.name}
              </h3>
              
              {/* Badge de rol con gradiente */}
              <div className="flex items-center gap-3 mt-4">
                <span className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                  ws.userRole === Role.SUPER_ADMIN 
                    ? 'bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 text-violet-300 border border-violet-500/30' 
                    : ws.userRole === Role.ADMIN 
                    ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-cyan-300 border border-cyan-500/30' 
                    : 'bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {ws.userRole ? ws.userRole.replace('_', ' ') : 'Miembro'}
                </span>
              </div>
              
              {/* Footer con acción */}
              <div className="mt-6 pt-6 border-t border-white/[0.06] flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Entrar al espacio</p>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 flex items-center justify-center group-hover:from-violet-600 group-hover:to-fuchsia-600 transition-all">
                  <svg className="w-4 h-4 text-violet-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        ))}

        {workspaces.length === 0 && !authFeedback && !loading && (
          <div className="col-span-full py-32 border border-dashed border-violet-500/20 rounded-3xl flex flex-col items-center justify-center gap-6 text-center bg-gradient-to-b from-violet-600/5 to-transparent">
            {/* Icono con glow */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full blur-xl opacity-30" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-full flex items-center justify-center text-4xl">
                🏢
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-white font-bold text-lg">No tienes espacios de trabajo</p>
              <p className="text-zinc-500 text-sm">Comienza creando tu propia sede virtual</p>
            </div>
            <button 
              onClick={() => setShowCreate(true)} 
              className="mt-2 group relative px-8 py-4 rounded-xl font-bold uppercase tracking-wider text-sm overflow-hidden transition-all duration-300 hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative text-white">Crea tu primer espacio</span>
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
          <div className="max-w-md w-full relative">
            {/* Glow de fondo del modal */}
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-cyan-600/20 rounded-[40px] blur-2xl" />
            
            <div className="relative bg-[#0a0a0c] border border-white/[0.08] rounded-3xl p-10 shadow-2xl">
              {/* Header con icono */}
              <div className="flex items-center gap-4 mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl blur-md opacity-60" />
                  <div className="relative w-12 h-12 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Lanzar Sede</h2>
                  <p className="text-zinc-500 text-sm">Crea tu espacio de trabajo virtual</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs uppercase font-semibold tracking-wider text-violet-400 mb-2 block">
                    Nombre de la Compañía
                  </label>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Ej. Cyberdyne Systems"
                    value={newSpaceName}
                    onChange={e => setNewSpaceName(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 text-base focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 outline-none text-white placeholder:text-zinc-600 transition-all"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowCreate(false)} 
                    className="flex-1 py-4 rounded-xl font-semibold text-sm text-zinc-400 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreate}
                    disabled={loading || !newSpaceName.trim()}
                    className="flex-1 group relative py-4 rounded-xl font-bold text-sm overflow-hidden disabled:opacity-50 transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500" />
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative text-white">
                      {loading ? 'Preparando...' : 'Crear Sede'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
