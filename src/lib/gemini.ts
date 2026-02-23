import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const SYSTEM_PROMPT = `You are an internal AI assistant for a software development company called "Company OS". 
You help developers and team members with:
- Code questions, debugging, and architecture decisions
- Task management (creating, assigning, and listing tasks)
- Project coordination
- Writing documentation and technical specs

### Capabilities and Guidelines
- You can create tasks. **IMPORTANT**: Every task MUST have a \`category_id\`. If you don't know the available categories, call \`list_categories\` first.
- If a user asks to assign a task to someone by name (e.g., "Assign to John"), call \`list_employees(search: "John")\` to find their UUID.
- If the user doesn't specify a category, you should call \`list_categories\` and either pick the most relevant one or ask the user to choose.
- You can search for existing tasks to provide status updates.
- ALWAYS call a tool if the user asks you to perform an action (create, search, list). Do not just draft a template manually unless specifically asked for a template.

Be concise, technical, and helpful. Format responses in clean markdown.`;

export const TOOLS: any = [
  {
    functionDeclarations: [
      {
        name: 'create_task',
        description: 'Create a new task in the management system.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'The title of the task' },
            description: { type: 'STRING', description: 'A detailed description of the task' },
            status: { type: 'STRING', enum: ['todo', 'in_progress', 'done'], description: 'Initial status' },
            priority: { type: 'NUMBER', description: 'Priority level 1-4 (1=Low, 4=Urgent)' },
            category_id: { type: 'STRING', description: 'The UUID of the category' },
            assigned_to: { type: 'STRING', description: 'The UUID of the employee assigned to the task' },
            due_date: { type: 'STRING', description: 'Due date in YYYY-MM-DD format. Use null if not set' },
          },
          required: ['title', 'category_id'],
        },
      },
      {
        name: 'list_employees',
        description: 'Search for employees or list all employees.',
        parameters: {
          type: 'OBJECT',
          properties: {
            search: { type: 'STRING', description: 'Optional name or email search string' },
          },
        },
      },
      {
        name: 'list_categories',
        description: 'List all available task categories.',
      },
      {
        name: 'search_tasks',
        description: 'Search for existing tasks.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Search term for task title or description' },
          },
          required: ['query'],
        },
      },
    ],
  },
];

export const TASK_ACTION_PROMPTS: Record<string, (task: { title: string; description: string | null; status: string; priority: number }) => string> = {
  summarize: (task) =>
    `Summarize the following task concisely in 2-3 sentences:\nTitle: ${task.title}\nDescription: ${task.description || 'No description'}\nStatus: ${task.status}\nPriority: ${task.priority}`,

  prioritize: (task) =>
    `Analyze this task and suggest a priority level (1=Low, 2=Medium, 3=High, 4=Urgent) with brief reasoning:\nTitle: ${task.title}\nDescription: ${task.description || 'No description'}\nCurrent Priority: ${task.priority}`,

  suggest_subtasks: (task) =>
    `Break down this task into 3-6 actionable subtasks. Return each as a bullet point:\nTitle: ${task.title}\nDescription: ${task.description || 'No description'}`,

  estimate_due_date: (task) =>
    `Estimate how long this task would take for a mid-level developer. Suggest a due date relative to today. Explain your reasoning briefly:\nTitle: ${task.title}\nDescription: ${task.description || 'No description'}\nPriority: ${task.priority}`,

  improve_description: (task) =>
    `Rewrite and improve this task description to be clearer, more actionable, and well-structured. Include acceptance criteria if appropriate:\nTitle: ${task.title}\nCurrent Description: ${task.description || 'No description'}`,

  suggest_next_steps: (task) =>
    `This task is currently "${task.status}". Suggest the next 2-3 concrete steps to move it forward:\nTitle: ${task.title}\nDescription: ${task.description || 'No description'}\nStatus: ${task.status}`,

  categorize: (task) =>
    `Suggest appropriate tags or categories for this task (e.g., frontend, backend, bug, feature, refactor, docs, devops, testing):\nTitle: ${task.title}\nDescription: ${task.description || 'No description'}`,
};
