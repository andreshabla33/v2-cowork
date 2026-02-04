import React, { useState, useEffect } from 'react';
import { SettingToggle } from '../components/SettingToggle';
import { SettingDropdown } from '../components/SettingDropdown';
import { SettingSection } from '../components/SettingSection';
import { Language, getCurrentLanguage, subscribeToLanguageChange } from '../../../lib/i18n';

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
  const [currentLang, setCurrentLang] = useState<Language>(getCurrentLanguage());

  // Escuchar cambios de idioma
  useEffect(() => {
    const unsubscribe = subscribeToLanguageChange(() => {
      setCurrentLang(getCurrentLanguage());
    });
    return unsubscribe;
  }, []);

  const updateSetting = <K extends keyof MeetingsSettings>(key: K, value: MeetingsSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const participantOptions = [
    { value: '10', label: currentLang === 'en' ? '10 participants' : currentLang === 'pt' ? '10 participantes' : '10 participantes' },
    { value: '25', label: currentLang === 'en' ? '25 participants' : currentLang === 'pt' ? '25 participantes' : '25 participantes' },
    { value: '50', label: currentLang === 'en' ? '50 participants' : currentLang === 'pt' ? '50 participantes' : '50 participantes' },
    { value: '100', label: currentLang === 'en' ? '100 participants' : currentLang === 'pt' ? '100 participantes' : '100 participantes' }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          {currentLang === 'en' ? 'Meetings' : currentLang === 'pt' ? 'Reuniões' : 'Reuniones'}
        </h2>
        <p className="text-sm text-zinc-400">
          {currentLang === 'en' ? 'Configure meeting and recording preferences' : currentLang === 'pt' ? 'Configure as preferências de reunião e gravação' : 'Configura las preferencias de reuniones y grabación'}
        </p>
      </div>

      <SettingSection title={currentLang === 'en' ? 'When joining a meeting' : currentLang === 'pt' ? 'Ao entrar em uma reunião' : 'Al unirse a reunión'}>
        <SettingToggle
          label={currentLang === 'en' ? 'Mic muted on entry' : currentLang === 'pt' ? 'Microfone silenciado ao entrar' : 'Micrófono apagado al entrar'}
          description={currentLang === 'en' ? 'Your microphone will be muted when you join a meeting' : currentLang === 'pt' ? 'Seu microfone estará silenciado quando entrar em uma reunião' : 'Tu micrófono estará silenciado cuando te unas a una reunión'}
          checked={settings.autoMuteOnJoin}
          onChange={(v) => updateSetting('autoMuteOnJoin', v)}
        />
        <SettingToggle
          label={currentLang === 'en' ? 'Camera off on entry' : currentLang === 'pt' ? 'Câmera desligada ao entrar' : 'Cámara apagada al entrar'}
          description={currentLang === 'en' ? 'Your camera will be disabled when you join a meeting' : currentLang === 'pt' ? 'Sua câmera estará desativada quando entrar em uma reunião' : 'Tu cámara estará desactivada cuando te unas a una reunión'}
          checked={settings.autoCameraOffOnJoin}
          onChange={(v) => updateSetting('autoCameraOffOnJoin', v)}
        />
      </SettingSection>

      <SettingSection title={currentLang === 'en' ? 'Recording & Transcription' : currentLang === 'pt' ? 'Gravação e Transcrição' : 'Grabación y Transcripción'}>
        {isAdmin && (
          <SettingToggle
            label={currentLang === 'en' ? 'Allow recording for members' : currentLang === 'pt' ? 'Permitir gravação para membros' : 'Permitir grabación a miembros'}
            description={currentLang === 'en' ? 'All members can record meetings (not just admins)' : currentLang === 'pt' ? 'Todos os membros podem gravar reuniões (não apenas admins)' : 'Todos los miembros pueden grabar reuniones (no solo admins)'}
            checked={settings.enableRecordingForMembers}
            onChange={(v) => updateSetting('enableRecordingForMembers', v)}
          />
        )}
        <SettingToggle
          label={currentLang === 'en' ? 'Automatic transcription' : currentLang === 'pt' ? 'Transcrição automática' : 'Transcripción automática'}
          description={currentLang === 'en' ? 'Generate text transcription during recording' : currentLang === 'pt' ? 'Gerar transcrição de texto durante a gravação' : 'Generar transcripción de texto durante la grabación'}
          checked={settings.showTranscription}
          onChange={(v) => updateSetting('showTranscription', v)}
        />
        <SettingToggle
          label={currentLang === 'en' ? 'AI summary' : currentLang === 'pt' ? 'Resumo com IA' : 'Resumen con IA'}
          description={currentLang === 'en' ? 'Generate an automatic summary at the end of the meeting' : currentLang === 'pt' ? 'Gerar um resumo automático ao final da reunião' : 'Generar un resumen automático al finalizar la reunión'}
          checked={settings.aiSummaryEnabled}
          onChange={(v) => updateSetting('aiSummaryEnabled', v)}
        />
      </SettingSection>

      {isAdmin && (
        <SettingSection title={currentLang === 'en' ? 'Space Settings' : currentLang === 'pt' ? 'Configurações do Espaço' : 'Configuración del Espacio'}>
          <SettingDropdown
            label={currentLang === 'en' ? 'Maximum participants' : currentLang === 'pt' ? 'Máximo de participantes' : 'Máximo de participantes'}
            description={currentLang === 'en' ? 'Limit of people in a meeting' : currentLang === 'pt' ? 'Limite de pessoas em uma reunião' : 'Límite de personas en una reunión'}
            value={settings.maxParticipants.toString()}
            options={participantOptions}
            onChange={(v) => updateSetting('maxParticipants', parseInt(v))}
          />
          <SettingToggle
            label={currentLang === 'en' ? 'Waiting room' : currentLang === 'pt' ? 'Sala de espera' : 'Sala de espera'}
            description={currentLang === 'en' ? 'Guests must be admitted before entering' : currentLang === 'pt' ? 'Convidados devem ser admitidos antes de entrar' : 'Los invitados deben ser admitidos antes de entrar'}
            checked={settings.waitingRoomEnabled}
            onChange={(v) => updateSetting('waitingRoomEnabled', v)}
          />
          <SettingToggle
            label={currentLang === 'en' ? 'Allow screen share' : currentLang === 'pt' ? 'Permitir compartilhar tela' : 'Permitir compartir pantalla'}
            description={currentLang === 'en' ? 'Participants can share their screen' : currentLang === 'pt' ? 'Participantes podem compartilhar sua tela' : 'Los participantes pueden compartir su pantalla'}
            checked={settings.allowScreenShare}
            onChange={(v) => updateSetting('allowScreenShare', v)}
          />
        </SettingSection>
      )}
    </div>
  );
};

export default SettingsMeetings;
