'use client';

import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useStore } from '@/store/useStore';
import { ProceduralChibiAvatar } from './Avatar3DGLTF';
import { PresenceStatus } from '@/types';

interface AvatarCustomizer3DProps {
  compact?: boolean;
}

// Presets de avatares predefinidos
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
  const { currentUser, updateAvatar, theme } = useStore();
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'customize'>('presets');
  
  // Estado local del avatar para preview en tiempo real
  const [localConfig, setLocalConfig] = useState({
    skinColor: currentUser.avatarConfig?.skinColor || '#fcd34d',
    hairColor: currentUser.avatarConfig?.hairColor || '#4b2c20',
    clothingColor: currentUser.avatarConfig?.clothingColor || '#6366f1',
    hairStyle: (currentUser.avatarConfig as any)?.hairStyle || 'default',
    accessory: (currentUser.avatarConfig?.accessory || 'none') as 'none' | 'glasses' | 'hat' | 'headphones',
    eyeColor: (currentUser.avatarConfig as any)?.eyeColor || '#3b82f6',
  });

  const handleUpdate = async (newConfig: typeof localConfig) => {
    setLocalConfig(newConfig);
    await updateAvatar(newConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePresetSelect = (preset: typeof AVATAR_PRESETS[0]) => {
    const newConfig = {
      skinColor: preset.skinColor,
      hairColor: preset.hairColor,
      clothingColor: preset.clothingColor,
      hairStyle: preset.hairStyle,
      accessory: localConfig.accessory,
      eyeColor: preset.eyeColor,
    };
    handleUpdate(newConfig);
  };

  const containerClasses = compact
    ? "p-4 flex flex-col gap-4"
    : "p-6 max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-full overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-700";

  return (
    <div className={containerClasses}>
      {/* Vista previa 3D */}
      <div className={`${compact ? 'h-64' : 'lg:flex-1 min-h-[400px]'} bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-3xl border border-white/10 overflow-hidden relative`}>
        <Canvas shadows camera={{ position: [0, 1, 3], fov: 45 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
            <directionalLight position={[-5, 3, -5]} intensity={0.3} />
            
            <group position={[0, -0.8, 0]}>
              <ProceduralChibiAvatar
                config={localConfig}
                isMoving={false}
                direction="front"
              />
            </group>
            
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minDistance={2}
              maxDistance={5}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 2}
            />
            
            {/* Piso reflectante */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
              <circleGeometry args={[2, 32]} />
              <meshStandardMaterial color="#1f2937" roughness={0.3} metalness={0.1} />
            </mesh>
          </Suspense>
        </Canvas>
        
        {/* Indicador de guardado */}
        {saved && (
          <div className="absolute top-4 right-4 bg-green-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-in fade-in zoom-in">
            ✓ Guardado
          </div>
        )}
        
        {/* Instrucciones */}
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
              activeTab === 'presets'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            🎭 Presets
          </button>
          <button
            onClick={() => setActiveTab('customize')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'customize'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            ✏️ Personalizar
          </button>
        </div>

        {/* Contenido de tabs */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'presets' && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                    localConfig.skinColor === preset.skinColor &&
                    localConfig.hairColor === preset.hairColor &&
                    localConfig.clothingColor === preset.clothingColor
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-white/10 hover:border-white/30 bg-white/5'
                  }`}
                >
                  {/* Mini preview */}
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800">
                    <Canvas camera={{ position: [0, 0.5, 2], fov: 50 }}>
                      <ambientLight intensity={0.8} />
                      <directionalLight position={[2, 2, 2]} intensity={0.5} />
                      <group position={[0, -0.6, 0]} scale={0.8}>
                        <ProceduralChibiAvatar
                          config={{
                            skinColor: preset.skinColor,
                            hairColor: preset.hairColor,
                            clothingColor: preset.clothingColor,
                            hairStyle: preset.hairStyle,
                            eyeColor: preset.eyeColor,
                          }}
                          isMoving={false}
                          direction="front"
                        />
                      </group>
                    </Canvas>
                  </div>
                  <span className="text-[11px] font-bold text-white/80">{preset.name}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'customize' && (
            <div className="space-y-5 animate-in fade-in">
              {/* Tono de piel */}
              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">
                  Tono de Piel
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.skin.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleUpdate({ ...localConfig, skinColor: color })}
                      className={`w-9 h-9 rounded-full border-2 transition-all transform hover:scale-110 ${
                        localConfig.skinColor === color
                          ? 'border-white scale-110 shadow-lg'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </section>

              {/* Color de cabello */}
              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">
                  Color de Cabello
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.hair.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleUpdate({ ...localConfig, hairColor: color })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all transform hover:scale-110 ${
                        localConfig.hairColor === color
                          ? 'border-white scale-110 shadow-lg'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </section>

              {/* Estilo de cabello */}
              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">
                  Estilo de Cabello
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {HAIR_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => handleUpdate({ ...localConfig, hairStyle: style.id })}
                      className={`py-3 rounded-xl text-center transition-all border-2 ${
                        localConfig.hairStyle === style.id
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                      }`}
                    >
                      <div className="text-xl mb-1">{style.icon}</div>
                      <div className="text-[8px] font-bold uppercase">{style.name}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Color de ojos */}
              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">
                  Color de Ojos
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.eyes.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleUpdate({ ...localConfig, eyeColor: color })}
                      className={`w-7 h-7 rounded-full border-2 transition-all transform hover:scale-110 ${
                        localConfig.eyeColor === color
                          ? 'border-white scale-110 shadow-lg ring-2 ring-white/30'
                          : 'border-white/20'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </section>

              {/* Color de ropa */}
              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">
                  Color de Ropa
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.clothing.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleUpdate({ ...localConfig, clothingColor: color })}
                      className={`w-9 h-9 rounded-full border-2 transition-all transform hover:scale-110 ${
                        localConfig.clothingColor === color
                          ? 'border-white scale-110 shadow-lg'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </section>

              {/* Accesorios */}
              <section>
                <label className="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-2 block">
                  Accesorios
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ACCESSORIES.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => handleUpdate({ ...localConfig, accessory: acc.id as 'none' | 'glasses' | 'hat' | 'headphones' })}
                      className={`py-3 rounded-xl text-center transition-all border-2 ${
                        localConfig.accessory === acc.id
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
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
      </div>
    </div>
  );
};

export default AvatarCustomizer3D;
