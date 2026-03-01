-- Harden database functions by locking search_path
-- Prevents schema injection attacks where an attacker could
-- influence which schema's functions get called

-- Fix 1: handle_new_user (runs on every user signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );

  INSERT INTO public.task_lists (id, user_id, workspace_id, name, color, sort_order)
  VALUES
    ('inbox', NEW.id, 'personal', 'Inbox', '#7C3AED', 0),
    ('projects', NEW.id, 'personal', 'Projects', '#3B82F6', 1);

  INSERT INTO public.classroom_sync (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- Fix 2: update_updated_at (runs on every row update)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
