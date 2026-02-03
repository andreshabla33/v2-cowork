import React from 'react';
import { SettingToggle } from '../components/SettingToggle';
import { SettingDropdown } from '../components/SettingDropdown';
import { SettingSection } from '../components/SettingSection';

interface MeetingsSettings {
  enableRecordingForMembers: boolean;
  autoMuteOnJoin: boolean;
  autoCameraOffOnJoin: boolean;
  showTranscription: boolean;
  aiSummaryEnabled: boolean;
  maxParticipants: number;
  waitingRoomEnabled: boolean;
  allowScreenShare: boolean;
}

interface SettingsMeetingsProps {
  settings: MeetingsSettings;
  onSettingsChange: (settings: MeetingsSettings) => void;
  isAdmin: boolean;
}

export const SettingsMeetings: React.FC<SettingsMeetingsProps> = ({
  settings,
  onSettingsChange,
  isAdmin
}) => {
  const updateSetting = <K extends keyof MeetingsSettings>(key: K, value: MeetingsSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const participantOptions = [
    { value: '10', label: '10 participantes' },
    { value: '25', label: '25 participantes' },
    { value: '50', label: '50 participantes' },
    { value: '100', label: '100 participantes' }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          Reuniones
        </h2>
        <p className="text-sm text-zinc-400">
          Configura las preferencias de reuniones y grabación
        </p>
      </div>

      <SettingSection title="Al unirse a reunión">
        <SettingToggle
          label="Micrófono apagado al entrar"
          description="Tu micrófono estará silenciado cuando te unas a una reunión"
          checked={settings.autoMuteOnJoin}
          onChange={(v) => updateSetting('autoMuteOnJoin', v)}
        />
        <SettingToggle
          label="Cámara apagada al entrar"
          description="Tu cámara estará desactivada cuando te unas a una reunión"
          checked={settings.autoCameraOffOnJoin}
          onChange={(v) => updateSetting('autoCameraOffOnJoin', v)}
        />
      </SettingSection>

      <SettingSection title="Grabación y Transcripción">
        {isAdmin && (
          <SettingToggle
            label="Permitir grabación a miembros"
            description="Todos los miembros pueden grabar reuniones (no solo admins)"
            checked={settings.enableRecordingForMembers}
            onChange={(v) => updateSetting('enableRecordingForMembers', v)}
          />
        )}
        <SettingToggle
          label="Transcripción automática"
          description="Generar transcripción de texto durante la grabación"
          checked={settings.showTranscription}
          onChange={(v) => updateSetting('showTranscription', v)}
        />
        <SettingToggle
          label="Resumen con IA"
          description="Generar un resumen automático al finalizar la reunión"
          checked={settings.aiSummaryEnabled}
          onChange={(v) => updateSetting('aiSummaryEnabled', v)}
        />
      </SettingSection>

      {isAdmin && (
        <SettingSection title="Configuración del Espacio">
          <SettingDropdown
            label="Máximo de participantes"
            description="Límite de personas en una reunión"
            value={settings.maxParticipants.toString()}
            options={participantOptions}
            onChange={(v) => updateSetting('maxParticipants', parseInt(v))}
          />
          <SettingToggle
            label="Sala de espera"
            description="Los invitados deben ser admitidos antes de entrar"
            checked={settings.waitingRoomEnabled}
            onChange={(v) => updateSetting('waitingRoomEnabled', v)}
          />
          <SettingToggle
            label="Permitir compartir pantalla"
            description="Los participantes pueden compartir su pantalla"
            checked={settings.allowScreenShare}
            onChange={(v) => updateSetting('allowScreenShare', v)}
          />
        </SettingSection>
      )}
    </div>
  );
};

export default SettingsMeetings;
