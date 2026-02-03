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
{remoteStream && remoteStream.getVideoTracks().some(t => t.enabled && t.readyState === 'live') ? (
  <StableVideo stream={remoteStream} ... />
) : (
  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
    {u.isCameraOn ? (
      // Usuario tiene cámara pero stream no disponible aún
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-indigo-500/20 animate-pulse">
          <svg>icono de cámara</svg>
        </div>
        <span>Conectando...</span>
      </div>
    ) : (
      // Usuario tiene cámara apagada - mostrar foto o inicial
      <div className="w-14 h-14 rounded-full border border-indigo-500/30 bg-black/50">
        {u.avatar ? (
          <img src={u.avatar} alt={u.name} />
        ) : (
          <span className="text-indigo-400">{u.name.charAt(0)}</span>
        )}
      </div>
    )}
  </div>
)}
```

### Estados Visuales
| Estado | Visualización |
|--------|---------------|
| Cámara ON + Stream activo | Video real del usuario |
| Cámara ON + Sin stream | Icono de cámara animado + "Conectando..." |
| Cámara OFF + Con foto | Foto de perfil circular con borde indigo |
| Cámara OFF + Sin foto | Inicial del nombre en color indigo |

---

## 4. Consistencia Visual Usuario Local vs Remoto

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
   - Visualización de estados en HUD grande
   - Consistencia visual entre usuario local y remotos

---

## Testing

Para verificar el correcto funcionamiento:

1. **Conexiones globales:** Dos usuarios en extremos opuestos del espacio deben ver las burbujas minimalistas con video real.

2. **Debounce:** Al alejarse y acercarse rápidamente, la conexión debe mantenerse estable (verificar en consola que no aparece "Closing connection").

3. **Estados de video:** 
   - Usuario con cámara ON pero lejos: debe mostrar "Conectando..." con icono animado
   - Usuario con cámara OFF: debe mostrar foto de perfil o inicial con estilo indigo

4. **Consistencia visual:** El estilo del círculo del usuario local debe ser idéntico al de los remotos cuando tienen cámara OFF.
