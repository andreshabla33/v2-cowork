import React from 'react';
import { SettingToggle } from '../components/SettingToggle';
import { SettingDropdown } from '../components/SettingDropdown';
import { SettingSection } from '../components/SettingSection';

interface MiniModeSettings {
  enableMiniMode: boolean;
  miniModePosition: string;
  showVideoInMini: boolean;
  showChatInMini: boolean;
  autoMinimize: boolean;
  autoMinimizeDelay: number;
}

interface SettingsMiniModeProps {
  settings: MiniModeSettings;
  onSettingsChange: (settings: MiniModeSettings) => void;
}

export const SettingsMiniMode: React.FC<SettingsMiniModeProps> = ({
  settings,
  onSettingsChange
}) => {
  const updateSetting = <K extends keyof MiniModeSettings>(key: K, value: MiniModeSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const positionOptions = [
    { value: 'bottom-right', label: 'Esquina inferior derecha' },
    { value: 'bottom-left', label: 'Esquina inferior izquierda' },
    { value: 'top-right', label: 'Esquina superior derecha' },
    { value: 'top-left', label: 'Esquina superior izquierda' }
  ];

  const delayOptions = [
    { value: '30', label: '30 segundos' },
    { value: '60', label: '1 minuto' },
    { value: '120', label: '2 minutos' },
    { value: '300', label: '5 minutos' }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          Mini Mode
        </h2>
        <p className="text-sm text-zinc-400">
          Configura el modo compacto para cuando trabajas en otras aplicaciones
        </p>
      </div>

      <SettingSection title="Modo Compacto">
        <SettingToggle
          label="Habilitar Mini Mode"
          description="Muestra una ventana flotante pequeña cuando minimizas el espacio"
          checked={settings.enableMiniMode}
          onChange={(v) => updateSetting('enableMiniMode', v)}
        />
        {settings.enableMiniMode && (
          <>
            <SettingDropdown
              label="Posición de la ventana"
              description="Dónde aparecerá la ventana flotante en tu pantalla"
              value={settings.miniModePosition}
              options={positionOptions}
              onChange={(v) => updateSetting('miniModePosition', v)}
            />
          </>
        )}
      </SettingSection>

      {settings.enableMiniMode && (
        <>
          <SettingSection title="Contenido del Mini Mode">
            <SettingToggle
              label="Mostrar video"
              description="Ver los videos de tus compañeros en modo mini"
              checked={settings.showVideoInMini}
              onChange={(v) => updateSetting('showVideoInMini', v)}
            />
            <SettingToggle
              label="Mostrar chat"
              description="Ver mensajes de chat en modo mini"
              checked={settings.showChatInMini}
              onChange={(v) => updateSetting('showChatInMini', v)}
            />
          </SettingSection>

          <SettingSection title="Automatización">
            <SettingToggle
              label="Minimizar automáticamente"
              description="Cambiar a mini mode cuando la pestaña no está activa"
              checked={settings.autoMinimize}
              onChange={(v) => updateSetting('autoMinimize', v)}
            />
            {settings.autoMinimize && (
              <SettingDropdown
                label="Tiempo de espera"
                description="Tiempo de inactividad antes de minimizar"
                value={settings.autoMinimizeDelay.toString()}
                options={delayOptions}
                onChange={(v) => updateSetting('autoMinimizeDelay', parseInt(v))}
              />
            )}
          </SettingSection>
        </>
      )}
    </div>
  );
};

export default SettingsMiniMode;
