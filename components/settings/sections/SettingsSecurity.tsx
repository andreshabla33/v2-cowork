import React, { useState } from 'react';
import { SettingToggle } from '../components/SettingToggle';
import { SettingDropdown } from '../components/SettingDropdown';
import { SettingSection } from '../components/SettingSection';

interface SecuritySettings {
  requireLogin: boolean;
  passwordProtection: boolean;
  spacePassword: string;
  allowedDomains: string[];
  allowStaffAccess: boolean;
  twoFactorRequired: boolean;
  sessionTimeout: number;
  ipRestriction: boolean;
}

interface SettingsSecurityProps {
  settings: SecuritySettings;
  onSettingsChange: (settings: SecuritySettings) => void;
  workspaceId: string;
}

export const SettingsSecurity: React.FC<SettingsSecurityProps> = ({
  settings,
  onSettingsChange,
  workspaceId
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  const updateSetting = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const addDomain = () => {
    if (newDomain.trim() && !settings.allowedDomains.includes(newDomain.trim())) {
      updateSetting('allowedDomains', [...settings.allowedDomains, newDomain.trim()]);
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    updateSetting('allowedDomains', settings.allowedDomains.filter(d => d !== domain));
  };

  const sessionOptions = [
    { value: '30', label: '30 minutos' },
    { value: '60', label: '1 hora' },
    { value: '240', label: '4 horas' },
    { value: '480', label: '8 horas' },
    { value: '1440', label: '24 horas' }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white mb-2">
          Seguridad
        </h2>
        <p className="text-sm text-zinc-400">
          Configura las políticas de seguridad del espacio
        </p>
      </div>

      <SettingSection title="Acceso al Espacio">
        <SettingToggle
          label="Requerir inicio de sesión"
          description="Los usuarios deben tener una cuenta para acceder"
          checked={settings.requireLogin}
          onChange={(v) => updateSetting('requireLogin', v)}
        />
        <SettingToggle
          label="Protección con contraseña"
          description="Requiere una contraseña adicional para entrar al espacio"
          checked={settings.passwordProtection}
          onChange={(v) => updateSetting('passwordProtection', v)}
        />
        {settings.passwordProtection && (
          <div className="py-4 border-b border-white/[0.05]">
            <div className="flex-1">
              <p className="text-sm font-medium text-white mb-2">Contraseña del espacio</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={settings.spacePassword}
                    onChange={(e) => updateSetting('spacePassword', e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
                    placeholder="Ingresa la contraseña"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SettingSection>

      <SettingSection title="Restricción por Dominio">
        <div className="py-4 border-b border-white/[0.05]">
          <p className="text-sm font-medium text-white mb-1">Dominios permitidos</p>
          <p className="text-xs text-zinc-400 mb-3">Solo usuarios con estos dominios de email pueden acceder</p>
          
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50"
              placeholder="ejemplo.com"
              onKeyDown={(e) => e.key === 'Enter' && addDomain()}
            />
            <button
              onClick={addDomain}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium transition-all"
            >
              Agregar
            </button>
          </div>

          {settings.allowedDomains.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {settings.allowedDomains.map((domain) => (
                <span
                  key={domain}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 text-violet-300 rounded-lg text-xs font-medium"
                >
                  @{domain}
                  <button
                    onClick={() => removeDomain(domain)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">Sin restricción de dominio</p>
          )}
        </div>
      </SettingSection>

      <SettingSection title="Sesión y Acceso">
        <SettingDropdown
          label="Tiempo de expiración de sesión"
          description="Cerrar sesión automáticamente después de inactividad"
          value={settings.sessionTimeout.toString()}
          options={sessionOptions}
          onChange={(v) => updateSetting('sessionTimeout', parseInt(v))}
        />
        <SettingToggle
          label="Requerir 2FA"
          description="Los usuarios deben configurar autenticación de dos factores"
          checked={settings.twoFactorRequired}
          onChange={(v) => updateSetting('twoFactorRequired', v)}
        />
        <SettingToggle
          label="Permitir acceso de soporte"
          description="El equipo de Cowork puede acceder para ayudar con problemas"
          checked={settings.allowStaffAccess}
          onChange={(v) => updateSetting('allowStaffAccess', v)}
        />
      </SettingSection>

      <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-400">Zona de peligro</p>
            <p className="text-xs text-zinc-400 mt-1 mb-3">
              Acciones irreversibles que afectan a todo el espacio.
            </p>
            <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-all border border-red-500/30">
              Eliminar espacio de trabajo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsSecurity;
