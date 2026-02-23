-- Add estimated and actual hours columns to tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(8,2) DEFAULT NULL;

-- Create index for time tracking queries
CREATE INDEX IF NOT EXISTS idx_tasks_estimated_hours ON public.tasks(estimated_hours);
CREATE INDEX IF NOT EXISTS idx_tasks_actual_hours ON public.tasks(actual_hours);
