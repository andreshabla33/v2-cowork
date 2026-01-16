'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { MixamoAvatar } from './MixamoAvatar';

interface Avatar3D {
  id: string;
  nombre: string;
  descripcion: string;
  modelo_url: string;
  thumbnail_url: string | null;
  escala: number;
  activo: boolean;
}

interface AvatarSelector3DProps {
  compact?: boolean;
}

export const AvatarSelector3D: React.FC<AvatarSelector3DProps> = ({ compact = false }) => {
  const { currentUser } = useStore();
  const [avatares, setAvatares] = useState<Avatar3D[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadAvatares();
  }, []);

  const loadAvatares = async () => {
    const { data, error } = await supabase
      .from('avatares_3d')
      .select('*')
      .eq('activo', true)
      .order('orden');

    if (!error && data) {
      setAvatares(data);
      // Seleccionar el avatar actual del usuario o el primero
      const userAvatarId = (currentUser as any)?.avatar_3d_id;
      if (userAvatarId && data.find(a => a.id === userAvatarId)) {
        setSelectedAvatar(userAvatarId);
      } else if (data.length > 0) {
        setSelectedAvatar(data[0].id);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedAvatar || !currentUser?.id) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('usuarios')
      .update({ avatar_3d_id: selectedAvatar })
      .eq('id', currentUser.id);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const selectedAvatarData = avatares.find(a => a.id === selectedAvatar);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className={compact ? "p-4 flex flex-col gap-4" : "p-6 max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-full overflow-y-auto"}>
      {/* Vista previa 3D */}
      <div className={`${compact ? 'h-64' : 'lg:flex-1 min-h-[400px]'} bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-3xl border border-white/10 overflow-hidden relative`}>
        <Canvas shadows camera={{ position: [0, 1.5, 4], fov: 45 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
            <directionalLight position={[-5, 3, -5]} intensity={0.3} />
            
            <group position={[0, -0.85, 0]}>
              <MixamoAvatar />
            </group>
            
            <OrbitControls 
              enablePan={false} 
              enableZoom={true} 
              minDistance={2} 
              maxDistance={6}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 2}
            />
            
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]} receiveShadow>
              <circleGeometry args={[2, 32]} />
              <meshStandardMaterial color="#1f2937" roughness={0.3} />
            </mesh>
          </Suspense>
        </Canvas>
        
        {saved && (
          <div className="absolute top-4 right-4 bg-green-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            ✓ Avatar guardado
          </div>
        )}
        
        <div className="absolute bottom-3 left-3 text-[10px] text-white/40">
          Arrastra para rotar • Scroll para zoom
        </div>
      </div>

      {/* Panel de selección */}
      <div className={`${compact ? 'flex-1' : 'lg:w-[400px]'} flex flex-col gap-4`}>
        <h3 className="text-lg font-bold text-white">Selecciona tu Avatar</h3>
        
        {avatares.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <p>No hay avatares disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {avatares.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setSelectedAvatar(avatar.id)}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  selectedAvatar === avatar.id
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/10 hover:border-white/30 bg-white/5'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                  {avatar.thumbnail_url ? (
                    <img src={avatar.thumbnail_url} alt={avatar.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">👤</span>
                  )}
                </div>
                <span className="text-sm font-bold text-white/80">{avatar.nombre}</span>
                {avatar.descripcion && (
                  <span className="text-[10px] text-zinc-400 text-center">{avatar.descripcion}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Botón guardar */}
        <button
          onClick={handleSave}
          disabled={saving || !selectedAvatar}
          className={`mt-auto py-3 rounded-2xl font-bold text-sm transition-all ${
            saving
              ? 'bg-zinc-600 text-zinc-400 cursor-wait'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {saving ? 'Guardando...' : '💾 Guardar Avatar'}
        </button>
      </div>
    </div>
  );
};

export default AvatarSelector3D;
