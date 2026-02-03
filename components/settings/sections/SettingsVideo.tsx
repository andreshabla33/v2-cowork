import React, { useState, useEffect } from 'react';
import { SettingToggle } from '../components/SettingToggle';
import { SettingDropdown } from '../components/SettingDropdown';
import { SettingSection } from '../components/SettingSection';

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

  useEffect(() => {
    const loadDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(devices.filter(d => d.kind === 'videoinput'));
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
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          Video
        </h2>
        <p className="text-sm text-zinc-400">
          Configura tu cámara y preferencias de video
        </p>
      </div>

      <SettingSection title="Dispositivo">
        <SettingDropdown
          label="Cámara"
          description="Selecciona el dispositivo de video"
          value={settings.selectedCameraId}
          options={cameraOptions.length > 0 ? cameraOptions : [{ value: '', label: 'No hay dispositivos' }]}
          onChange={(v) => updateSetting('selectedCameraId', v)}
        />
      </SettingSection>

      <SettingSection title="Calidad">
        <SettingToggle
          label="Calidad HD"
          description="Transmitir video en alta definición cuando esté disponible"
          checked={settings.hdQuality}
          onChange={(v) => updateSetting('hdQuality', v)}
        />
      </SettingSection>

      <SettingSection title="Preferencias de Video">
        <SettingToggle
          label="Espejo de video"
          description="Voltea tu video como un espejo. Otros siempre ven tu video sin invertir"
          checked={settings.mirrorVideo}
          onChange={(v) => updateSetting('mirrorVideo', v)}
        />
        <SettingToggle
          label="Ocultar mi video"
          description="Oculta tu propia vista durante conversaciones, pero sigues visible para otros"
          checked={settings.hideSelfView}
          onChange={(v) => updateSetting('hideSelfView', v)}
        />
        <SettingToggle
          label="Auto-silenciar al salir"
          description="Apaga automáticamente mic y cámara cuando cambias de pestaña"
          checked={settings.autoIdleMuting}
          onChange={(v) => updateSetting('autoIdleMuting', v)}
        />
      </SettingSection>
    </div>
  );
};

export default SettingsVideo;
