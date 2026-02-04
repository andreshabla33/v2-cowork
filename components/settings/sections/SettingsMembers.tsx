import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { SettingSection } from '../components/SettingSection';
import { Language, getCurrentLanguage, subscribeToLanguageChange } from '../../../lib/i18n';

interface Member {
  id: string;
  usuario_id: string;
  rol: string;
  cargo: string;
  aceptado: boolean;
  usuario?: {
    nombre: string;
    email: string;
  };
}

interface SettingsMembersProps {
  workspaceId: string;
  isAdmin: boolean;
}

export const SettingsMembers: React.FC<SettingsMembersProps> = ({
  workspaceId,
  isAdmin
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLang, setCurrentLang] = useState<Language>(getCurrentLanguage());

  // Escuchar cambios de idioma
  useEffect(() => {
    const unsubscribe = subscribeToLanguageChange(() => {
      setCurrentLang(getCurrentLanguage());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadMembers = async () => {
      const { data, error } = await supabase
        .from('miembros_espacio')
        .select(`
          id,
          usuario_id,
          rol,
          cargo,
          aceptado,
          usuario:usuarios(nombre, email)
        `)
        .eq('espacio_id', workspaceId);

      if (!error && data) {
        setMembers(data as any);
      }
      setLoading(false);
    };

    if (workspaceId) loadMembers();
  }, [workspaceId]);

  const getRoleBadge = (rol: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-gradient-to-r from-amber-500 to-orange-500 text-black',
      admin: 'bg-violet-600 text-white',
      member: 'bg-zinc-700 text-zinc-300'
    };
    const labels: Record<string, Record<Language, string>> = {
      super_admin: { es: 'Super Admin', en: 'Super Admin', pt: 'Super Admin' },
      admin: { es: 'Admin', en: 'Admin', pt: 'Admin' },
      member: { es: 'Miembro', en: 'Member', pt: 'Membro' }
    };
    return (
      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${colors[rol] || colors.member}`}>
        {labels[rol]?.[currentLang] || rol}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          {currentLang === 'en' ? 'Manage Members' : currentLang === 'pt' ? 'Gerenciar Membros' : 'Gestionar Miembros'}
        </h2>
        <p className="text-sm text-zinc-400">
          {currentLang === 'en' ? 'Manage workspace members' : currentLang === 'pt' ? 'Gerenciar os membros do espaço de trabalho' : 'Administra los miembros del espacio de trabajo'}
        </p>
      </div>

      <SettingSection title={`${currentLang === 'en' ? 'Members' : currentLang === 'pt' ? 'Membros' : 'Miembros'} (${members.length})`}>
        {loading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold">
                    {(member.usuario?.nombre || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {member.usuario?.nombre || 'Usuario'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {member.usuario?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {member.cargo && (
                    <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-lg">
                      {member.cargo}
                    </span>
                  )}
                  {getRoleBadge(member.rol)}
                  {!member.aceptado && (
                    <span className="text-xs text-amber-400">{currentLang === 'en' ? 'Pending' : currentLang === 'pt' ? 'Pendente' : 'Pendiente'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingSection>

      {isAdmin && (
        <div className="mt-6">
          <button className="w-full py-4 border-2 border-dashed border-white/[0.1] rounded-2xl text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 transition-all flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {currentLang === 'en' ? 'Invite new member' : currentLang === 'pt' ? 'Convidar novo membro' : 'Invitar nuevo miembro'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SettingsMembers;
