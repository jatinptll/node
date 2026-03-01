-- ============================================
-- Node Task Manager - Complete Schema Migration
-- Adds missing tables, columns, indexes, FK constraints
-- Run this AFTER 001_initial_schema.sql
-- ============================================

-- ============================================
-- 1. Workspaces table (MISSING from 001)
-- ============================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspaces" ON public.workspaces
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workspaces" ON public.workspaces
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workspaces" ON public.workspaces
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 2. Goals table (MISSING from 001)
-- ============================================
CREATE TABLE IF NOT EXISTS public.goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT 'monthly',
  target_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. Add MISSING columns to tasks table
-- ============================================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deferral_count INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS energy_tag TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS goal_id TEXT;

-- ============================================
-- 4. Missing RLS DELETE policy on classroom_sync
-- ============================================
CREATE POLICY "Users can delete own sync" ON public.classroom_sync
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. Performance Indexes
-- ============================================
-- Tasks: most queries filter by user_id
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
-- Tasks: fetchUserTasks filters by is_completed + completed_at
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON public.tasks(user_id, is_completed, completed_at);
-- Tasks: filter by list_id within a user
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON public.tasks(user_id, list_id);
-- Tasks: filter by goal_id
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON public.tasks(goal_id) WHERE goal_id IS NOT NULL;

-- Task Lists: most queries filter by user_id
CREATE INDEX IF NOT EXISTS idx_task_lists_user_id ON public.task_lists(user_id);
-- Task Lists: filter by workspace_id
CREATE INDEX IF NOT EXISTS idx_task_lists_workspace_id ON public.task_lists(user_id, workspace_id);

-- Workspaces: most queries filter by user_id
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);

-- Goals: filter by user_id
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);

-- ============================================
-- 6. Add updated_at columns for conflict detection
-- ============================================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.task_lists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_task_lists_updated_at
  BEFORE UPDATE ON public.task_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
