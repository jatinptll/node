-- Add focus session tracking columns to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS focus_sessions_count INTEGER DEFAULT 0;
