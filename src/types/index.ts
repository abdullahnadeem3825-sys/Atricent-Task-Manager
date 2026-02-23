export type AppRole = 'admin' | 'employee';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type AnnouncementPriority = 'info' | 'warning' | 'urgent';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  member_count?: number;
  task_count?: number;
  members?: CategoryMember[];
}

export interface CategoryMember {
  id: string;
  category_id: string;
  user_id: string;
  created_at: string;
  // Joined
  profile?: Profile;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number; // 1=low, 2=medium, 3=high, 4=urgent
  category_id: string;
  assigned_to: string;
  created_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  category?: Category;
  assignee?: Profile;
  creator?: Profile;
}

export interface AIChat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  created_by: string;
  created_at: string;
  // Joined
  author?: Profile;
  is_read?: boolean;
}

export interface AnnouncementRead {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

// AI Task Action Types
export type AITaskAction =
  | 'summarize'
  | 'prioritize'
  | 'suggest_subtasks'
  | 'estimate_due_date'
  | 'improve_description'
  | 'suggest_next_steps'
  | 'categorize';

export interface AITaskActionRequest {
  action: AITaskAction;
  task: Task;
}

// Dashboard Stats
export interface DashboardStats {
  totalCategories: number;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  totalEmployees?: number; // Admin only
}
