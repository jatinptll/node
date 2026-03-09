-- Settings page + Classroom account persistence
-- Adds profile columns for bio, classroom connection, and notification preferences

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS classroom_account_email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS classroom_connected_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;
