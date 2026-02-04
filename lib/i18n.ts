// Sistema de internacionalización simple
export type Language = 'es' | 'en' | 'pt';

// Evento personalizado para cambios de idioma
const LANGUAGE_CHANGE_EVENT = 'languagechange';

export function subscribeToLanguageChange(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(LANGUAGE_CHANGE_EVENT, handler);
  return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handler);
}

export function notifyLanguageChange(): void {
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT));
}

const translations = {
  es: {
    // General
    'app.name': 'Cowork',
    'app.tagline': 'Espacio de trabajo virtual',
    
    // Navegación
    'nav.workspace': 'Espacio de trabajo',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Configuración',
    'nav.profile': 'Perfil',
    
    // Configuración - General
    'settings.general.title': 'General',
    'settings.general.description': 'Configura las preferencias generales de la aplicación',
    'settings.general.skipWelcome': 'Saltar pantalla de bienvenida',
    'settings.general.skipWelcomeDesc': 'Usa tu configuración guardada de mic y cámara al entrar',
    'settings.general.autoUpdates': 'Actualizaciones automáticas',
    'settings.general.autoUpdatesDesc': 'Instalar actualizaciones no críticas en segundo plano',
    'settings.general.language': 'Idioma de la interfaz',
    'settings.general.languageDesc': 'Elige el idioma de la aplicación',
    'settings.general.colorMode': 'Modo de color',
    'settings.general.colorModeDesc': 'Elige entre claro, oscuro o sigue la preferencia del sistema',
    
    // Configuración - Audio
    'settings.audio.title': 'Audio',
    'settings.audio.description': 'Configura tus dispositivos y preferencias de audio',
    'settings.audio.microphone': 'Micrófono',
    'settings.audio.microphoneDesc': 'Selecciona el dispositivo de entrada de audio',
    'settings.audio.speaker': 'Altavoz',
    'settings.audio.speakerDesc': 'Selecciona el dispositivo de salida de audio',
    'settings.audio.noiseReduction': 'Reducción de ruido',
    'settings.audio.echoCancellation': 'Cancelación de eco',
    'settings.audio.echoCancellationDesc': 'Reduce el eco cuando tu micrófono capta el sonido de los altavoces',
    'settings.audio.autoGain': 'Control de ganancia automático',
    'settings.audio.autoGainDesc': 'Ajusta automáticamente el nivel de entrada del micrófono',
    'settings.audio.chatSounds': 'Sonidos de chat',
    'settings.audio.chatSoundsDesc': 'Reproducir sonido al recibir mensajes nuevos',
    'settings.audio.sfxVolume': 'Volumen de efectos',
    'settings.audio.sfxVolumeDesc': 'Ajusta el volumen de los sonidos de la aplicación',
    
    // Configuración - Video
    'settings.video.title': 'Video',
    'settings.video.description': 'Configura tu cámara y preferencias de video',
    'settings.video.camera': 'Cámara',
    'settings.video.cameraDesc': 'Selecciona el dispositivo de video',
    'settings.video.hdQuality': 'Calidad HD',
    'settings.video.hdQualityDesc': 'Transmitir video en alta definición cuando esté disponible',
    'settings.video.mirror': 'Espejo de video',
    'settings.video.mirrorDesc': 'Voltea tu video como un espejo. Otros siempre ven tu video sin invertir',
    'settings.video.hideSelf': 'Ocultar mi video',
    'settings.video.hideSelfDesc': 'Oculta tu propia vista durante conversaciones, pero sigues visible para otros',
    'settings.video.autoMute': 'Auto-silenciar al salir',
    'settings.video.autoMuteDesc': 'Apaga automáticamente mic y cámara cuando cambias de pestaña',
    
    // Configuración - Notificaciones
    'settings.notifications.title': 'Notificaciones',
    'settings.notifications.description': 'Configura cómo y cuándo recibir notificaciones',
    'settings.notifications.desktop': 'Notificaciones de escritorio',
    'settings.notifications.desktopDesc': 'Mostrar notificaciones del sistema operativo',
    'settings.notifications.messageSound': 'Sonido de mensaje nuevo',
    'settings.notifications.messageSoundDesc': 'Reproducir sonido al recibir un mensaje de chat',
    'settings.notifications.nearbySound': 'Sonido de usuario cercano',
    'settings.notifications.nearbySoundDesc': 'Reproducir sonido cuando alguien se acerca en el espacio',
    'settings.notifications.mentions': 'Notificar menciones',
    'settings.notifications.mentionsDesc': 'Recibir notificación cuando te mencionan (@)',
    
    // Botones y acciones
    'button.save': 'Guardar',
    'button.cancel': 'Cancelar',
    'button.close': 'Cerrar',
    'button.select': 'Seleccionar',
    
    // Estados
    'status.online': 'En línea',
    'status.offline': 'Desconectado',
    'status.busy': 'Ocupado',
    'status.away': 'Ausente',
  },
  en: {
    // General
    'app.name': 'Cowork',
    'app.tagline': 'Virtual workspace',
    
    // Navigation
    'nav.workspace': 'Workspace',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',
    
    // Settings - General
    'settings.general.title': 'General',
    'settings.general.description': 'Configure general application preferences',
    'settings.general.skipWelcome': 'Skip welcome screen',
    'settings.general.skipWelcomeDesc': 'Use your saved mic and camera settings on entry',
    'settings.general.autoUpdates': 'Automatic updates',
    'settings.general.autoUpdatesDesc': 'Install non-critical updates in the background',
    'settings.general.language': 'Interface language',
    'settings.general.languageDesc': 'Choose the application language',
    'settings.general.colorMode': 'Color mode',
    'settings.general.colorModeDesc': 'Choose between light, dark, or follow system preference',
    
    // Settings - Audio
    'settings.audio.title': 'Audio',
    'settings.audio.description': 'Configure your audio devices and preferences',
    'settings.audio.microphone': 'Microphone',
    'settings.audio.microphoneDesc': 'Select the audio input device',
    'settings.audio.speaker': 'Speaker',
    'settings.audio.speakerDesc': 'Select the audio output device',
    'settings.audio.noiseReduction': 'Noise reduction',
    'settings.audio.echoCancellation': 'Echo cancellation',
    'settings.audio.echoCancellationDesc': 'Reduces echo when your microphone picks up speaker sound',
    'settings.audio.autoGain': 'Automatic gain control',
    'settings.audio.autoGainDesc': 'Automatically adjusts microphone input level',
    'settings.audio.chatSounds': 'Chat sounds',
    'settings.audio.chatSoundsDesc': 'Play sound when receiving new messages',
    'settings.audio.sfxVolume': 'Effects volume',
    'settings.audio.sfxVolumeDesc': 'Adjust application sound volume',
    
    // Settings - Video
    'settings.video.title': 'Video',
    'settings.video.description': 'Configure your camera and video preferences',
    'settings.video.camera': 'Camera',
    'settings.video.cameraDesc': 'Select the video device',
    'settings.video.hdQuality': 'HD Quality',
    'settings.video.hdQualityDesc': 'Stream video in high definition when available',
    'settings.video.mirror': 'Mirror video',
    'settings.video.mirrorDesc': 'Flip your video like a mirror. Others always see your video unflipped',
    'settings.video.hideSelf': 'Hide self view',
    'settings.video.hideSelfDesc': 'Hide your own view during conversations, but remain visible to others',
    'settings.video.autoMute': 'Auto-mute on leave',
    'settings.video.autoMuteDesc': 'Automatically turn off mic and camera when switching tabs',
    
    // Settings - Notifications
    'settings.notifications.title': 'Notifications',
    'settings.notifications.description': 'Configure how and when to receive notifications',
    'settings.notifications.desktop': 'Desktop notifications',
    'settings.notifications.desktopDesc': 'Show operating system notifications',
    'settings.notifications.messageSound': 'New message sound',
    'settings.notifications.messageSoundDesc': 'Play sound when receiving a chat message',
    'settings.notifications.nearbySound': 'Nearby user sound',
    'settings.notifications.nearbySoundDesc': 'Play sound when someone approaches in space',
    'settings.notifications.mentions': 'Notify mentions',
    'settings.notifications.mentionsDesc': 'Receive notification when mentioned (@)',
    
    // Buttons and actions
    'button.save': 'Save',
    'button.cancel': 'Cancel',
    'button.close': 'Close',
    'button.select': 'Select',
    
    // Status
    'status.online': 'Online',
    'status.offline': 'Offline',
    'status.busy': 'Busy',
    'status.away': 'Away',
  },
  pt: {
    // General
    'app.name': 'Cowork',
    'app.tagline': 'Espaço de trabalho virtual',
    
    // Navegação
    'nav.workspace': 'Espaço de trabalho',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Configurações',
    'nav.profile': 'Perfil',
    
    // Configuração - Geral
    'settings.general.title': 'Geral',
    'settings.general.description': 'Configure as preferências gerais do aplicativo',
    'settings.general.skipWelcome': 'Pular tela de boas-vindas',
    'settings.general.skipWelcomeDesc': 'Use sua configuração salva de microfone e câmera ao entrar',
    'settings.general.autoUpdates': 'Atualizações automáticas',
    'settings.general.autoUpdatesDesc': 'Instalar atualizações não críticas em segundo plano',
    'settings.general.language': 'Idioma da interface',
    'settings.general.languageDesc': 'Escolha o idioma do aplicativo',
    'settings.general.colorMode': 'Modo de cor',
    'settings.general.colorModeDesc': 'Escolha entre claro, escuro ou seguir a preferência do sistema',
    
    // Configuração - Áudio
    'settings.audio.title': 'Áudio',
    'settings.audio.description': 'Configure seus dispositivos e preferências de áudio',
    'settings.audio.microphone': 'Microfone',
    'settings.audio.microphoneDesc': 'Selecione o dispositivo de entrada de áudio',
    'settings.audio.speaker': 'Alto-falante',
    'settings.audio.speakerDesc': 'Selecione o dispositivo de saída de áudio',
    'settings.audio.noiseReduction': 'Redução de ruído',
    'settings.audio.echoCancellation': 'Cancelamento de eco',
    'settings.audio.echoCancellationDesc': 'Reduz o eco quando seu microfone captura o som dos alto-falantes',
    'settings.audio.autoGain': 'Controle automático de ganho',
    'settings.audio.autoGainDesc': 'Ajusta automaticamente o nível de entrada do microfone',
    'settings.audio.chatSounds': 'Sons de chat',
    'settings.audio.chatSoundsDesc': 'Reproduzir som ao receber novas mensagens',
    'settings.audio.sfxVolume': 'Volume de efeitos',
    'settings.audio.sfxVolumeDesc': 'Ajuste o volume dos sons do aplicativo',
    
    // Configuração - Vídeo
    'settings.video.title': 'Vídeo',
    'settings.video.description': 'Configure sua câmera e preferências de vídeo',
    'settings.video.camera': 'Câmera',
    'settings.video.cameraDesc': 'Selecione o dispositivo de vídeo',
    'settings.video.hdQuality': 'Qualidade HD',
    'settings.video.hdQualityDesc': 'Transmitir vídeo em alta definição quando disponível',
    'settings.video.mirror': 'Espelhar vídeo',
    'settings.video.mirrorDesc': 'Inverter seu vídeo como um espelho. Outros sempre veem seu vídeo normal',
    'settings.video.hideSelf': 'Ocultar visualização própria',
    'settings.video.hideSelfDesc': 'Oculta sua própria visualização durante conversas, mas continua visível para outros',
    'settings.video.autoMute': 'Auto-silenciar ao sair',
    'settings.video.autoMuteDesc': 'Desliga automaticamente microfone e câmera ao trocar de aba',
    
    // Configuração - Notificações
    'settings.notifications.title': 'Notificações',
    'settings.notifications.description': 'Configure como e quando receber notificações',
    'settings.notifications.desktop': 'Notificações de desktop',
    'settings.notifications.desktopDesc': 'Mostrar notificações do sistema operacional',
    'settings.notifications.messageSound': 'Som de nova mensagem',
    'settings.notifications.messageSoundDesc': 'Reproduzir som ao receber uma mensagem de chat',
    'settings.notifications.nearbySound': 'Som de usuário próximo',
    'settings.notifications.nearbySoundDesc': 'Reproduzir som quando alguém se aproxima no espaço',
    'settings.notifications.mentions': 'Notificar menções',
    'settings.notifications.mentionsDesc': 'Receber notificação quando mencionado (@)',
    
    // Botões e ações
    'button.save': 'Salvar',
    'button.cancel': 'Cancelar',
    'button.close': 'Fechar',
    'button.select': 'Selecionar',
    
    // Status
    'status.online': 'Online',
    'status.offline': 'Offline',
    'status.busy': 'Ocupado',
    'status.away': 'Ausente',
  }
};

// Función para obtener el idioma guardado
export function getCurrentLanguage(): Language {
  if (typeof window === 'undefined') return 'es';
  
  const saved = localStorage.getItem('user_settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed.general?.language || 'es';
    } catch {
      return 'es';
    }
  }
  return 'es';
}

// Función de traducción
export function t(key: string, lang?: Language): string {
  const language = lang || getCurrentLanguage();
  return translations[language]?.[key] || translations['es'][key] || key;
}

// Hook para react
export function useTranslation() {
  const [language, setLanguageState] = useState<Language>(getCurrentLanguage());
  
  useEffect(() => {
    const handleStorageChange = () => {
      setLanguageState(getCurrentLanguage());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const setLanguage = (lang: Language) => {
    const saved = localStorage.getItem('user_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.general = { ...parsed.general, language: lang };
      localStorage.setItem('user_settings', JSON.stringify(parsed));
      setLanguageState(lang);
      window.dispatchEvent(new Event('storage'));
    }
  };
  
  return {
    t: (key: string) => t(key, language),
    language,
    setLanguage
  };
}

import { useState, useEffect } from 'react';
