/**
 * Servicio de IA para Mónica - Usa OpenRouter API
 * Soporta múltiples modelos via OpenRouter
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

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

// Modelos en orden de preferencia (fallback si el primero falla)
const MODELS = [
  'google/gemini-2.0-flash-001',
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-flash-1.5',
];

export const generateChatResponse = async (prompt: string, context: any) => {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPEN_AI;
  
  if (!openrouterKey && !openaiKey) {
    console.error('❌ Mónica AI: Ni OPENROUTER_API_KEY ni OPEN_AI configuradas');
    throw new Error('API Key de IA no configurada');
  }
  console.log('🔑 Mónica AI: OpenRouter:', openrouterKey ? openrouterKey.substring(0, 12) + '...' : 'NO');
  console.log('🔑 Mónica AI: OpenAI:', openaiKey ? openaiKey.substring(0, 12) + '...' : 'NO');

  let lastError: Error | null = null;

  // Intentar primero con OpenRouter (múltiples modelos)
  if (openrouterKey) {
    for (const model of MODELS) {
      try {
        console.log(`🤖 Mónica AI [OpenRouter]: Intentando ${model}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Cowork - Mónica AI',
          },
          body: JSON.stringify({
            model,
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
          console.warn(`⚠️ [OpenRouter] ${model} falló (${response.status}):`, errorData);
          lastError = new Error(`OpenRouter ${response.status}: ${errorData}`);
          continue;
        }

        console.log(`✅ [OpenRouter] Respuesta exitosa con ${model}`);
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        return parseResponse(content);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn(`⚠️ [OpenRouter] Timeout con ${model}`);
          lastError = new Error(`Timeout OpenRouter ${model}`);
        } else {
          console.error(`❌ [OpenRouter] Error ${model}:`, error);
          lastError = error;
        }
        continue;
      }
    }
  }

  // Fallback: OpenAI directo
  if (openaiKey) {
    try {
      console.log('🤖 Mónica AI [OpenAI]: Intentando gpt-4o-mini...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
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
        console.warn(`⚠️ [OpenAI] gpt-4o-mini falló (${response.status}):`, errorData);
        lastError = new Error(`OpenAI ${response.status}: ${errorData}`);
      } else {
        console.log('✅ [OpenAI] Respuesta exitosa con gpt-4o-mini');
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        return parseResponse(content);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('⚠️ [OpenAI] Timeout gpt-4o-mini');
        lastError = new Error('Timeout OpenAI');
      } else {
        console.error('❌ [OpenAI] Error:', error);
        lastError = error;
      }
    }
  }

  // Si todo falló
  console.error('❌ Mónica AI: Todos los proveedores/modelos fallaron');
  throw lastError || new Error('No se pudo conectar con ningún modelo de IA');
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
