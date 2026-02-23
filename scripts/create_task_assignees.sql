-- Create task_assignees table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

-- Enable RLS
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Create policies (modify as needed based on your permissions model)
-- Allow authenticated users to view assignees
CREATE POLICY "Users can view assignees" ON public.task_assignees
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow assigning/unassigning (you might want to restrict this to task creators or admins)
CREATE POLICY "Users can assign/unassign" ON public.task_assignees
  FOR ALL USING (auth.role() = 'authenticated');

-- Optional: Create a view or function if needed, but standard selects should work.
