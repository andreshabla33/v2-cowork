/**
 * Servicio de IA para Mónica - Usa Edge Function proxy en Supabase
 * La Edge Function llama a OpenAI (sin CORS, key segura server-side)
 */

const SUPABASE_URL = 'https://lcryrsdyrzotjqdxcwtp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjcnlyc2R5cnpvdGpxZHhjd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDg0MTgsImV4cCI6MjA4MzIyNDQxOH0.8fsqkKHHOVCZMi8tAb85HN_It2QCSWP0delcFn56vd4';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/monica-ai-proxy`;

const SYSTEM_PROMPT = (context: any) => `Eres Mónica, la asistente de IA del espacio de trabajo virtual "Cowork".

Contexto del usuario actual:
- Nombre: ${context.userName}
- Rol en el espacio: ${context.role}
- Espacio de trabajo: ${context.workspaceName || 'No especificado'}
- Canales: ${context.channels || 'Ninguno'}
- Miembros en línea: ${context.onlineMembers || 'No disponible'}
- Tareas activas: ${context.tasks || 'Ninguna'}
${context.enrichedContext || ''}

Instrucciones:
- Conoces al usuario por su nombre, salúdalo personalmente.
- Responde en Español de forma concisa y profesional.
- Enfócate en la productividad del equipo.
- Tienes acceso a los datos privados del usuario: resúmenes de reuniones, action items, métricas de comportamiento y transcripciones. Usa esta información para dar respuestas personalizadas y contextuales.
- NUNCA reveles datos de otros usuarios. Solo puedes hablar de los datos del usuario actual.
- Si el usuario pregunta sobre reuniones pasadas, usa los resúmenes y transcripciones que tienes.
- Si el usuario pregunta sobre su rendimiento, usa las métricas de comportamiento.
- Si hay action items pendientes, recuérdaselos proactivamente cuando sea relevante.
- Si el usuario pide crear una tarea, responde con un JSON en este formato exacto al final de tu mensaje:
  [CREATE_TASK]{"title":"titulo","description":"descripcion","startDate":"YYYY-MM-DD","dueDate":"YYYY-MM-DD"}[/CREATE_TASK]
- La fecha actual es: ${new Date().toISOString().split('T')[0]}.
- Usa emojis con moderación para hacer la conversación más amigable.
- Sé breve, máximo 2-3 oraciones por respuesta a menos que se pida algo detallado.`;

export const generateChatResponse = async (prompt: string, context: any) => {
  console.log('🤖 Mónica AI: Enviando a Edge Function proxy...');

  // Obtener token JWT del usuario logueado para autenticar la Edge Function
  let authToken = SUPABASE_ANON_KEY;
  try {
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      authToken = session.access_token;
    }
  } catch (e) {
    console.warn('⚠️ No se pudo obtener JWT, usando anon key');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT(context) },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Edge Function falló (${response.status}):`, errorData);
      throw new Error(`Edge Function ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    console.log(`✅ Mónica AI: Respuesta exitosa (modelo: ${data.model || 'gpt-4o-mini'})`);
    return parseResponse(data.content || '');
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ Mónica AI: Timeout (20s)');
      throw new Error('Timeout: Mónica tardó demasiado en responder');
    }
    console.error('❌ Mónica AI: Error:', error);
    throw error;
  }
};

// Parsear respuesta y detectar comandos
function parseResponse(content: string) {
  const taskMatch = content.match(/\[CREATE_TASK\](.*?)\[\/CREATE_TASK\]/s);
  if (taskMatch) {
    try {
      const taskData = JSON.parse(taskMatch[1]);
      const cleanText = content.replace(/\[CREATE_TASK\].*?\[\/CREATE_TASK\]/s, '').trim();
      return {
        text: cleanText || `✅ Tarea "${taskData.title}" creada.`,
        functionCalls: [{ name: 'createTask', args: taskData }],
      };
    } catch (e) {
      console.error('Error parsing task JSON:', e);
    }
  }
  return { text: content, functionCalls: null };
}
