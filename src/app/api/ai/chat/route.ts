import { createClient } from '@/lib/supabase/server';
import { genAI, SYSTEM_PROMPT, TOOLS } from '@/lib/gemini';

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: 'Messages array required' }, { status: 400 });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-pro-preview',
      tools: TOOLS,
      systemInstruction: SYSTEM_PROMPT,
    });

    const chat = model.startChat({
      history: messages.slice(0, -1).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    });

    const lastMessage = messages[messages.length - 1].content;
    let result = await chat.sendMessage(lastMessage);
    let response = result.response;

    // Handle tool calls in a loop (up to 5 iterations to avoid infinite loops)
    let callCount = 0;
    while (response.functionCalls()?.length && callCount < 5) {
      callCount++;
      const toolResults: any[] = [];

      for (const call of response.functionCalls()!) {
        const { name, args } = call;
        const toolArgs = args as any;
        let toolData;

        console.log(`AI Calling Tool: ${name}`, toolArgs);

        if (name === 'list_categories') {
          const { data } = await supabase.from('categories').select('id, name, description');
          toolData = data || [];
        } else if (name === 'list_employees') {
          const query = supabase.from('profiles').select('id, full_name, email, role');
          if (toolArgs.search) {
            query.or(`full_name.ilike.%${toolArgs.search}%,email.ilike.%${toolArgs.search}%`);
          }
          const { data } = await query;
          toolData = data || [];
        } else if (name === 'create_task') {
          const { data, error } = await supabase.from('tasks').insert({
            ...toolArgs,
            created_by: user.id,
          }).select().single();
          
          if (error) {
            toolData = { error: error.message };
          } else {
            toolData = { success: true, task: data };
          }
        } else if (name === 'search_tasks') {
          const { data } = await supabase
            .from('tasks')
            .select('*')
            .or(`title.ilike.%${toolArgs.query}%,description.ilike.%${toolArgs.query}%`);
          toolData = data || [];
        }

        toolResults.push({
          functionResponse: {
            name,
            response: { result: toolData },
          },
        });
      }

      // Send tool results back to Gemini
      result = await chat.sendMessage(toolResults);
      response = result.response;
    }

    return Response.json({ content: response.text() });
  } catch (error: any) {
    console.error('Gemini API error:', error);
    return Response.json({ error: 'AI service error', details: error.message }, { status: 500 });
  }
}
