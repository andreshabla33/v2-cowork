import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { SettingToggle } from '../components/SettingToggle';
import { SettingDropdown } from '../components/SettingDropdown';
import { SettingSection } from '../components/SettingSection';

interface Guest {
  id: string;
  email: string;
  nombre?: string;
  acceso_hasta: string;
  creado_en: string;
}

interface GuestsSettings {
  guestCheckInEnabled: boolean;
  requireApproval: boolean;
  guestAccessDuration: number;
  allowGuestChat: boolean;
  allowGuestVideo: boolean;
}

interface SettingsGuestsProps {
  settings: GuestsSettings;
  onSettingsChange: (settings: GuestsSettings) => void;
  workspaceId: string;
}

export const SettingsGuests: React.FC<SettingsGuestsProps> = ({
  settings,
  onSettingsChange,
  workspaceId
}) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuests();
  }, [workspaceId]);

  const loadGuests = async () => {
    if (!workspaceId) return;
    
    const { data, error } = await supabase
      .from('invitaciones_pendientes')
      .select('id, email, creado_en, expira_en')
      .eq('espacio_id', workspaceId)
      .eq('usada', false)
      .order('creado_en', { ascending: false });

    if (!error && data) {
      setGuests(data.map((g: any) => ({
        id: g.id,
        email: g.email,
        acceso_hasta: g.expira_en,
        creado_en: g.creado_en
      })));
    }
    setLoading(false);
  };

  const revokeGuest = async (guestId: string) => {
    await supabase
      .from('invitaciones_pendientes')
      .delete()
      .eq('id', guestId);
    
    loadGuests();
  };

  const updateSetting = <K extends keyof GuestsSettings>(key: K, value: GuestsSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const durationOptions = [
    { value: '1', label: '1 hora' },
    { value: '8', label: '8 horas' },
    { value: '24', label: '24 horas' },
    { value: '168', label: '1 semana' },
    { value: '720', label: '30 días' }
  ];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (dateStr: string) => new Date(dateStr) < new Date();

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          Gestión de Invitados
        </h2>
        <p className="text-sm text-zinc-400">
          Controla el acceso de invitados externos al espacio
        </p>
      </div>

      <SettingSection title="Acceso de Invitados">
        <SettingToggle
          label="Check-in de invitados"
          description="Los invitados deben solicitar acceso a un miembro en línea"
          checked={settings.guestCheckInEnabled}
          onChange={(v) => updateSetting('guestCheckInEnabled', v)}
        />
        <SettingToggle
          label="Requiere aprobación"
          description="Un admin debe aprobar cada invitado antes de que pueda entrar"
          checked={settings.requireApproval}
          onChange={(v) => updateSetting('requireApproval', v)}
        />
        <SettingDropdown
          label="Duración del acceso"
          description="Tiempo que un invitado puede permanecer en el espacio"
          value={settings.guestAccessDuration.toString()}
          options={durationOptions}
          onChange={(v) => updateSetting('guestAccessDuration', parseInt(v))}
        />
      </SettingSection>

      <SettingSection title="Permisos de Invitados">
        <SettingToggle
          label="Permitir chat"
          description="Los invitados pueden enviar mensajes"
          checked={settings.allowGuestChat}
          onChange={(v) => updateSetting('allowGuestChat', v)}
        />
        <SettingToggle
          label="Permitir video"
          description="Los invitados pueden activar su cámara"
          checked={settings.allowGuestVideo}
          onChange={(v) => updateSetting('allowGuestVideo', v)}
        />
      </SettingSection>

      <SettingSection title={`Invitaciones Pendientes (${guests.length})`}>
        {loading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : guests.length === 0 ? (
          <div className="py-6 text-center text-zinc-500 text-sm">
            No hay invitaciones pendientes
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {guests.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-white">{guest.email}</p>
                  <p className="text-xs text-zinc-500">
                    Expira: {formatDate(guest.acceso_hasta)}
                    {isExpired(guest.acceso_hasta) && (
                      <span className="ml-2 text-red-400">(Expirado)</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => revokeGuest(guest.id)}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-all"
                >
                  Revocar
                </button>
              </div>
            ))}
          </div>
        )}
      </SettingSection>
    </div>
  );
};

export default SettingsGuests;
