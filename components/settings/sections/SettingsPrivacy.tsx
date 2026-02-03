import React from 'react';
import { SettingToggle } from '../components/SettingToggle';
import { SettingDropdown } from '../components/SettingDropdown';
import { SettingSection } from '../components/SettingSection';

interface PrivacySettings {
  showOnlineStatus: boolean;
  showActivityStatus: boolean;
  allowDirectMessages: boolean;
  showLocationInSpace: boolean;
  sharePresenceWithTeam: boolean;
  activityHistoryEnabled: boolean;
  activityRetentionDays: number;
}

interface SettingsPrivacyProps {
  settings: PrivacySettings;
  onSettingsChange: (settings: PrivacySettings) => void;
}

export const SettingsPrivacy: React.FC<SettingsPrivacyProps> = ({
  settings,
  onSettingsChange
}) => {
  const updateSetting = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const retentionOptions = [
    { value: '7', label: '7 días' },
    { value: '30', label: '30 días' },
    { value: '90', label: '90 días' },
    { value: '365', label: '1 año' },
    { value: '0', label: 'Nunca borrar' }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          Privacidad y Actividad
        </h2>
        <p className="text-sm text-zinc-400">
          Controla tu visibilidad y datos de actividad
        </p>
      </div>

      <SettingSection title="Visibilidad">
        <SettingToggle
          label="Mostrar estado en línea"
          description="Los demás pueden ver cuando estás conectado"
          checked={settings.showOnlineStatus}
          onChange={(v) => updateSetting('showOnlineStatus', v)}
        />
        <SettingToggle
          label="Mostrar estado de actividad"
          description="Mostrar si estás disponible, ocupado, ausente, etc."
          checked={settings.showActivityStatus}
          onChange={(v) => updateSetting('showActivityStatus', v)}
        />
        <SettingToggle
          label="Mostrar ubicación en el espacio"
          description="Los demás pueden ver dónde estás en el mapa"
          checked={settings.showLocationInSpace}
          onChange={(v) => updateSetting('showLocationInSpace', v)}
        />
      </SettingSection>

      <SettingSection title="Comunicación">
        <SettingToggle
          label="Permitir mensajes directos"
          description="Cualquier miembro puede enviarte mensajes privados"
          checked={settings.allowDirectMessages}
          onChange={(v) => updateSetting('allowDirectMessages', v)}
        />
        <SettingToggle
          label="Compartir presencia con el equipo"
          description="Tu estado se sincroniza con integraciones (Slack, etc.)"
          checked={settings.sharePresenceWithTeam}
          onChange={(v) => updateSetting('sharePresenceWithTeam', v)}
        />
      </SettingSection>

      <SettingSection title="Historial de Actividad">
        <SettingToggle
          label="Registrar historial de actividad"
          description="Guardar registro de tu actividad en el espacio"
          checked={settings.activityHistoryEnabled}
          onChange={(v) => updateSetting('activityHistoryEnabled', v)}
        />
        {settings.activityHistoryEnabled && (
          <SettingDropdown
            label="Retención de datos"
            description="Cuánto tiempo conservar el historial de actividad"
            value={settings.activityRetentionDays.toString()}
            options={retentionOptions}
            onChange={(v) => updateSetting('activityRetentionDays', parseInt(v))}
          />
        )}
      </SettingSection>

      <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-400">Nota de privacidad</p>
            <p className="text-xs text-zinc-400 mt-1">
              Los administradores del espacio pueden tener acceso a ciertos datos de actividad 
              para fines de gestión y seguridad del equipo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPrivacy;
