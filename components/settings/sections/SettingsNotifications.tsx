import React from 'react';
import { SettingToggle } from '../components/SettingToggle';
import { SettingSection } from '../components/SettingSection';

interface NotificationSettings {
  desktopNotifications: boolean;
  newMessageSound: boolean;
  nearbyUserSound: boolean;
  mentionNotifications: boolean;
}

interface SettingsNotificationsProps {
  settings: NotificationSettings;
  onSettingsChange: (settings: NotificationSettings) => void;
}

export const SettingsNotifications: React.FC<SettingsNotificationsProps> = ({
  settings,
  onSettingsChange
}) => {
  const updateSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          Notificaciones
        </h2>
        <p className="text-sm text-zinc-400">
          Configura cómo y cuándo recibir notificaciones
        </p>
      </div>

      <SettingSection title="Notificaciones del Sistema">
        <SettingToggle
          label="Notificaciones de escritorio"
          description="Mostrar notificaciones del sistema operativo"
          checked={settings.desktopNotifications}
          onChange={(v) => updateSetting('desktopNotifications', v)}
        />
      </SettingSection>

      <SettingSection title="Sonidos">
        <SettingToggle
          label="Sonido de mensaje nuevo"
          description="Reproducir sonido al recibir un mensaje de chat"
          checked={settings.newMessageSound}
          onChange={(v) => updateSetting('newMessageSound', v)}
        />
        <SettingToggle
          label="Sonido de usuario cercano"
          description="Reproducir sonido cuando alguien se acerca en el espacio"
          checked={settings.nearbyUserSound}
          onChange={(v) => updateSetting('nearbyUserSound', v)}
        />
      </SettingSection>

      <SettingSection title="Menciones">
        <SettingToggle
          label="Notificar menciones"
          description="Recibir notificación cuando te mencionan (@)"
          checked={settings.mentionNotifications}
          onChange={(v) => updateSetting('mentionNotifications', v)}
        />
      </SettingSection>
    </div>
  );
};

export default SettingsNotifications;
