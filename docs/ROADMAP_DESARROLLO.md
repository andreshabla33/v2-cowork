# 🚀 Roadmap de Desarrollo - MVP Cowork Virtual

> **Fecha de creación:** 15 de Enero 2026  
> **Última actualización:** 26 de Enero 2026

---

## 📊 Análisis Competitivo vs Gather.town

### Funcionalidades Comparadas

| Funcionalidad | Gather | Nosotros | Estado |
|---------------|:------:|:--------:|:------:|
| Espacio virtual | 2D Pixel | 3D React Three | ✅ Ventaja |
| Avatares animados | ✅ | ⚠️ Básico | Fase 3 |
| Video/Audio por proximidad | ✅ | ✅ | ✅ Completado |
| Screen sharing | ✅ | ✅ | ✅ Completado |
| Reacciones emoji | ✅ | ✅ | ✅ Completado |
| Chat con canales | ✅ | ✅ | ✅ Completado |
| Canales privados | ✅ | ✅ | ✅ Completado |
| Mensajes directos (DM) | ✅ | ✅ | ✅ Completado |
| Threads/Hilos | ✅ | ✅ | ✅ Completado |
| Menciones @usuario | ✅ | ✅ | ✅ Completado |
| Typing indicator | ✅ | ✅ | ✅ Completado |
| Archivos adjuntos | ✅ | ✅ | ✅ Completado |
| Toast notifications | ✅ | ✅ | ✅ Completado |
| Unread counts | ✅ | ✅ | ✅ Completado |
| Salas de reunión | ✅ | ✅ | ✅ Completado |
| Reuniones programadas | ✅ | ❌ | **Fase 1** |
| Integración Calendar | ✅ | ❌ | **Fase 1** |
| Grabación de reuniones | ✅ | ✅ | ✅ Completado |
| AI Meeting Notes | ✅ | ✅ | ✅ Completado |
| Transcripción local (MoonshineJS) | ❌ | ✅ | ✅ Ventaja |
| Análisis de emociones (MediaPipe) | ❌ | ✅ | ✅ Ventaja |
| AI Agents en espacio | ❌ | 🎯 | Diferenciador |

---

## 🏗️ Arquitectura Actual

### Componentes Principales

```
src/
├── components/
│   ├── VirtualSpace3D.tsx    # Espacio 3D principal + WebRTC
│   ├── Avatar3DGLTF.tsx      # Avatar procedural (reemplazable)
│   ├── ChatPanel.tsx         # Chat básico actual
│   ├── ChatSidebar.tsx       # Sidebar de chat
│   └── ...
├── store/
│   └── useStore.ts           # Estado global (Zustand)
├── lib/
│   └── supabase.ts           # Cliente Supabase
└── types/
    └── index.ts              # Tipos TypeScript
```

### Decisión Arquitectónica: Avatares

**El componente de avatar está DESACOPLADO del resto del sistema.**

```typescript
// Interface actual del avatar (NO CAMBIAR)
interface ProceduralAvatarProps {
  config: {
    skinColor?: string;
    clothingColor?: string;
    hairColor?: string;
    hairStyle?: string;
    accessory?: string;
    eyeColor?: string;
  };
  isMoving?: boolean;
  direction?: string;
}
```

**Impacto:** Cuando implementemos avatares GLTF (Fase 3), solo cambiamos el componente interno manteniendo la misma interfaz. Chat y Reuniones NO se ven afectados.

---

## 📅 Fases de Desarrollo

### ✅ Ya Implementado (Chat Completo)

El sistema de chat ya está **completamente funcional** con:

| Feature | Archivo | Estado |
|---------|---------|:------:|
| Canales públicos/privados | `ChatPanel.tsx` | ✅ |
| Mensajes directos (DM) | `ChatPanel.tsx` | ✅ |
| Threads/hilos | `openThread()`, `respuesta_a` | ✅ |
| Menciones @usuario | `detectMentions()`, `insertMention()` | ✅ |
| Typing indicator | `typingChannel` broadcast | ✅ |
| Toast notifications | `ChatToast.tsx` | ✅ |
| Unread counts por canal | `unreadByChannel` state | ✅ |
| Archivos adjuntos | `handleFileAttach()` | ✅ |
| Emojis | `emojis[]` picker | ✅ |
| Realtime | Supabase postgres_changes | ✅ |
| Salas de reunión | `MeetingRooms.tsx` | ✅ |
| Crear/unirse a salas | `createRoom()`, `joinRoom()` | ✅ |

---

### Fase 1: Reuniones Programadas ⬅️ **ACTUAL**

**Objetivo:** Sistema de reuniones con calendario

#### Funcionalidades

| # | Feature | Prioridad | Esfuerzo |
|---|---------|-----------|----------|
| 1.1 | Programar reuniones con fecha/hora | Alta | 2 días |
| 1.2 | Integración Google Calendar | Alta | 2 días |
| 1.3 | Invitaciones a reuniones | Media | 1 día |
| 1.4 | Recordatorios de reuniones | Media | 1 día |
| 1.5 | Vista de calendario en UI | Media | 2 días |

#### Tablas Supabase Requeridas

```sql
-- Reuniones programadas
CREATE TABLE IF NOT EXISTS reuniones_programadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  espacio_id UUID NOT NULL REFERENCES espacios_trabajo(id) ON DELETE CASCADE,
  sala_id UUID REFERENCES salas_reunion(id) ON DELETE SET NULL,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,
  creado_por UUID REFERENCES auth.users(id),
  google_event_id VARCHAR(255), -- Para sincronización con Google Calendar
  es_recurrente BOOLEAN DEFAULT false,
  recurrencia_regla TEXT, -- Ej: "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  recordatorio_minutos INTEGER DEFAULT 15,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Participantes de reunión programada
CREATE TABLE IF NOT EXISTS reunion_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id UUID NOT NULL REFERENCES reuniones_programadas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, aceptado, rechazado, tentativo
  notificado BOOLEAN DEFAULT false,
  UNIQUE(reunion_id, usuario_id)
);
```

---

### ✅ Fase 2: Grabación y AI Notes - COMPLETADO

**Objetivo:** Grabar reuniones y generar notas automáticas con AI  
**Fecha completado:** 26 de Enero 2026

#### Tecnologías Implementadas

| Tecnología | Propósito | Ventaja |
|------------|-----------|---------|
| **MoonshineJS** | Transcripción ASR local | 5-15x más rápido que Whisper, sin costos API |
| **MediaPipe Face Landmarker** | Análisis de emociones | 52 blendshapes, engagement en tiempo real |
| **OpenAI GPT-4o-mini** | Resumen AI | Action items, puntos clave |
| **MediaRecorder API** | Grabación nativa | Sin dependencias externas |

#### Funcionalidades Implementadas

| # | Feature | Estado | Archivo |
|---|---------|:------:|---------|
| 2.1 | Grabación de audio/video | ✅ | `useRecording.ts` |
| 2.2 | Almacenamiento en Supabase Storage | ✅ | Bucket `grabaciones` |
| 2.3 | Transcripción local (MoonshineJS) | ✅ | `useTranscription.ts` |
| 2.4 | Análisis de emociones (MediaPipe) | ✅ | `useEmotionAnalysis.ts` |
| 2.5 | Resumen AI con GPT-4o-mini | ✅ | `generar-resumen-ai/` |
| 2.6 | Extracción de action items | ✅ | Edge Function |
| 2.7 | Notificación al creador | ✅ | `useAISummary.ts` |

#### Componentes UI

```
components/meetings/recording/
├── RecordingButton.tsx       # Botón con animación de pulso
├── RecordingIndicator.tsx    # Badge "REC" con timer
├── RecordingConsent.tsx      # Modal de consentimiento
├── TranscriptionTimeline.tsx # Timeline con emociones
└── AISummaryPanel.tsx        # Panel resumen + action items
```

#### Flujo de Datos

```
Audio Stream → MoonshineJS → Transcripción Tiempo Real
                    ↓
Video Stream → MediaPipe → Análisis Emociones (52 blendshapes)
                    ↓
            Al finalizar grabación
                    ↓
Edge Function (OpenAI GPT-4o-mini) → Resumen + Action Items
                    ↓
            Notificación al creador
```

#### Tablas Supabase

Ver `docs/FASE2_GRABACION_MIGRACIONES.sql` para schema completo:
- `grabaciones` - Metadata de grabaciones
- `transcripciones` - Segmentos con timestamps
- `analisis_comportamiento` - Emociones y engagement
- `resumenes_ai` - Resumen, action items, métricas
- `notificaciones` - Sistema de notificaciones

---

### Fase 3: Avatares 3D Avanzados

**Objetivo:** Avatares GLTF con animaciones completas

#### Funcionalidades

| # | Feature | Prioridad | Esfuerzo |
|---|---------|-----------|----------|
| 3.1 | Modelos GLTF chibi | Alta | 5 días* |
| 3.2 | Animaciones (idle, walk, sit, work) | Alta | 3 días |
| 3.3 | Sistema de emotes animados | Media | 2 días |
| 3.4 | Accesorios modulares | Baja | 2 días |
| 3.5 | Selector de avatar mejorado | Media | 2 días |

*Depende de si compramos assets o creamos custom

#### Opciones para Modelos

| Opción | Costo | Tiempo | Calidad |
|--------|-------|--------|---------|
| Synty Studios Pack | ~$30-40 | 1 día | Alta |
| Quaternius (gratis) | $0 | 1 día | Media |
| Artista 3D (Fiverr) | ~$100-300 | 1-2 semanas | Custom |
| Crear en Blender | $0 | 2-4 semanas | Variable |

#### Cambios Requeridos

```typescript
// Avatar3DGLTF.tsx - Nuevo componente
import { useGLTF, useAnimations } from '@react-three/drei';

export const GLTFAvatar: React.FC<AvatarProps> = ({ config, isMoving, direction }) => {
  const { scene, animations } = useGLTF('/avatars/chibi-base.glb');
  const { actions } = useAnimations(animations, scene);
  
  useEffect(() => {
    const anim = isMoving ? 'walk' : 'idle';
    actions[anim]?.reset().fadeIn(0.2).play();
  }, [isMoving]);
  
  // Aplicar colores a materiales
  // Rotar según direction
  
  return <primitive object={scene} />;
};
```

**Impacto en otras fases:** NINGUNO - El avatar es un componente aislado.

---

### Fase 4: AI Agents en Espacio (Diferenciador)

**Objetivo:** Agentes AI como avatares 3D interactivos

> ⚠️ Esta es nuestra **ventaja competitiva única** vs Gather

#### Funcionalidades

| # | Feature | Descripción |
|---|---------|-------------|
| 4.1 | Agentes como avatares | Claude, Codex, Gemini como personajes 3D |
| 4.2 | Interacción por proximidad | Acercarte al agente para chatear |
| 4.3 | Animaciones de trabajo | Agente "escribiendo" cuando procesa |
| 4.4 | Tareas visibles | Ver qué está haciendo el agente |
| 4.5 | Multi-agent collaboration | Agentes trabajando entre sí |

---

## 📋 Checklist Fase 1 - Reuniones Programadas

### Preparación
- [ ] Crear tabla `reuniones_programadas` en Supabase
- [ ] Crear tabla `reunion_participantes` en Supabase
- [ ] Configurar RLS policies
- [ ] Configurar Google Calendar API (OAuth)

### Desarrollo
- [ ] **1.1 Programar Reuniones**
  - [ ] Modal para crear reunión (fecha, hora, título, descripción)
  - [ ] Selector de participantes
  - [ ] Vincular con sala existente (opcional)

- [ ] **1.2 Integración Google Calendar**
  - [ ] OAuth flow para conectar cuenta
  - [ ] Crear eventos en Google Calendar
  - [ ] Sincronizar cambios bidireccional

- [ ] **1.3 Vista de Calendario**
  - [ ] Componente de calendario mensual/semanal
  - [ ] Ver reuniones programadas
  - [ ] Quick actions (unirse, editar, cancelar)

- [ ] **1.4 Recordatorios**
  - [ ] Notificación antes de reunión
  - [ ] Toast/badge cuando inicia reunión

### Testing
- [ ] Crear reunión programada
- [ ] Invitar participantes
- [ ] Ver en Google Calendar
- [ ] Recibir recordatorio
- [ ] Unirse a reunión desde el espacio

---

## ✅ Checklist Chat (YA COMPLETADO)

### Features Implementados
- [x] Canales públicos/privados (`grupos_chat`)
- [x] Mensajes directos (DM)
- [x] Threads/hilos (`respuesta_a`)
- [x] Menciones @usuario (`detectMentions()`)
- [x] Typing indicator
- [x] Toast notifications
- [x] Unread counts por canal
- [x] Archivos adjuntos
- [x] Emojis
- [x] Realtime con Supabase
- [x] Salas de reunión (`MeetingRooms.tsx`)

---

## 🔗 Referencias

- [Gather.town Features](https://www.gather.town/features)
- [Gather What's New](https://www.gather.town/whats-new)
- [AI Agents 2026 Trends](https://eoxysit.com/blogs/ai-agents-in-2026-from-helpful-assistants-to-autonomous-digital-co-workers/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

## 📝 Notas

1. **Avatares 3D son independientes** - Se pueden implementar en cualquier momento sin afectar Chat o Reuniones
2. **Priorizar funcionalidades core** - Chat y Reuniones son esenciales para competir
3. **AI Agents es el diferenciador** - Ningún competidor lo tiene actualmente
