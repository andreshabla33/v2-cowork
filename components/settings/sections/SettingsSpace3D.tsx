import React from 'react';
import { SettingToggle } from '../components/SettingToggle';
import { SettingDropdown } from '../components/SettingDropdown';
import { SettingSlider } from '../components/SettingSlider';
import { SettingSection } from '../components/SettingSection';

interface Space3DSettings {
  cameraMode: string;
  movementSpeed: number;
  cameraSensitivity: number;
  invertYAxis: boolean;
  showFloorGrid: boolean;
  showNamesAboveAvatars: boolean;
  spatialAudio: boolean;
  proximityRadius: number;
}

interface SettingsSpace3DProps {
  settings: Space3DSettings;
  onSettingsChange: (settings: Space3DSettings) => void;
}

export const SettingsSpace3D: React.FC<SettingsSpace3DProps> = ({
  settings,
  onSettingsChange
}) => {
  const updateSetting = <K extends keyof Space3DSettings>(key: K, value: Space3DSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const cameraModeOptions = [
    { value: 'free', label: 'Libre' },
    { value: 'fixed', label: 'Fija' },
    { value: 'follow', label: 'Seguir avatar' }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          Espacio 3D
        </h2>
        <p className="text-sm text-zinc-400">
          Configura la experiencia del espacio virtual 3D
        </p>
      </div>

      <SettingSection title="Cámara">
        <SettingDropdown
          label="Modo de cámara"
          description="Cómo se comporta la cámara en el espacio"
          value={settings.cameraMode}
          options={cameraModeOptions}
          onChange={(v) => updateSetting('cameraMode', v)}
        />
        <SettingSlider
          label="Sensibilidad de cámara"
          description="Velocidad de rotación de la cámara"
          value={settings.cameraSensitivity}
          min={1}
          max={10}
          onChange={(v) => updateSetting('cameraSensitivity', v)}
        />
        <SettingToggle
          label="Invertir eje Y"
          description="Invierte el movimiento vertical de la cámara"
          checked={settings.invertYAxis}
          onChange={(v) => updateSetting('invertYAxis', v)}
        />
      </SettingSection>

      <SettingSection title="Movimiento">
        <SettingSlider
          label="Velocidad de movimiento"
          description="Qué tan rápido se mueve tu avatar"
          value={settings.movementSpeed}
          min={1}
          max={10}
          onChange={(v) => updateSetting('movementSpeed', v)}
        />
      </SettingSection>

      <SettingSection title="Visualización">
        <SettingToggle
          label="Mostrar grid del suelo"
          description="Muestra la cuadrícula en el piso del espacio"
          checked={settings.showFloorGrid}
          onChange={(v) => updateSetting('showFloorGrid', v)}
        />
        <SettingToggle
          label="Mostrar nombres sobre avatares"
          description="Muestra el nombre de los usuarios sobre sus avatares"
          checked={settings.showNamesAboveAvatars}
          onChange={(v) => updateSetting('showNamesAboveAvatars', v)}
        />
      </SettingSection>

      <SettingSection title="Audio Espacial">
        <SettingToggle
          label="Audio espacial 3D"
          description="El sonido cambia según la posición de los usuarios"
          checked={settings.spatialAudio}
          onChange={(v) => updateSetting('spatialAudio', v)}
        />
        <SettingSlider
          label="Radio de proximidad"
          description="Distancia a la que puedes escuchar a otros usuarios"
          value={settings.proximityRadius}
          min={50}
          max={300}
          step={10}
          unit="u"
          onChange={(v) => updateSetting('proximityRadius', v)}
        />
      </SettingSection>
    </div>
  );
};

export default SettingsSpace3D;
