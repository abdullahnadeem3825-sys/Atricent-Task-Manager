// Fallback default statuses (used if DB fetch fails)
export const DEFAULT_TASK_STATUSES = [
  { value: 'todo', label: 'To Do', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
] as const;

// Keep backward compat alias
export const TASK_STATUSES = DEFAULT_TASK_STATUSES;

// Available colors for new columns
export const COLUMN_COLORS = [
  { value: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Yellow', dot: 'bg-yellow-500' },
  { value: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Blue', dot: 'bg-blue-500' },
  { value: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Green', dot: 'bg-green-500' },
  { value: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', label: 'Purple', dot: 'bg-purple-500' },
  { value: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Red', dot: 'bg-red-500' },
  { value: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', label: 'Orange', dot: 'bg-orange-500' },
  { value: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200', label: 'Pink', dot: 'bg-pink-500' },
  { value: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200', label: 'Cyan', dot: 'bg-cyan-500' },
];

export const TASK_PRIORITIES = [
  { value: 1, label: 'Low', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { value: 2, label: 'Medium', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  { value: 3, label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  { value: 4, label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
] as const;

export const CATEGORY_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#14B8A6', // teal
  '#6366F1', // indigo
];

export const AI_TASK_ACTIONS = [
  { value: 'summarize', label: 'Summarize', icon: '📝' },
  { value: 'prioritize', label: 'Prioritize', icon: '🎯' },
  { value: 'suggest_subtasks', label: 'Suggest Subtasks', icon: '📋' },
  { value: 'estimate_due_date', label: 'Estimate Due Date', icon: '📅' },
  { value: 'improve_description', label: 'Improve Description', icon: '✨' },
  { value: 'suggest_next_steps', label: 'Suggest Next Steps', icon: '🚀' },
  { value: 'categorize', label: 'Categorize / Tag', icon: '🏷️' },
] as const;
