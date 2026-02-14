import type { User } from '../types';
import { Role } from '../types';
import { obtenerChunk, obtenerChunksVecinos } from './chunkSystem';

export const filtrarUsuariosPorChunks = (
  usuarios: User[],
  x: number,
  y: number,
  radio: number = 1
): User[] => {
  if (!Array.isArray(usuarios) || usuarios.length === 0) return [];
  const chunkActual = obtenerChunk(x, y);
  const chunksVecinos = new Set(obtenerChunksVecinos(chunkActual, radio));

  return usuarios.filter((usuario) => {
    if (typeof usuario.x !== 'number' || typeof usuario.y !== 'number') return false;
    const chunkUsuario = obtenerChunk(usuario.x, usuario.y);
    return chunksVecinos.has(chunkUsuario.clave);
  });
};

export const aplicarInteresEmpresa = (
  usuarios: User[],
  empresaIdActual?: string | null,
  rolActual?: Role,
  departamentoIdActual?: string | null,
  empresasAutorizadas: string[] = []
): User[] => {
  const esAdmin = rolActual === Role.SUPER_ADMIN || rolActual === Role.ADMIN;
  const esModerador = rolActual === Role.MODERADOR;

  if (!empresaIdActual) return usuarios;

  return usuarios.map((usuario) => {
    if (esAdmin || !usuario.empresa_id || usuario.empresa_id === empresaIdActual) {
      if (departamentoIdActual && usuario.departamento_id && usuario.departamento_id !== departamentoIdActual && !esAdmin) {
        return {
          ...usuario,
          name: usuario.name || 'Miembro de otro equipo',
          isMicOn: false,
          isCameraOn: false,
          isScreenSharing: false,
          isPrivate: true,
          esFantasma: true,
        };
      }

      return { ...usuario, esFantasma: false };
    }

    const esEmpresaAutorizada = !!usuario.empresa_id && empresasAutorizadas.includes(usuario.empresa_id);

    if (esEmpresaAutorizada) {
      return {
        ...usuario,
        esFantasma: false,
      };
    }

    if (esModerador) {
      return {
        ...usuario,
        name: usuario.name || 'Miembro de otra empresa',
        isMicOn: false,
        isCameraOn: false,
        isScreenSharing: false,
        isPrivate: true,
        esFantasma: true,
      };
    }

    return {
      ...usuario,
      name: 'Miembro de otra empresa',
      isMicOn: false,
      isCameraOn: false,
      isScreenSharing: false,
      isPrivate: true,
      esFantasma: true,
    };
  });
};
