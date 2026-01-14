'use client';

import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore } from '@/store/useStore';
import { ProceduralChibiAvatar } from './Avatar3DGLTF';

interface AvatarCustomizer3DProps {
  compact?: boolean;
}

const AVATAR_PRESETS = [
  { id: 'default', name: 'Clásico', skinColor: '#fcd34d', hairColor: '#4b2c20', clothingColor: '#6366f1', hairStyle: 'default', eyeColor: '#3b82f6' },
  { id: 'cool', name: 'Cool', skinColor: '#fbbf24', hairColor: '#1a120b', clothingColor: '#ef4444', hairStyle: 'spiky', eyeColor: '#22c55e' },
  { id: 'elegant', name: 'Elegante', skinColor: '#fef3c7', hairColor: '#7b3f00', clothingColor: '#1f2937', hairStyle: 'long', eyeColor: '#8b5cf6' },
  { id: 'creative', name: 'Creativo', skinColor: '#d97706', hairColor: '#ec4899', clothingColor: '#10b981', hairStyle: 'ponytail', eyeColor: '#f59e0b' },
  { id: 'pro', name: 'Profesional', skinColor: '#92400e', hairColor: '#2d1b14', clothingColor: '#3b82f6', hairStyle: 'default', eyeColor: '#64748b' },
  { id: 'gamer', name: 'Gamer', skinColor: '#78350f', hairColor: '#ffcc00', clothingColor: '#7c3aed', hairStyle: 'spiky', eyeColor: '#ef4444' },
];

const COLORS = {
  skin: ['#fcd34d', '#fbbf24', '#d97706', '#92400e', '#78350f', '#fef3c7', '#f5d0a9', '#c68642'],
  hair: ['#4b2c20', '#2d1b14', '#1a120b', '#7b3f00', '#c2b280', '#e5e5e5', '#ffcc00', '#ec4899', '#ef4444', '#3b82f6'],
  clothing: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#71717a', '#7c3aed', '#1f2937', '#ffffff'],
  eyes: ['#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b', '#ec4899', '#1f2937'],
};

const HAIR_STYLES = [
  { id: 'default', name: 'Normal', icon: '💇' },
  { id: 'spiky', name: 'Puntas', icon: '🦔' },
  { id: 'long', name: 'Largo', icon: '💁' },
  { id: 'ponytail', name: 'Coleta', icon: '🎀' },
];

const ACCESSORIES = [
  { id: 'none', name: 'Ninguno', icon: '✨' },
  { id: 'glasses', name: 'Gafas', icon: '👓' },
  { id: 'hat', name: 'Sombrero', icon: '🎩' },
  { id: 'headphones', name: 'Auriculares', icon: '🎧' },
];

export const AvatarCustomizer3D: React.FC<AvatarCustomizer3DProps> = ({ compact = false }) => {
  const { currentUser, updateAvatar } = useStore();
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'customize'>('presets');
  
  const [localConfig, setLocalConfig] = useState({
    skinColor: currentUser.avatarConfig?.skinColor || '#fcd34d',
    hairColor: currentUser.avatarConfig?.hairColor || '#4b2c20',
    clothingColor: currentUser.avatarConfig?.clothingColor || '#6366f1',
    hairStyle: (currentUser.avatarConfig as any)?.hairStyle || 'default',
    accessory: currentUser.avatarConfig?.accessory || 'none',
    eyeColor: (currentUser.avatarConfig as any)?.eyeColor || '#3b82f6',
  });

  const handleSave = async () => {
    await updateAvatar(localConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePresetSelect = (preset: typeof AVATAR_PRESETS[0]) => {
    setLocalConfig({
      skinColor: preset.skinColor,
      hairColor: preset.hairColor,
      clothingColor: preset.clothingColor,
      hairStyle: preset.hairStyle,
      accessory: localConfig.accessory,
      eyeColor: preset.eyeColor,
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
              <ProceduralChibiAvatar config={localConfig} isMoving={false} direction="front" />
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
                    localConfig.skinColor === preset.skinColor && localConfig.hairColor === preset.hairColor
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-white/10 hover:border-white/30 bg-white/5'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: preset.clothingColor }}>
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
                  {COLORS.skin.map((color) => (
                    <button
                      key={color}
                      onClick={() => setLocalConfig({ ...localConfig, skinColor: color })}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${localConfig.skinColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">Color de Cabello</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.hair.map((color) => (
                    <button
                      key={color}
                      onClick={() => setLocalConfig({ ...localConfig, hairColor: color })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${localConfig.hairColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">Estilo de Cabello</label>
                <div className="grid grid-cols-4 gap-2">
                  {HAIR_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setLocalConfig({ ...localConfig, hairStyle: style.id })}
                      className={`py-3 rounded-xl text-center transition-all border-2 ${
                        localConfig.hairStyle === style.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-white/60'
                      }`}
                    >
                      <div className="text-xl mb-1">{style.icon}</div>
                      <div className="text-[8px] font-bold uppercase">{style.name}</div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">Color de Ropa</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.clothing.map((color) => (
                    <button
                      key={color}
                      onClick={() => setLocalConfig({ ...localConfig, clothingColor: color })}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${localConfig.clothingColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">Accesorios</label>
                <div className="grid grid-cols-4 gap-2">
                  {ACCESSORIES.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => setLocalConfig({ ...localConfig, accessory: acc.id })}
                      className={`py-3 rounded-xl text-center transition-all border-2 ${
                        localConfig.accessory === acc.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-white/60'
                      }`}
                    >
                      <div className="text-xl mb-1">{acc.icon}</div>
                      <div className="text-[8px] font-bold uppercase">{acc.name}</div>
                    </button>
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
