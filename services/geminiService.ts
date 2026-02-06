/**
 * Servicio de IA para Mónica - Usa OpenRouter API
 * Soporta múltiples modelos via OpenRouter
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = (context: any) => `Eres Mónica, la asistente de IA del espacio de trabajo virtual "Cowork".
Contexto actual del espacio:
- Usuario: ${context.userName}
- Rol: ${context.role}
- Tareas Activas: ${context.tasks}

Instrucciones:
- Responde en Español de forma concisa y profesional.
- Enfócate en la productividad del equipo.
- Si el usuario pide crear una tarea, responde con un JSON en este formato exacto al final de tu mensaje:
  [CREATE_TASK]{"title":"titulo","description":"descripcion","startDate":"YYYY-MM-DD","dueDate":"YYYY-MM-DD"}[/CREATE_TASK]
- La fecha actual es: ${new Date().toISOString().split('T')[0]}.
- Usa emojis con moderación para hacer la conversación más amigable.
- Sé breve, máximo 2-3 oraciones por respuesta a menos que se pida algo detallado.`;

export const generateChatResponse = async (prompt: string, context: any) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY no configurada');
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Cowork - Mónica AI',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT(context) },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter error:', response.status, errorData);
      throw new Error(`Error de API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Detectar si hay un comando de crear tarea
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
  } catch (error) {
    console.error('Mónica AI Error:', error);
    throw error;
  }
};
