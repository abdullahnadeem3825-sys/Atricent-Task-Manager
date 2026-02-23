import { createClient } from '@/lib/supabase/server';
import { genAI, TASK_ACTION_PROMPTS } from '@/lib/gemini';

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, task } = await request.json();

  if (!action || !task || !TASK_ACTION_PROMPTS[action]) {
    return Response.json({ error: 'Invalid action or task' }, { status: 400 });
  }

  try {
    const prompt = TASK_ACTION_PROMPTS[action](task);

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-pro-preview',
      systemInstruction: 'You are a project management AI assistant. Provide concise, actionable responses for task management operations. Be specific and practical.',
    });

    const response = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 1024,
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of response.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          console.error('Gemini streaming error:', err);
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Gemini API error:', error);
    return Response.json({ error: 'AI service error' }, { status: 500 });
  }
}
