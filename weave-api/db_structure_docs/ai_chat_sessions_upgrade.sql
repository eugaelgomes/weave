-- Chat sessions schema evolution
-- Run this script to align older databases with the current AI chat session contract.

ALTER TABLE public.ai_chat_sessions
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_model varchar(120) NULL,
  ADD COLUMN IF NOT EXISTS last_provider varchar(60) NULL,
  ADD COLUMN IF NOT EXISTS message_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tokens integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_updated
  ON public.ai_chat_sessions (user_id, updated_at DESC)
  WHERE COALESCE(deleted, false) = false;

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_last_message
  ON public.ai_chat_sessions (user_id, last_message_at DESC)
  WHERE COALESCE(deleted, false) = false;

