import React, { useState, useEffect } from 'react';
import { SettingToggle } from '../components/SettingToggle';
import { SettingDropdown } from '../components/SettingDropdown';
import { SettingSection } from '../components/SettingSection';
import { t, Language, getCurrentLanguage, subscribeToLanguageChange } from '../../../lib/i18n';

interface VideoSettings {
  selectedCameraId: string;
  hdQuality: boolean;
  mirrorVideo: boolean;
  hideSelfView: boolean;
  autoIdleMuting: boolean;
}

interface SettingsVideoProps {
  settings: VideoSettings;
  onSettingsChange: (settings: VideoSettings) => void;
}

export const SettingsVideo: React.FC<SettingsVideoProps> = ({
  settings,
  onSettingsChange
}) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentLang, setCurrentLang] = useState<Language>(getCurrentLanguage());

  // Escuchar cambios de idioma
  useEffect(() => {
    const unsubscribe = subscribeToLanguageChange(() => {
      setCurrentLang(getCurrentLanguage());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(devices.filter(d => d.kind === 'videoinput'));
        tempStream.getTracks().forEach(t => t.stop());
      } catch (err) {
        console.error('Error loading video devices:', err);
      }
    };
    loadDevices();
  }, []);

  const updateSetting = <K extends keyof VideoSettings>(key: K, value: VideoSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const cameraOptions = cameras.map(c => ({
    value: c.deviceId,
    label: c.label || `Cámara ${cameras.indexOf(c) + 1}`
  }));

  return (
    <div>
      <div className="mb-8 lg:mb-6">
        <h2 className="text-2xl lg:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2 lg:mb-1">
          {t('settings.video.title', currentLang)}
        </h2>
        <p className="text-sm lg:text-xs text-zinc-400">
          {t('settings.video.description', currentLang)}
        </p>
      </div>

      <SettingSection title={currentLang === 'en' ? 'Device' : currentLang === 'pt' ? 'Dispositivo' : 'Dispositivo'}>
        <SettingDropdown
          label={t('settings.video.camera', currentLang)}
          description={t('settings.video.cameraDesc', currentLang)}
          value={settings.selectedCameraId}
          options={cameraOptions.length > 0 ? cameraOptions : [{ value: '', label: 'No hay dispositivos' }]}
          onChange={(v) => updateSetting('selectedCameraId', v)}
        />
      </SettingSection>

      <SettingSection title={currentLang === 'en' ? 'Quality' : currentLang === 'pt' ? 'Qualidade' : 'Calidad'}>
        <SettingToggle
          label={t('settings.video.hdQuality', currentLang)}
          description={t('settings.video.hdQualityDesc', currentLang)}
          checked={settings.hdQuality}
          onChange={(v) => updateSetting('hdQuality', v)}
        />
      </SettingSection>

      <SettingSection title={currentLang === 'en' ? 'Video Preferences' : currentLang === 'pt' ? 'Preferências de Vídeo' : 'Preferencias de Video'}>
        <SettingToggle
          label={t('settings.video.mirror', currentLang)}
          description={t('settings.video.mirrorDesc', currentLang)}
          checked={settings.mirrorVideo}
          onChange={(v) => updateSetting('mirrorVideo', v)}
        />
        <SettingToggle
          label={t('settings.video.hideSelf', currentLang)}
          description={t('settings.video.hideSelfDesc', currentLang)}
          checked={settings.hideSelfView}
          onChange={(v) => updateSetting('hideSelfView', v)}
        />
        <SettingToggle
          label={t('settings.video.autoMute', currentLang)}
          description={t('settings.video.autoMuteDesc', currentLang)}
          checked={settings.autoIdleMuting}
          onChange={(v) => updateSetting('autoIdleMuting', v)}
        />
      </SettingSection>
    </div>
  );
};

export default SettingsVideo;
