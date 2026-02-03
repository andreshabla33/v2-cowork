import React, { useState, useEffect } from 'react';
import { SettingToggle } from '../components/SettingToggle';
import { SettingDropdown } from '../components/SettingDropdown';
import { SettingSlider } from '../components/SettingSlider';
import { SettingSection } from '../components/SettingSection';

interface AudioSettings {
  selectedMicrophoneId: string;
  selectedSpeakerId: string;
  noiseReduction: boolean;
  noiseReductionLevel: string;
  echoCancellation: boolean;
  autoGainControl: boolean;
  chatSounds: boolean;
  sfxVolume: number;
}

interface SettingsAudioProps {
  settings: AudioSettings;
  onSettingsChange: (settings: AudioSettings) => void;
}

export const SettingsAudio: React.FC<SettingsAudioProps> = ({
  settings,
  onSettingsChange
}) => {
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        setMicrophones(devices.filter(d => d.kind === 'audioinput'));
        setSpeakers(devices.filter(d => d.kind === 'audiooutput'));
      } catch (err) {
        console.error('Error loading audio devices:', err);
      }
    };
    loadDevices();
  }, []);

  const updateSetting = <K extends keyof AudioSettings>(key: K, value: AudioSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const microphoneOptions = microphones.map(m => ({
    value: m.deviceId,
    label: m.label || `Micrófono ${microphones.indexOf(m) + 1}`
  }));

  const speakerOptions = speakers.map(s => ({
    value: s.deviceId,
    label: s.label || `Altavoz ${speakers.indexOf(s) + 1}`
  }));

  const noiseReductionOptions = [
    { value: 'off', label: 'Desactivado' },
    { value: 'standard', label: 'Estándar' },
    { value: 'enhanced', label: 'Mejorado' }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          Audio
        </h2>
        <p className="text-sm text-zinc-400">
          Configura tus dispositivos y preferencias de audio
        </p>
      </div>

      <SettingSection title="Dispositivos">
        <SettingDropdown
          label="Micrófono"
          description="Selecciona el dispositivo de entrada de audio"
          value={settings.selectedMicrophoneId}
          options={microphoneOptions.length > 0 ? microphoneOptions : [{ value: '', label: 'No hay dispositivos' }]}
          onChange={(v) => updateSetting('selectedMicrophoneId', v)}
        />
        <SettingDropdown
          label="Altavoz"
          description="Selecciona el dispositivo de salida de audio"
          value={settings.selectedSpeakerId}
          options={speakerOptions.length > 0 ? speakerOptions : [{ value: '', label: 'No hay dispositivos' }]}
          onChange={(v) => updateSetting('selectedSpeakerId', v)}
        />
      </SettingSection>

      <SettingSection title="Procesamiento de Audio">
        <SettingDropdown
          label="Reducción de ruido"
          description="Suprime automáticamente el ruido de fondo"
          value={settings.noiseReductionLevel}
          options={noiseReductionOptions}
          onChange={(v) => updateSetting('noiseReductionLevel', v)}
        />
        <SettingToggle
          label="Cancelación de eco"
          description="Reduce el eco cuando tu micrófono capta el sonido de los altavoces"
          checked={settings.echoCancellation}
          onChange={(v) => updateSetting('echoCancellation', v)}
        />
        <SettingToggle
          label="Control de ganancia automático"
          description="Ajusta automáticamente el nivel de entrada del micrófono"
          checked={settings.autoGainControl}
          onChange={(v) => updateSetting('autoGainControl', v)}
        />
      </SettingSection>

      <SettingSection title="Sonidos">
        <SettingToggle
          label="Sonidos de chat"
          description="Reproducir sonido al recibir mensajes nuevos"
          checked={settings.chatSounds}
          onChange={(v) => updateSetting('chatSounds', v)}
        />
        <SettingSlider
          label="Volumen de efectos"
          description="Ajusta el volumen de los sonidos de la aplicación"
          value={settings.sfxVolume}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => updateSetting('sfxVolume', v)}
        />
      </SettingSection>
    </div>
  );
};

export default SettingsAudio;
