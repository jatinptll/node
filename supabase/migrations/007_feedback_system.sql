-- ============================================
-- Feedback System
-- ============================================

CREATE TABLE public.feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Submission content
  type            text NOT NULL CHECK (type IN ('bug', 'feature', 'feedback')),
  title           text NOT NULL,
  description     text NOT NULL,
  severity        text CHECK (severity IN ('low', 'medium', 'high')),
  areas           text[],
  impact_rating   text,
  attachment_url  text,
  system_info     jsonb,

  -- Identity (may be null if anonymous)
  submitter_name  text,
  submitter_email text,
  is_anonymous    boolean DEFAULT false,

  -- Admin fields
  status          text DEFAULT 'new'
                  CHECK (status IN ('new', 'reviewing', 'planned', 'in_progress', 'done', 'wont_fix', 'duplicate')),
  admin_notes     text,
  priority        text CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  reviewed_at     timestamptz,
  resolved_at     timestamptz
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can submit feedback"
ON public.feedback FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can read only their own past submissions
CREATE POLICY "Users can read own feedback"
ON public.feedback FOR SELECT
USING (user_id = auth.uid());

-- Create index for fast lookups
CREATE INDEX idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX idx_feedback_status ON public.feedback(status);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
