import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingToggle } from '../components/SettingToggle';
import { SettingDropdown } from '../components/SettingDropdown';
import { SettingSection } from '../components/SettingSection';
import { Language, getCurrentLanguage, setLanguage } from '../../../lib/i18n';

interface GeneralSettings {
  skipWelcomeScreen: boolean;
  colorMode: string;
  language: Language;
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
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState<Language>(getCurrentLanguage());

  // Escuchar cambios de idioma de i18next
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLang(lng.substring(0, 2) as Language);
    };
    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const updateSetting = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
    
    // Si cambió el idioma, usar i18next para cambiar
    if (key === 'language') {
      setLanguage(value as Language);
    }
  };

  const colorModeOptions = [
    { value: 'dark', label: '🌑 ' + (currentLang === 'en' ? 'Dark' : currentLang === 'pt' ? 'Escuro' : 'Oscuro') },
    { value: 'light', label: '☀️ ' + (currentLang === 'en' ? 'Light' : currentLang === 'pt' ? 'Claro' : 'Claro') },
    { value: 'space', label: '🚀 ' + (currentLang === 'en' ? 'Space' : currentLang === 'pt' ? 'Espacial' : 'Espacial') },
    { value: 'arcade', label: '🎮 Arcade' }
  ];

  const languageOptions = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
    { value: 'pt', label: 'Português' }
  ];

  const getTitle = (key: string) => {
    const titles: Record<string, Record<Language, string>> = {
      start: { es: 'Inicio', en: 'Start', pt: 'Início' },
      language: { es: 'Idioma', en: 'Language', pt: 'Idioma' },
      appearance: { es: 'Apariencia', en: 'Appearance', pt: 'Aparência' }
    };
    return titles[key]?.[currentLang] || titles[key]?.['es'] || key;
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          {t('settings.general.title')}
        </h2>
        <p className="text-sm text-zinc-400">
          {t('settings.general.description')}
        </p>
      </div>

      <SettingSection title={getTitle('start')}>
        <SettingToggle
          label={t('settings.general.skipWelcome')}
          description={t('settings.general.skipWelcomeDesc')}
          checked={settings.skipWelcomeScreen}
          onChange={(v) => updateSetting('skipWelcomeScreen', v)}
        />
        <SettingToggle
          label={t('settings.general.autoUpdates')}
          description={t('settings.general.autoUpdatesDesc')}
          checked={settings.autoUpdates}
          onChange={(v) => updateSetting('autoUpdates', v)}
        />
      </SettingSection>

      <SettingSection title={getTitle('language')}>
        <SettingDropdown
          label={t('settings.general.language')}
          description={t('settings.general.languageDesc')}
          value={settings.language}
          options={languageOptions}
          onChange={(v) => updateSetting('language', v as Language)}
        />
      </SettingSection>

      <SettingSection title={getTitle('appearance')}>
        <SettingDropdown
          label={t('settings.general.colorMode')}
          description={t('settings.general.colorModeDesc')}
          value={settings.colorMode}
          options={colorModeOptions}
          onChange={(v) => updateSetting('colorMode', v)}
        />
      </SettingSection>
    </div>
  );
};

export default SettingsGeneral;
