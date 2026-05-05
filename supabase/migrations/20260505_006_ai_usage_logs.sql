-- Migration: Add ai_usage_logs table for per-user rate limiting and usage analytics
-- Run this migration before deploying rate-limited AI routes.

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature     text NOT NULL,           -- 'writing_evaluation' | 'speaking_evaluation' | 'study_plan' | 'ai_explanation'
  metadata    jsonb,                   -- optional: submission_id, model, source, etc.
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast per-user per-feature lookups within a rolling time window
CREATE INDEX IF NOT EXISTS ai_usage_logs_user_feature_created
  ON public.ai_usage_logs (user_id, feature, created_at DESC);

-- Row-level security: users can only read their own rows; server (service-role) can insert
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
  ON public.ai_usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS for inserts — no INSERT policy needed for anon/user roles
