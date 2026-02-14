import React, { useMemo } from 'react';
import { Text, useTexture, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface ZonaEmpresaProps {
  posicion: [number, number, number];
  ancho: number;
  alto: number;
  color: string;
  nombre?: string | null;
  logoUrl?: string | null;
  modeloUrl?: string | null;
  mostrarEtiqueta?: boolean;
  opacidad?: number;
  esZonaComun?: boolean;
  variante?: 'propia' | 'ajena' | 'comun';
}

const ZonaModel: React.FC<{ url: string; ancho: number; alto: number }> = ({ url, ancho, alto }) => {
  const { scene } = useGLTF(url);
  
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    
    // Calcular bounding box para escalar automáticamente al tamaño de la zona
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    
    // Escalar para que quepa en la zona (dejando un pequeño margen)
    const scaleX = (ancho * 0.9) / size.x;
    const scaleZ = (alto * 0.9) / size.z;
    const scale = Math.min(scaleX, scaleZ, 1); // No escalar hacia arriba si es pequeño
    
    clone.scale.set(scale, scale, scale);
    
    // Centrar
    const center = box.getCenter(new THREE.Vector3());
    clone.position.sub(center.multiplyScalar(scale));
    clone.position.y = 0; // Alinear al suelo
    
    return clone;
  }, [scene, ancho, alto]);

  return <primitive object={clonedScene} />;
};

export const ZonaEmpresa: React.FC<ZonaEmpresaProps> = ({
  posicion,
  ancho,
  alto,
  color,
  nombre,
  logoUrl,
  modeloUrl,
  mostrarEtiqueta = true,
  opacidad = 0.35,
  esZonaComun = false,
  variante = 'propia',
}) => {
  const logoFallback =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAmMB9WMIZn0AAAAASUVORK5CYII=';
  const logoTexture = useTexture(logoUrl || logoFallback);

  const mostrarLogo = useMemo(() => {
    return !!logoUrl && logoTexture && (logoTexture as THREE.Texture).image;
  }, [logoUrl, logoTexture]);

  const estiloEtiqueta = useMemo(() => {
    if (variante === 'ajena') return '#fca5a5';
    if (variante === 'comun') return '#bae6fd';
    return '#f8fafc';
  }, [variante]);

  const bordeZona = useMemo(() => {
    if (variante === 'ajena') return { color: '#f97316', opacity: 0.45 };
    if (variante === 'comun') return { color: '#7dd3fc', opacity: 0.3 };
    return { color: '#a78bfa', opacity: 0.25 };
  }, [variante]);

  return (
    <group>
      {modeloUrl ? (
        <group position={[posicion[0], 0, posicion[2]]}>
          <ZonaModel url={modeloUrl} ancho={ancho} alto={alto} />
        </group>
      ) : (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={posicion} receiveShadow>
            <planeGeometry args={[ancho, alto]} />
            <meshStandardMaterial color={color} transparent opacity={opacidad} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[posicion[0], posicion[1] + 0.001, posicion[2]]}>
            <planeGeometry args={[ancho, alto]} />
            <meshBasicMaterial color={color} transparent opacity={Math.min(0.6, opacidad + 0.2)} />
          </mesh>
        </>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[posicion[0], posicion[1] + 0.02, posicion[2]]}>
        <planeGeometry args={[ancho, alto]} />
        <meshBasicMaterial color={bordeZona.color} transparent opacity={bordeZona.opacity} wireframe />
      </mesh>

      {mostrarLogo && !modeloUrl && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[posicion[0] - ancho * 0.32, posicion[1] + 0.02, posicion[2] - alto * 0.32]}>
          <planeGeometry args={[Math.min(ancho, alto) * 0.28, Math.min(ancho, alto) * 0.28]} />
          <meshBasicMaterial map={logoTexture as THREE.Texture} transparent opacity={0.9} />
        </mesh>
      )}

      {mostrarEtiqueta && (
        <Text position={[posicion[0], posicion[1] + 0.12, posicion[2] + alto * 0.42]} fontSize={0.28} color={esZonaComun ? '#cbd5f5' : estiloEtiqueta} anchorX="center" anchorY="middle">
          {nombre || (esZonaComun ? 'Zona Común' : 'Zona de Empresa')}
        </Text>
      )}
    </group>
  );
};

export default ZonaEmpresa;
