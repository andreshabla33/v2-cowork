// ============== UTILIDAD PARA LEER SETTINGS DEL USUARIO ==============
// Los settings se guardan en localStorage desde SettingsModal.
// Esta utilidad permite a cualquier componente leer los settings sin importar SettingsModal.

const STORAGE_KEY = 'user_settings';

export interface UserSettings {
  general: {
    skipWelcomeScreen: boolean;
    colorMode: string;
    language: string;
    autoUpdates: boolean;
  };
  audio: {
    selectedMicrophoneId: string;
    selectedSpeakerId: string;
    noiseReduction: boolean;
    noiseReductionLevel: string;
    echoCancellation: boolean;
    autoGainControl: boolean;
    chatSounds: boolean;
    sfxVolume: number;
  };
  video: {
    selectedCameraId: string;
    hdQuality: boolean;
    mirrorVideo: boolean;
    hideSelfView: boolean;
    autoIdleMuting: boolean;
  };
  meetings: {
    enableRecordingForMembers: boolean;
    autoMuteOnJoin: boolean;
    autoCameraOffOnJoin: boolean;
    showTranscription: boolean;
    aiSummaryEnabled: boolean;
    maxParticipants: number;
    waitingRoomEnabled: boolean;
    allowScreenShare: boolean;
  };
  notifications: {
    desktopNotifications: boolean;
    newMessageSound: boolean;
    nearbyUserSound: boolean;
    mentionNotifications: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    showActivityStatus: boolean;
    allowDirectMessages: boolean;
    showLocationInSpace: boolean;
    sharePresenceWithTeam: boolean;
    activityHistoryEnabled: boolean;
    activityRetentionDays: number;
  };
  performance: {
    graphicsQuality: string;
    showVideos: boolean;
    showAvatarAnimations: boolean;
    reducedMotion: boolean;
    hardwareAcceleration: boolean;
    maxVideoStreams: number;
    batterySaver: boolean;
  };
  space3d: {
    cameraMode: string;
    movementSpeed: number;
    cameraSensitivity: number;
    invertYAxis: boolean;
    showFloorGrid: boolean;
    showNamesAboveAvatars: boolean;
    spatialAudio: boolean;
    proximityRadius: number;
  };
  calendar: {
    googleConnected: boolean;
    syncEnabled: boolean;
    defaultReminder: number;
    showGoogleEvents: boolean;
    autoCreateGoogleEvent: boolean;
  };
}

const defaultSettings: UserSettings = {
  general: {
    skipWelcomeScreen: false,
    colorMode: 'dark',
    language: 'es',
    autoUpdates: true
  },
  audio: {
    selectedMicrophoneId: '',
    selectedSpeakerId: '',
    noiseReduction: true,
    noiseReductionLevel: 'standard',
    echoCancellation: true,
    autoGainControl: true,
    chatSounds: true,
    sfxVolume: 70
  },
  video: {
    selectedCameraId: '',
    hdQuality: true,
    mirrorVideo: true,
    hideSelfView: false,
    autoIdleMuting: true
  },
  meetings: {
    enableRecordingForMembers: false,
    autoMuteOnJoin: false,
    autoCameraOffOnJoin: false,
    showTranscription: true,
    aiSummaryEnabled: true,
    maxParticipants: 25,
    waitingRoomEnabled: false,
    allowScreenShare: true
  },
  notifications: {
    desktopNotifications: true,
    newMessageSound: true,
    nearbyUserSound: false,
    mentionNotifications: true
  },
  privacy: {
    showOnlineStatus: true,
    showActivityStatus: true,
    allowDirectMessages: true,
    showLocationInSpace: true,
    sharePresenceWithTeam: false,
    activityHistoryEnabled: true,
    activityRetentionDays: 30
  },
  performance: {
    graphicsQuality: 'auto',
    showVideos: true,
    showAvatarAnimations: true,
    reducedMotion: false,
    hardwareAcceleration: true,
    maxVideoStreams: 8,
    batterySaver: false
  },
  space3d: {
    cameraMode: 'free',
    movementSpeed: 5,
    cameraSensitivity: 5,
    invertYAxis: false,
    showFloorGrid: true,
    showNamesAboveAvatars: true,
    spatialAudio: true,
    proximityRadius: 150
  },
  calendar: {
    googleConnected: false,
    syncEnabled: true,
    defaultReminder: 15,
    showGoogleEvents: true,
    autoCreateGoogleEvent: true
  }
};

// Leer todos los settings
export function getUserSettings(): UserSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.error('Error loading user settings:', e);
  }
  return defaultSettings;
}

// Leer una sección específica
export function getSettingsSection<K extends keyof UserSettings>(section: K): UserSettings[K] {
  const settings = getUserSettings();
  return settings[section];
}

// Suscribirse a cambios de settings (usa storage event para cross-tab)
const listeners: Set<() => void> = new Set();

export function subscribeToSettings(callback: () => void): () => void {
  listeners.add(callback);
  
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      listeners.forEach(cb => cb());
    }
  };
  window.addEventListener('storage', handleStorage);
  
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

// Notificar a listeners locales (mismo tab) cuando se guardan settings
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key: string, value: string) {
  originalSetItem(key, value);
  if (key === STORAGE_KEY) {
    listeners.forEach(cb => cb());
  }
};

// Helpers para constraints de audio/video basados en settings
export function getAudioConstraints(): MediaTrackConstraints {
  const audio = getSettingsSection('audio');
  const constraints: MediaTrackConstraints = {
    echoCancellation: audio.echoCancellation,
    autoGainControl: audio.autoGainControl,
    noiseSuppression: audio.noiseReduction,
  };
  if (audio.selectedMicrophoneId) {
    constraints.deviceId = { exact: audio.selectedMicrophoneId };
  }
  return constraints;
}

export function getVideoConstraints(): MediaTrackConstraints {
  const video = getSettingsSection('video');
  const constraints: MediaTrackConstraints = {};
  if (video.selectedCameraId) {
    constraints.deviceId = { exact: video.selectedCameraId };
  }
  if (video.hdQuality) {
    constraints.width = { ideal: 1280 };
    constraints.height = { ideal: 720 };
  } else {
    constraints.width = { ideal: 640 };
    constraints.height = { ideal: 480 };
  }
  return constraints;
}

// Helper para saber si mic/cam deben estar apagados al entrar
export function getMeetingJoinDefaults(): { muteOnJoin: boolean; cameraOffOnJoin: boolean } {
  const meetings = getSettingsSection('meetings');
  return {
    muteOnJoin: meetings.autoMuteOnJoin,
    cameraOffOnJoin: meetings.autoCameraOffOnJoin
  };
}

// Helper para settings de espacio 3D
export function getSpace3DSettings() {
  return getSettingsSection('space3d');
}

// Helper para settings de notificaciones
export function getNotificationSettings() {
  return getSettingsSection('notifications');
}

// Solicitar permiso de notificaciones desktop
export async function requestDesktopNotificationPermission(): Promise<boolean> {
  const notif = getSettingsSection('notifications');
  if (!notif.desktopNotifications) return false;
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// Enviar notificación desktop
export function sendDesktopNotification(title: string, body: string, icon?: string) {
  const notif = getSettingsSection('notifications');
  if (!notif.desktopNotifications) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, { body, icon: icon || '/favicon.ico' });
}
