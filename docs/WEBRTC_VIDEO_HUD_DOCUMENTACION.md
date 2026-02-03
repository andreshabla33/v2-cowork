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

7. **Reconexión tras alejarse/acercarse:**
   - Al alejarse y volver, el video del otro usuario debe aparecer en el HUD grande
   - Consola debe mostrar: `Adding new stream tracks to X existing peer connections`
   - Consola debe mostrar: `Sending renegotiation offer to XXX`

---

## 7. Reconexión WebRTC al Entrar/Salir de Proximidad

### Problema Original
Cuando un usuario salía de proximidad y volvía a entrar, el video del otro usuario NO aparecía en el HUD grande. Requería recargar la página para que funcionara.

### Diagnóstico
Analizando los logs de consola se identificaron varios problemas en cadena:

#### Problema 1: Tracks locales no se agregaban en renegociaciones
Cuando un usuario recibía una oferta (`handleOffer`) y ya tenía una conexión existente, NO agregaba sus tracks locales.

**Síntoma en consola:**
```
New connection established with XXX
Connection state: connected
// PERO no aparecía "Detected CAMERA from XXX"
```

**Solución:**
```tsx
const handleOffer = useCallback(async (offer, fromId) => {
  let pc = peerConnectionsRef.current.get(fromId);
  
  if (!pc) {
    pc = createPeerConnection(fromId);
  } else {
    // NUEVO: Verificar y agregar tracks faltantes en renegociaciones
    const senders = pc.getSenders();
    const hasVideoSender = senders.some(s => s.track?.kind === 'video');
    const hasAudioSender = senders.some(s => s.track?.kind === 'audio');
    
    if (activeStreamRef.current && (!hasVideoSender || !hasAudioSender)) {
      console.log('Adding local tracks to existing connection for renegotiation');
      activeStreamRef.current.getTracks().forEach(track => {
        if (!senders.find(s => s.track?.kind === track.kind)) {
          pc.addTrack(track, activeStreamRef.current!);
        }
      });
    }
  }
  // ... resto del código
});
```

#### Problema 2: Nuevo stream local no se enviaba a peers existentes
Cuando el usuario volvía a entrar en proximidad, se creaba un nuevo stream local pero NO se agregaba a las conexiones peer existentes.

**Síntoma en consola:**
```
Camera/mic stream started
// PERO el otro usuario no recibía "Detected CAMERA from XXX"
```

**Solución:**
```tsx
// Después de crear el nuevo stream
activeStreamRef.current = newStream;
setStream(newStream);
console.log('Camera/mic stream started');

// NUEVO: Agregar tracks a conexiones EXISTENTES y renegociar
if (peerConnectionsRef.current.size > 0) {
  console.log('Adding new stream tracks to', peerConnectionsRef.current.size, 'existing peer connections');
  
  peerConnectionsRef.current.forEach(async (pc, peerId) => {
    const senders = pc.getSenders();
    const hasAudio = senders.some(s => s.track?.kind === 'audio');
    const hasVideo = senders.some(s => s.track?.kind === 'video');
    
    newStream.getTracks().forEach(track => {
      const alreadyHas = (track.kind === 'audio' && hasAudio) || (track.kind === 'video' && hasVideo);
      if (!alreadyHas) {
        console.log('Adding', track.kind, 'track to peer', peerId);
        pc.addTrack(track, newStream);
      }
    });
    
    // IMPORTANTE: Renegociar para que el peer reciba los nuevos tracks
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    webrtcChannelRef.current.send({
      type: 'broadcast',
      event: 'offer',
      payload: { offer, to: peerId, from: session?.user?.id }
    });
    console.log('Sending renegotiation offer to', peerId);
  });
}
```

### Flujo Correcto Después del Fix

```
Usuario A sale de proximidad:
  → "PROXIMITY EXIT"
  → "Stopping camera/mic - no active call"
  → Tracks locales se detienen

Usuario A vuelve a entrar:
  → "PROXIMITY ENTER"
  → "Requesting camera/mic access..."
  → "Camera/mic stream started"
  → "Adding new stream tracks to 1 existing peer connections"
  → "Adding audio track to peer XXX"
  → "Adding video track to peer XXX"
  → "Sending renegotiation offer to XXX"

Usuario B recibe la renegociación:
  → "Renegotiation completed with XXX"
  → "Received remote track from XXX kind: video"
  → "Detected CAMERA from XXX"
  → Video aparece en HUD grande ✅
```

### Logs de Diagnóstico para Debugging

| Log | Significado | Estado |
|-----|-------------|--------|
| `Adding new stream tracks to X existing peer connections` | Inicio de agregado de tracks | ✅ Normal |
| `Adding audio/video track to peer XXX` | Track agregado exitosamente | ✅ Normal |
| `Sending renegotiation offer to XXX` | Oferta de renegociación enviada | ✅ Normal |
| `Renegotiation completed with XXX` | Renegociación aceptada | ✅ Normal |
| `Detected CAMERA from XXX` | Track de video recibido | ✅ Normal |
| `Adding local tracks to existing connection for renegotiation` | Tracks agregados en handleOffer | ✅ Normal |

### Resumen de Archivos Modificados

**`components/VirtualSpace3D.tsx`:**
1. `handleOffer()` - Agregar tracks locales faltantes en renegociaciones
2. `manageStream()` - Agregar tracks a peers existentes al crear nuevo stream
3. `manageStream()` - Forzar renegociación después de agregar tracks

---

## 8. Menú de Configuración de Cámara

### Descripción
Menú de configuración estilo Gather que permite al usuario personalizar su experiencia de video.

### Funcionalidades Implementadas

| Función | Descripción |
|---------|-------------|
| **Selector de cámara** | Lista todas las cámaras disponibles del dispositivo |
| **Hide self view** | Oculta la vista propia mientras sigue transmitiendo |
| **Espejo de video** | Voltea horizontalmente el video (mirror) |
| **Efectos de fondo** | Ninguno, desenfoque (blur), imagen personalizada |
| **Persistencia** | Configuración guardada en localStorage |

### Archivos Creados/Modificados

**Nuevo archivo: `components/CameraSettingsMenu.tsx`**
- Componente de menú de configuración de cámara
- Funciones de utilidad: `loadCameraSettings()`, `saveCameraSettings()`
- Interfaz `CameraSettings` exportada

**Modificado: `components/VirtualSpace3D.tsx`**
- Importación del componente `CameraSettingsMenu`
- Estados: `showCameraSettings`, `cameraSettings`
- Botón de configuración (⚙️) en la burbuja local del HUD
- Clase `mirror` condicional según `cameraSettings.mirrorVideo`
- Indicador visual cuando "hide self view" está activo
- `manageStream()` usa `selectedCameraId` del localStorage

### Estructura de CameraSettings

```typescript
interface CameraSettings {
  selectedCameraId: string;      // ID del dispositivo de cámara
  backgroundEffect: 'none' | 'blur' | 'image';
  backgroundImage: string | null; // Base64 de imagen subida
  hideSelfView: boolean;         // Ocultar vista propia
  mirrorVideo: boolean;          // Espejo de video (default: true)
}
```

### Persistencia

```typescript
// Guardar configuración
localStorage.setItem('cowork_camera_settings', JSON.stringify(settings));

// Cargar configuración
const settings = JSON.parse(localStorage.getItem('cowork_camera_settings'));
```

### Uso de Cámara Seleccionada

```tsx
// En manageStream()
const cameraSettings = loadCameraSettings();
const videoConstraints: MediaTrackConstraints = { 
  width: 640, 
  height: 480 
};
if (cameraSettings.selectedCameraId) {
  videoConstraints.deviceId = { exact: cameraSettings.selectedCameraId };
}

// Con fallback si la cámara no está disponible
await navigator.mediaDevices.getUserMedia({ 
  video: videoConstraints, 
  audio: true 
}).catch(async (err) => {
  // Si falla, usar cámara por defecto
  return navigator.mediaDevices.getUserMedia({ 
    video: { width: 640, height: 480 }, 
    audio: true 
  });
});
```

### Logs de Diagnóstico

| Log | Significado |
|-----|-------------|
| `Using selected camera: XXX` | Usando cámara específica del usuario |
| `Selected camera not available, using default` | Fallback a cámara por defecto |

### Acceso al Menú

1. Pasar el mouse sobre la burbuja de video local (HUD grande)
2. Click en el botón de engranaje (⚙️)
3. El menú aparece encima de la burbuja

### Comportamiento de "Hide Self View"

- La cámara **sigue transmitiendo** a otros usuarios
- Solo se oculta la vista local
- Se muestra un indicador visual "Vista oculta"
- Los otros usuarios ven el video normalmente
