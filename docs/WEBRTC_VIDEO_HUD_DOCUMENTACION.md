# Documentación: WebRTC y Video HUD

## Fecha: 2026-02-02

## Resumen de Cambios

Esta documentación describe las mejoras implementadas en el sistema WebRTC y la visualización de video en el HUD del espacio virtual.

---

## 1. Conexiones WebRTC Globales (Estilo Gather)

### Problema Original
Las conexiones WebRTC solo se establecían cuando los usuarios estaban en proximidad, lo que causaba que:
- Las burbujas de video minimalistas no se mostraran a distancia
- Al alejarse y acercarse, el video no se reconectaba correctamente

### Solución Implementada
**Archivo:** `components/VirtualSpace3D.tsx`

```tsx
// Antes: Solo se conectaba con usuarios en proximidad (usersInCall)
// Ahora: Se conecta con TODOS los usuarios online

useEffect(() => {
  onlineUsers.forEach(user => {
    if (user.id === session.user.id) return;
    if (!peerConnectionsRef.current.has(user.id) && shouldInitiate) {
      initiateCall(user.id);
    }
  });
}, [onlineUsers, ...]);
```

### Comportamiento Nuevo
| Componente | Antes | Ahora |
|------------|-------|-------|
| Conexiones WebRTC | Solo proximidad | TODOS los usuarios online |
| Cierre de conexión | Al salir de proximidad | Al salir del ESPACIO |
| Burbuja minimalista | Placeholder si lejos | Video real siempre |
| HUD grande | Solo proximidad | Solo proximidad (sin cambio) |
| Audio | Solo proximidad | Solo proximidad (sin cambio) |

---

## 2. Debounce en Cierre de Conexiones

### Problema Original
Las conexiones WebRTC se cerraban prematuramente cuando `onlineUsers` se actualizaba momentáneamente por updates de presencia de Supabase.

### Solución Implementada
**Archivo:** `components/VirtualSpace3D.tsx`

```tsx
// Ref para tracking de usuarios que deben ser desconectados (con debounce)
const pendingDisconnectsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

// Lógica con debounce de 3 segundos
useEffect(() => {
  const onlineUserIds = new Set(onlineUsers.map(u => u.id));
  
  // Cancelar desconexiones pendientes para usuarios que volvieron
  onlineUserIds.forEach(userId => {
    const timeout = pendingDisconnectsRef.current.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      pendingDisconnectsRef.current.delete(userId);
    }
  });
  
  // Programar desconexiones con delay de 3s
  peerConnectionsRef.current.forEach((pc, peerId) => {
    if (!onlineUserIds.has(peerId) && !pendingDisconnectsRef.current.has(peerId)) {
      const timeout = setTimeout(() => {
        // Cerrar conexión después de 3s si usuario sigue ausente
        pc.close();
        // ... limpiar streams
      }, 3000);
      pendingDisconnectsRef.current.set(peerId, timeout);
    }
  });
}, [onlineUsers]);
```

### Logs de Diagnóstico
- `Scheduling disconnect for user (3s delay): ...` - Se programa el cierre
- `Cancelled pending disconnect for user who came back: ...` - Se cancela si reaparece
- `Closing connection with user who left space: ...` - Cierre definitivo

---

## 3. Visualización de Video en HUD Grande

### Problema Original
El HUD grande mostraba solo la inicial del nombre cuando el stream de video no estaba disponible, sin distinguir entre:
- Usuario con cámara ON pero sin stream (conectando)
- Usuario con cámara OFF

### Solución Implementada
**Archivo:** `components/VirtualSpace3D.tsx`

```tsx
// Prioridad: 1) Cámara OFF = foto, 2) Cámara ON + stream = video, 3) Cámara ON sin stream = conectando
{!u.isCameraOn ? (
  // Usuario tiene cámara apagada - mostrar foto o inicial (SIEMPRE)
  <div className="w-14 h-14 rounded-full border border-indigo-500/30 bg-black/50">
    {u.avatar ? <img src={u.avatar} /> : <span>{u.name.charAt(0)}</span>}
  </div>
) : remoteStream && remoteStream.getVideoTracks().length > 0 ? (
  // Usuario tiene cámara ON y hay stream disponible
  <StableVideo stream={remoteStream} ... />
) : (
  // Usuario tiene cámara ON pero stream no disponible aún
  <div className="flex flex-col items-center">
    <div className="w-12 h-12 rounded-full bg-indigo-500/20 animate-pulse">
      <svg>icono de cámara</svg>
    </div>
    <span>Conectando...</span>
  </div>
)}
```

### Estados Visuales (Prioridad de Evaluación)
| Prioridad | Condición | Visualización |
|-----------|-----------|---------------|
| 1 | Cámara OFF | Foto de perfil o inicial (borde indigo) |
| 2 | Cámara ON + Stream | Video real del usuario |
| 3 | Cámara ON + Sin stream | Icono animado + "Conectando..." |

---

## 4. Control de Hardware de Cámara

### Problema Original
Cuando el usuario apagaba la cámara desde el botón (HUD o minimalista), el track de video solo se deshabilitaba (`track.enabled = false`) pero NO se detenía. Esto causaba que:
- El LED de la cámara siguiera encendido
- El hardware de la cámara continuara capturando video
- El navegador mostrara el indicador de cámara activa

### Solución Implementada
**Archivo:** `components/VirtualSpace3D.tsx`

```tsx
// Video: DETENER el track completamente si cámara OFF (libera hardware)
const videoTracks = activeStreamRef.current.getVideoTracks();
if (!currentUser.isCameraOn && videoTracks.length > 0) {
  console.log('Camera OFF - stopping video track to release hardware');
  videoTracks.forEach(track => {
    track.stop();  // Libera el hardware
    activeStreamRef.current?.removeTrack(track);
  });
  // Notificar a los peers que el video track se removió
  peerConnectionsRef.current.forEach((pc) => {
    pc.getSenders().forEach(sender => {
      if (sender.track?.kind === 'video') {
        try { pc.removeTrack(sender); } catch (e) { /* ignore */ }
      }
    });
  });
} else if (currentUser.isCameraOn && videoTracks.length === 0) {
  // Cámara ON pero no hay video track - obtener nuevo stream de video
  console.log('Camera ON - requesting new video track');
  const videoStream = await navigator.mediaDevices.getUserMedia({ video: {...} });
  const newVideoTrack = videoStream.getVideoTracks()[0];
  activeStreamRef.current.addTrack(newVideoTrack);
  // Agregar a peers existentes
  peerConnectionsRef.current.forEach((pc) => {
    pc.addTrack(newVideoTrack, activeStreamRef.current!);
  });
}
```

### Comportamiento
| Acción | Antes | Ahora |
|--------|-------|-------|
| Apagar cámara | `track.enabled = false` (LED sigue ON) | `track.stop()` (LED se apaga) |
| Encender cámara | Habilitar track existente | Solicitar nuevo track de video |
| Hardware | Siempre capturando | Solo cuando cámara ON |

### Logs de Diagnóstico
- `Camera OFF - stopping video track to release hardware` - Track detenido
- `Camera ON - requesting new video track` - Solicitando nuevo acceso

---

## 5. Estado Inicial de Cámara

### Configuración por Defecto
**Archivo:** `store/useStore.ts`

```tsx
currentUser: {
  // ...
  isMicOn: false,      // Micrófono apagado por defecto
  isCameraOn: false,   // Cámara apagada por defecto
  isScreenSharing: false,
}
```

Las cámaras están **apagadas por defecto** al entrar al espacio. Solo se encienden cuando:
1. El usuario hace clic en el botón de cámara
2. El usuario entra en proximidad con otro usuario (si tiene cámara habilitada)

---

## 6. Consistencia Visual Usuario Local vs Remoto

### Problema Original
El estilo visual del usuario local con cámara apagada era diferente al de los usuarios remotos.

### Solución Implementada
Ambos ahora usan el mismo estilo:
- Círculo con borde `border-indigo-500/30`
- Fondo `bg-black/50`
- Foto de perfil si disponible, o inicial en `text-indigo-400`

---

## Archivos Modificados

1. **`components/VirtualSpace3D.tsx`**
   - Lógica de conexiones WebRTC globales
   - Debounce en cierre de conexiones
   - Visualización de estados en HUD grande (prioridad cámara OFF > stream)
   - Consistencia visual entre usuario local y remotos
   - Control de hardware de cámara (stop/start tracks)
   - Agregar tracks en renegociaciones WebRTC

2. **`store/useStore.ts`**
   - Estado inicial de cámara y micrófono (apagados por defecto)

---

## Testing

Para verificar el correcto funcionamiento:

1. **Conexiones globales:** Dos usuarios en extremos opuestos del espacio deben ver las burbujas minimalistas con video real.

2. **Debounce:** Al alejarse y acercarse rápidamente, la conexión debe mantenerse estable (verificar en consola que no aparece "Closing connection").

3. **Estados de video:** 
   - Usuario con cámara ON pero lejos: debe mostrar "Conectando..." con icono animado
   - Usuario con cámara OFF: debe mostrar foto de perfil o inicial con estilo indigo

4. **Consistencia visual:** El estilo del círculo del usuario local debe ser idéntico al de los remotos cuando tienen cámara OFF.

5. **Hardware de cámara:**
   - Apagar cámara → LED de cámara debe apagarse inmediatamente
   - Consola debe mostrar: `Camera OFF - stopping video track to release hardware`
   - Encender cámara → Solicita nuevo permiso de video
   - Consola debe mostrar: `Camera ON - requesting new video track`

6. **Estado inicial:**
   - Al cargar la página, cámara debe estar OFF por defecto
   - Las burbujas minimalistas no deben mostrar video hasta que el usuario encienda la cámara
