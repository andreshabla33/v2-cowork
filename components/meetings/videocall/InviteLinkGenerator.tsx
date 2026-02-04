'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

interface InviteLinkGeneratorProps {
  salaId: string;
  onClose?: () => void;
}

interface Invitado {
  email: string;
  nombre: string;
  tipo: 'cliente' | 'candidato' | 'invitado';
}

export const InviteLinkGenerator: React.FC<InviteLinkGeneratorProps> = ({
  salaId,
  onClose,
}) => {
  const { theme, currentUser } = useStore();
  const [invitados, setInvitados] = useState<Invitado[]>([
    { email: '', nombre: '', tipo: 'invitado' }
  ]);
  const [loading, setLoading] = useState(false);
  const [enlaces, setEnlaces] = useState<{ email: string; enlace: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Agregar invitado
  const addInvitado = () => {
    setInvitados([...invitados, { email: '', nombre: '', tipo: 'invitado' }]);
  };

  // Eliminar invitado
  const removeInvitado = (index: number) => {
    if (invitados.length > 1) {
      setInvitados(invitados.filter((_, i) => i !== index));
    }
  };

  // Actualizar invitado
  const updateInvitado = (index: number, field: keyof Invitado, value: string) => {
    const updated = [...invitados];
    updated[index] = { ...updated[index], [field]: value };
    setInvitados(updated);
  };

  // Generar enlaces de invitación
  const generateLinks = async () => {
    const validInvitados = invitados.filter(i => i.email.trim());
    
    if (validInvitados.length === 0) {
      setError('Agrega al menos un email');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const generatedLinks: { email: string; enlace: string }[] = [];

      for (const invitado of validInvitados) {
        // Crear participante
        const { data: participante, error: partError } = await supabase
          .from('participantes_sala')
          .insert({
            sala_id: salaId,
            nombre_invitado: invitado.nombre || invitado.email.split('@')[0],
            email_invitado: invitado.email,
            tipo_participante: invitado.tipo,
            estado_participante: 'invitado',
          })
          .select()
          .single();

        if (partError) throw partError;

        // Crear invitación (el token se genera automáticamente por trigger)
        const { data: invitacion, error: invError } = await supabase
          .from('invitaciones_reunion')
          .insert({
            sala_id: salaId,
            participante_id: participante.id,
            email: invitado.email,
            nombre: invitado.nombre,
            tipo_invitado: invitado.tipo,
            creado_por: currentUser?.id,
            expira_en: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
          })
          .select()
          .single();

        if (invError) throw invError;

        generatedLinks.push({
          email: invitado.email,
          enlace: `${baseUrl}/join/${invitacion.token_unico}`,
        });
      }

      setEnlaces(generatedLinks);
    } catch (err: any) {
      console.error('Error generando enlaces:', err);
      setError(err.message || 'Error al generar enlaces');
    } finally {
      setLoading(false);
    }
  };

  // Copiar enlace
  const copyLink = async (enlace: string, email: string) => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopied(email);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Error copiando:', err);
    }
  };

  // Copiar todos los enlaces
  const copyAllLinks = async () => {
    const allLinks = enlaces.map(e => `${e.email}: ${e.enlace}`).join('\n');
    try {
      await navigator.clipboard.writeText(allLinks);
      setCopied('all');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Error copiando:', err);
    }
  };

  const isArcade = theme === 'arcade';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-lg rounded-2xl ${isArcade ? 'bg-black border-[#00ff41]/30' : 'bg-[#1a1a2e]'} border border-white/10 shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`p-4 border-b border-white/10 ${isArcade ? 'bg-[#00ff41]/5' : 'bg-indigo-500/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${isArcade ? 'bg-[#00ff41]' : 'bg-gradient-to-br from-indigo-500 to-purple-600'} flex items-center justify-center`}>
                <svg className={`w-5 h-5 ${isArcade ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h3 className={`font-bold ${isArcade ? 'text-[#00ff41]' : 'text-white'}`}>Invitar Participantes</h3>
                <p className="text-xs opacity-50">Genera enlaces para invitados externos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <svg className="w-5 h-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {enlaces.length === 0 ? (
            <>
              {/* Lista de invitados */}
              <div className="space-y-3 mb-4">
                {invitados.map((invitado, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="email"
                        value={invitado.email}
                        onChange={(e) => updateInvitado(index, 'email', e.target.value)}
                        placeholder="email@ejemplo.com"
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                      />
                      <input
                        type="text"
                        value={invitado.nombre}
                        onChange={(e) => updateInvitado(index, 'nombre', e.target.value)}
                        placeholder="Nombre (opcional)"
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <select
                      value={invitado.tipo}
                      onChange={(e) => updateInvitado(index, 'tipo', e.target.value as any)}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs focus:outline-none"
                    >
                      <option value="invitado">Invitado</option>
                      <option value="cliente">Cliente</option>
                      <option value="candidato">Candidato</option>
                    </select>
                    {invitados.length > 1 && (
                      <button
                        onClick={() => removeInvitado(index)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Botón agregar */}
              <button
                onClick={addInvitado}
                className="w-full py-2 border border-dashed border-white/20 hover:border-white/40 rounded-lg text-sm opacity-60 hover:opacity-100 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Agregar otro invitado
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Enlaces generados */}
              <div className="space-y-3">
                {enlaces.map((enlace, index) => (
                  <div key={index} className="p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{enlace.email}</span>
                      <button
                        onClick={() => copyLink(enlace.enlace, enlace.email)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          copied === enlace.email
                            ? 'bg-green-500 text-white'
                            : isArcade
                              ? 'bg-[#00ff41]/20 text-[#00ff41] hover:bg-[#00ff41]/30'
                              : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                        }`}
                      >
                        {copied === enlace.email ? '✓ Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <p className="text-xs opacity-50 break-all font-mono">{enlace.enlace}</p>
                  </div>
                ))}
              </div>

              {enlaces.length > 1 && (
                <button
                  onClick={copyAllLinks}
                  className={`mt-4 w-full py-2 rounded-lg text-sm font-bold transition-all ${
                    copied === 'all'
                      ? 'bg-green-500 text-white'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {copied === 'all' ? '✓ Todos copiados' : 'Copiar todos los enlaces'}
                </button>
              )}

              <button
                onClick={() => { setEnlaces([]); setInvitados([{ email: '', nombre: '', tipo: 'invitado' }]); }}
                className="mt-2 w-full py-2 text-sm opacity-60 hover:opacity-100 transition-all"
              >
                Generar más enlaces
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        {enlaces.length === 0 && (
          <div className="p-4 border-t border-white/10 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={generateLinks}
              disabled={loading}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${
                isArcade
                  ? 'bg-[#00ff41] text-black hover:bg-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generando...
                </span>
              ) : (
                'Generar Enlaces'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteLinkGenerator;
