-- Add daily_plan_meta JSONB column to profiles for plan persistence
-- Stores: { lastConfirmedDate: "2026-03-05", dismissCountToday: 0 }
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_plan_meta JSONB DEFAULT '{}'::jsonb;
