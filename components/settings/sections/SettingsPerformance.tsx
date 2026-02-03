import React from 'react';
import { SettingToggle } from '../components/SettingToggle';
import { SettingDropdown } from '../components/SettingDropdown';
import { SettingSlider } from '../components/SettingSlider';
import { SettingSection } from '../components/SettingSection';

interface PerformanceSettings {
  graphicsQuality: string;
  showVideos: boolean;
  showAvatarAnimations: boolean;
  reducedMotion: boolean;
  hardwareAcceleration: boolean;
  maxVideoStreams: number;
  batterySaver: boolean;
}

interface SettingsPerformanceProps {
  settings: PerformanceSettings;
  onSettingsChange: (settings: PerformanceSettings) => void;
}

export const SettingsPerformance: React.FC<SettingsPerformanceProps> = ({
  settings,
  onSettingsChange
}) => {
  const updateSetting = <K extends keyof PerformanceSettings>(key: K, value: PerformanceSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const qualityOptions = [
    { value: 'low', label: 'Bajo - Máximo rendimiento' },
    { value: 'medium', label: 'Medio - Equilibrado' },
    { value: 'high', label: 'Alto - Mejor calidad' },
    { value: 'auto', label: 'Automático - Según conexión' }
  ];

  const videoStreamOptions = [
    { value: '4', label: '4 videos' },
    { value: '8', label: '8 videos' },
    { value: '12', label: '12 videos' },
    { value: '16', label: '16 videos (requiere buena conexión)' }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          Rendimiento
        </h2>
        <p className="text-sm text-zinc-400">
          Optimiza el rendimiento según tu dispositivo y conexión
        </p>
      </div>

      <SettingSection title="Calidad Gráfica">
        <SettingDropdown
          label="Calidad de gráficos"
          description="Ajusta la calidad visual del espacio 3D"
          value={settings.graphicsQuality}
          options={qualityOptions}
          onChange={(v) => updateSetting('graphicsQuality', v)}
        />
        <SettingToggle
          label="Animaciones de avatares"
          description="Mostrar animaciones fluidas en los avatares 3D"
          checked={settings.showAvatarAnimations}
          onChange={(v) => updateSetting('showAvatarAnimations', v)}
        />
        <SettingToggle
          label="Movimiento reducido"
          description="Minimiza animaciones y transiciones"
          checked={settings.reducedMotion}
          onChange={(v) => updateSetting('reducedMotion', v)}
        />
      </SettingSection>

      <SettingSection title="Video">
        <SettingToggle
          label="Mostrar videos"
          description="Ver los feeds de video de otros usuarios"
          checked={settings.showVideos}
          onChange={(v) => updateSetting('showVideos', v)}
        />
        {settings.showVideos && (
          <SettingDropdown
            label="Máximo de videos simultáneos"
            description="Limita cuántos videos se muestran a la vez para mejor rendimiento"
            value={settings.maxVideoStreams.toString()}
            options={videoStreamOptions}
            onChange={(v) => updateSetting('maxVideoStreams', parseInt(v))}
          />
        )}
      </SettingSection>

      <SettingSection title="Sistema">
        <SettingToggle
          label="Aceleración por hardware"
          description="Usar GPU para renderizado (recomendado)"
          checked={settings.hardwareAcceleration}
          onChange={(v) => updateSetting('hardwareAcceleration', v)}
        />
        <SettingToggle
          label="Modo ahorro de batería"
          description="Reduce el consumo de recursos cuando usas batería"
          checked={settings.batterySaver}
          onChange={(v) => updateSetting('batterySaver', v)}
        />
      </SettingSection>

      <div className="mt-8 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-violet-400">Consejo de rendimiento</p>
            <p className="text-xs text-zinc-400 mt-1">
              Si experimentas lag o lentitud, prueba reducir la calidad gráfica o 
              limitar el número de videos simultáneos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPerformance;
