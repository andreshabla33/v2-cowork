'use client';

import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore } from '@/store/useStore';
import { MixamoAvatar, AvatarColores } from './MixamoAvatar';

interface AvatarCustomizer3DProps {
  compact?: boolean;
}

// Presets adaptados para el avatar Meshy AI
const AVATAR_PRESETS = [
  { id: 'default', name: 'Clásico', piel: '#f5d0c5', cabello: '#4b2c20', ropa_principal: '#6366f1', ropa_secundario: '#4f46e5', ojos: '#3b82f6', zapatos: '#1f2937' },
  { id: 'cool', name: 'Cool', piel: '#e8beac', cabello: '#1a120b', ropa_principal: '#ef4444', ropa_secundario: '#dc2626', ojos: '#22c55e', zapatos: '#18181b' },
  { id: 'elegant', name: 'Elegante', piel: '#fef3c7', cabello: '#7b3f00', ropa_principal: '#1f2937', ropa_secundario: '#374151', ojos: '#8b5cf6', zapatos: '#0f172a' },
  { id: 'creative', name: 'Creativo', piel: '#d4a574', cabello: '#ec4899', ropa_principal: '#10b981', ropa_secundario: '#059669', ojos: '#f59e0b', zapatos: '#065f46' },
  { id: 'pro', name: 'Profesional', piel: '#8b6952', cabello: '#2d1b14', ropa_principal: '#3b82f6', ropa_secundario: '#1d4ed8', ojos: '#64748b', zapatos: '#1e3a5f' },
  { id: 'gamer', name: 'Gamer', piel: '#6b4423', cabello: '#ffcc00', ropa_principal: '#7c3aed', ropa_secundario: '#5b21b6', ojos: '#ef4444', zapatos: '#4c1d95' },
];

// Colores para cada parte del avatar Meshy AI
const COLORS = {
  piel: ['#f5d0c5', '#e8beac', '#d4a574', '#c68642', '#8b6952', '#6b4423', '#fef3c7', '#ffe4c4'],
  cabello: ['#4b2c20', '#2d1b14', '#1a120b', '#7b3f00', '#c2b280', '#e5e5e5', '#ffcc00', '#ec4899', '#ef4444', '#3b82f6'],
  ropa_principal: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#71717a', '#7c3aed', '#1f2937', '#ffffff'],
  ropa_secundario: ['#4f46e5', '#db2777', '#059669', '#d97706', '#2563eb', '#dc2626', '#525252', '#6d28d9', '#111827', '#f3f4f6'],
  ojos: ['#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b', '#ec4899', '#1f2937'],
  zapatos: ['#1f2937', '#18181b', '#0f172a', '#292524', '#1e3a5f', '#4c1d95', '#065f46', '#7c2d12'],
};

export const AvatarCustomizer3D: React.FC<AvatarCustomizer3DProps> = ({ compact = false }) => {
  const { currentUser, updateAvatar } = useStore();
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'customize'>('presets');
  
  // Configuración de colores para el avatar Meshy AI
  const [localConfig, setLocalConfig] = useState<AvatarColores>({
    piel: (currentUser.avatarConfig as any)?.piel || '#f5d0c5',
    cabello: (currentUser.avatarConfig as any)?.cabello || '#4b2c20',
    ropa_principal: (currentUser.avatarConfig as any)?.ropa_principal || '#6366f1',
    ropa_secundario: (currentUser.avatarConfig as any)?.ropa_secundario || '#4f46e5',
    ojos: (currentUser.avatarConfig as any)?.ojos || '#3b82f6',
    zapatos: (currentUser.avatarConfig as any)?.zapatos || '#1f2937',
  });

  const handleSave = async () => {
    await updateAvatar(localConfig as any);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePresetSelect = (preset: typeof AVATAR_PRESETS[0]) => {
    setLocalConfig({
      piel: preset.piel,
      cabello: preset.cabello,
      ropa_principal: preset.ropa_principal,
      ropa_secundario: preset.ropa_secundario,
      ojos: preset.ojos,
      zapatos: preset.zapatos,
    });
  };

  return (
    <div className={compact ? "p-4 flex flex-col gap-4" : "p-6 max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-full overflow-y-auto"}>
      {/* Vista previa 3D */}
      <div className={`${compact ? 'h-64' : 'lg:flex-1 min-h-[400px]'} bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-3xl border border-white/10 overflow-hidden relative`}>
        <Canvas shadows camera={{ position: [0, 1, 3], fov: 45 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
            <directionalLight position={[-5, 3, -5]} intensity={0.3} />
            
            <group position={[0, -0.8, 0]}>
              <MixamoAvatar colores={localConfig} isMoving={false} direction="front" />
            </group>
            
            <OrbitControls enablePan={false} enableZoom={true} minDistance={2} maxDistance={5} />
            
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
              <circleGeometry args={[2, 32]} />
              <meshStandardMaterial color="#1f2937" roughness={0.3} />
            </mesh>
          </Suspense>
        </Canvas>
        
        {saved && (
          <div className="absolute top-4 right-4 bg-green-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            ✓ Guardado
          </div>
        )}
        
        <div className="absolute bottom-3 left-3 text-[10px] text-white/40">
          Arrastra para rotar • Scroll para zoom
        </div>
      </div>

      {/* Panel de personalización */}
      <div className={`${compact ? 'flex-1' : 'lg:w-[400px]'} flex flex-col gap-4`}>
        {/* Tabs */}
        <div className="flex gap-2 bg-zinc-800/50 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'presets' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🎭 Presets
          </button>
          <button
            onClick={() => setActiveTab('customize')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'customize' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            ✏️ Personalizar
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'presets' && (
            <div className="grid grid-cols-2 gap-3">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    localConfig.piel === preset.piel && localConfig.cabello === preset.cabello
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-white/10 hover:border-white/30 bg-white/5'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: preset.ropa_principal }}>
                    👤
                  </div>
                  <span className="text-[11px] font-bold text-white/80">{preset.name}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'customize' && (
            <div className="space-y-5">
              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">Tono de Piel</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.piel.map((color) => (
                    <button
                      key={color}
                      onClick={() => setLocalConfig({ ...localConfig, piel: color })}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${localConfig.piel === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">Color de Cabello</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.cabello.map((color) => (
                    <button
                      key={color}
                      onClick={() => setLocalConfig({ ...localConfig, cabello: color })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${localConfig.cabello === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">Color de Ojos</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.ojos.map((color) => (
                    <button
                      key={color}
                      onClick={() => setLocalConfig({ ...localConfig, ojos: color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${localConfig.ojos === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">Ropa Principal</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.ropa_principal.map((color) => (
                    <button
                      key={color}
                      onClick={() => setLocalConfig({ ...localConfig, ropa_principal: color })}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${localConfig.ropa_principal === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">Ropa Secundaria</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.ropa_secundario.map((color) => (
                    <button
                      key={color}
                      onClick={() => setLocalConfig({ ...localConfig, ropa_secundario: color })}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${localConfig.ropa_secundario === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">Zapatos</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.zapatos.map((color) => (
                    <button
                      key={color}
                      onClick={() => setLocalConfig({ ...localConfig, zapatos: color })}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${localConfig.zapatos === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Botón de guardar */}
        <button
          onClick={handleSave}
          className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
            saved ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {saved ? '✓ CAMBIOS GUARDADOS' : '💾 GUARDAR AVATAR'}
        </button>
      </div>
    </div>
  );
};

export default AvatarCustomizer3D;
