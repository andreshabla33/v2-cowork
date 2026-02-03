import React from 'react';
import { SettingToggle } from '../components/SettingToggle';
import { SettingDropdown } from '../components/SettingDropdown';
import { SettingSection } from '../components/SettingSection';

interface GeneralSettings {
  skipWelcomeScreen: boolean;
  colorMode: string;
  language: string;
  autoUpdates: boolean;
}

interface SettingsGeneralProps {
  settings: GeneralSettings;
  onSettingsChange: (settings: GeneralSettings) => void;
}

export const SettingsGeneral: React.FC<SettingsGeneralProps> = ({
  settings,
  onSettingsChange
}) => {
  const updateSetting = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const colorModeOptions = [
    { value: 'dark', label: '🌑 Oscuro' },
    { value: 'light', label: '☀️ Claro' },
    { value: 'space', label: '🚀 Espacial' },
    { value: 'arcade', label: '🎮 Arcade' }
  ];

  const languageOptions = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
    { value: 'pt', label: 'Português' }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          General
        </h2>
        <p className="text-sm text-zinc-400">
          Configura las preferencias generales de la aplicación
        </p>
      </div>

      <SettingSection title="Inicio">
        <SettingToggle
          label="Saltar pantalla de bienvenida"
          description="Usa tu configuración guardada de mic y cámara al entrar"
          checked={settings.skipWelcomeScreen}
          onChange={(v) => updateSetting('skipWelcomeScreen', v)}
        />
        <SettingToggle
          label="Actualizaciones automáticas"
          description="Instalar actualizaciones no críticas en segundo plano"
          checked={settings.autoUpdates}
          onChange={(v) => updateSetting('autoUpdates', v)}
        />
      </SettingSection>

      <SettingSection title="Idioma">
        <SettingDropdown
          label="Idioma de la interfaz"
          description="Elige el idioma de la aplicación"
          value={settings.language}
          options={languageOptions}
          onChange={(v) => updateSetting('language', v)}
        />
      </SettingSection>

      <SettingSection title="Apariencia">
        <SettingDropdown
          label="Modo de color"
          description="Elige entre claro, oscuro o sigue la preferencia del sistema"
          value={settings.colorMode}
          options={colorModeOptions}
          onChange={(v) => updateSetting('colorMode', v)}
        />
      </SettingSection>
    </div>
  );
};

export default SettingsGeneral;
