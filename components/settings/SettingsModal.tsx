import React, { useState, useEffect } from 'react';
import { 
  Settings, Calendar, Layout, Mic, Video, Users2, Bell, Lock, Zap, 
  Gamepad2, UserPlus, ShieldCheck, X 
} from 'lucide-react';
import { SettingsGeneral } from './sections/SettingsGeneral';
import { SettingsCalendar } from './sections/SettingsCalendar';
import { SettingsMiniMode } from './sections/SettingsMiniMode';
import { SettingsAudio } from './sections/SettingsAudio';
import { SettingsVideo } from './sections/SettingsVideo';
import { SettingsMeetings } from './sections/SettingsMeetings';
import { SettingsNotifications } from './sections/SettingsNotifications';
import { SettingsPrivacy } from './sections/SettingsPrivacy';
import { SettingsPerformance } from './sections/SettingsPerformance';
import { SettingsSpace3D } from './sections/SettingsSpace3D';
import { SettingsMembers } from './sections/SettingsMembers';
import { SettingsGuests } from './sections/SettingsGuests';
import { SettingsSecurity } from './sections/SettingsSecurity';

type SettingsTab = 'general' | 'calendar' | 'minimode' | 'audio' | 'video' | 'meetings' | 'notifications' | 'privacy' | 'performance' | 'space3d' | 'members' | 'guests' | 'security';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  isAdmin: boolean;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

const STORAGE_KEY = 'user_settings';

const defaultSettings = {
  general: {
    skipWelcomeScreen: false,
    colorMode: 'dark',
    language: 'es',
    autoUpdates: true
  },
  calendar: {
    googleConnected: false,
    syncEnabled: true,
    defaultReminder: 15,
    showGoogleEvents: true,
    autoCreateGoogleEvent: true
  },
  minimode: {
    enableMiniMode: true,
    miniModePosition: 'bottom-right',
    showVideoInMini: true,
    showChatInMini: true,
    autoMinimize: false,
    autoMinimizeDelay: 60
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
  guests: {
    guestCheckInEnabled: false,
    requireApproval: true,
    guestAccessDuration: 24,
    allowGuestChat: true,
    allowGuestVideo: true
  },
  security: {
    requireLogin: true,
    passwordProtection: false,
    spacePassword: '',
    allowedDomains: [],
    allowStaffAccess: true,
    twoFactorRequired: false,
    sessionTimeout: 480,
    ipRestriction: false
  }
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  isAdmin,
  currentTheme,
  onThemeChange
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState(defaultSettings);

  // Cargar settings de localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }, []);

  // Guardar settings en localStorage
  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  };

  // Sincronizar tema
  useEffect(() => {
    if (settings.general.colorMode !== currentTheme) {
      setSettings(prev => ({
        ...prev,
        general: { ...prev.general, colorMode: currentTheme }
      }));
    }
  }, [currentTheme]);

  const handleGeneralChange = (general: typeof settings.general) => {
    const newSettings = { ...settings, general };
    saveSettings(newSettings);
    if (general.colorMode !== currentTheme) {
      onThemeChange(general.colorMode);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', label: 'General', Icon: Settings, category: 'Preferencias' },
    { id: 'calendar', label: 'Calendario', Icon: Calendar, category: 'Preferencias' },
    { id: 'minimode', label: 'Mini Mode', Icon: Layout, category: 'Preferencias' },
    { id: 'audio', label: 'Audio', Icon: Mic, category: 'Preferencias' },
    { id: 'video', label: 'Video', Icon: Video, category: 'Preferencias' },
    { id: 'meetings', label: 'Reuniones', Icon: Users2, category: 'Preferencias' },
    { id: 'notifications', label: 'Notificaciones', Icon: Bell, category: 'Preferencias' },
    { id: 'privacy', label: 'Privacidad', Icon: Lock, category: 'Preferencias' },
    { id: 'performance', label: 'Rendimiento', Icon: Zap, category: 'Preferencias' },
    { id: 'space3d', label: 'Espacio 3D', Icon: Gamepad2, category: 'Preferencias' },
    { id: 'members', label: 'Miembros', Icon: Users2, category: 'Espacio' },
    { id: 'guests', label: 'Invitados', Icon: UserPlus, category: 'Espacio', adminOnly: true },
    { id: 'security', label: 'Seguridad', Icon: ShieldCheck, category: 'Espacio', adminOnly: true },
  ];

  const filteredTabs = tabs.filter(t => !t.adminOnly || isAdmin);
  const categories = [...new Set(filteredTabs.map(t => t.category))];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl h-[85vh] max-h-[700px] backdrop-blur-xl bg-zinc-900/95 border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sidebar */}
        <div className="w-56 bg-black/40 border-r border-white/[0.05] flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-white/[0.05]">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white">
              Configuración
            </h2>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-2 py-3 overflow-y-auto">
            {categories.map(category => (
              <div key={category} className="mb-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 px-2 mb-2">
                  {category}
                </p>
                {filteredTabs
                  .filter(t => t.category === category)
                  .map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as SettingsTab)}
                      className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-violet-600/20 text-white'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <tab.Icon 
                        className={`w-[18px] h-[18px] stroke-[1.5] transition-all duration-200 ${
                          activeTab === tab.id 
                            ? 'text-violet-400' 
                            : 'text-zinc-500 group-hover:text-zinc-300'
                        }`} 
                      />
                      {tab.label}
                    </button>
                  ))}
              </div>
            ))}
          </nav>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Close button */}
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'general' && (
              <SettingsGeneral
                settings={settings.general}
                onSettingsChange={handleGeneralChange}
              />
            )}
            {activeTab === 'calendar' && (
              <SettingsCalendar
                settings={settings.calendar}
                onSettingsChange={(calendar) => saveSettings({ ...settings, calendar })}
              />
            )}
            {activeTab === 'minimode' && (
              <SettingsMiniMode
                settings={settings.minimode}
                onSettingsChange={(minimode) => saveSettings({ ...settings, minimode })}
              />
            )}
            {activeTab === 'audio' && (
              <SettingsAudio
                settings={settings.audio}
                onSettingsChange={(audio) => saveSettings({ ...settings, audio })}
              />
            )}
            {activeTab === 'video' && (
              <SettingsVideo
                settings={settings.video}
                onSettingsChange={(video) => saveSettings({ ...settings, video })}
              />
            )}
            {activeTab === 'meetings' && (
              <SettingsMeetings
                settings={settings.meetings}
                onSettingsChange={(meetings) => saveSettings({ ...settings, meetings })}
                isAdmin={isAdmin}
              />
            )}
            {activeTab === 'notifications' && (
              <SettingsNotifications
                settings={settings.notifications}
                onSettingsChange={(notifications) => saveSettings({ ...settings, notifications })}
              />
            )}
            {activeTab === 'privacy' && (
              <SettingsPrivacy
                settings={settings.privacy}
                onSettingsChange={(privacy) => saveSettings({ ...settings, privacy })}
              />
            )}
            {activeTab === 'performance' && (
              <SettingsPerformance
                settings={settings.performance}
                onSettingsChange={(performance) => saveSettings({ ...settings, performance })}
              />
            )}
            {activeTab === 'space3d' && (
              <SettingsSpace3D
                settings={settings.space3d}
                onSettingsChange={(space3d) => saveSettings({ ...settings, space3d })}
              />
            )}
            {activeTab === 'members' && (
              <SettingsMembers
                workspaceId={workspaceId}
                isAdmin={isAdmin}
              />
            )}
            {activeTab === 'guests' && isAdmin && (
              <SettingsGuests
                settings={settings.guests}
                onSettingsChange={(guests) => saveSettings({ ...settings, guests })}
                workspaceId={workspaceId}
              />
            )}
            {activeTab === 'security' && isAdmin && (
              <SettingsSecurity
                settings={settings.security}
                onSettingsChange={(security) => saveSettings({ ...settings, security })}
                workspaceId={workspaceId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
