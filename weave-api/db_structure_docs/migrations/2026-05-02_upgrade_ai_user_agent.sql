-- Migration: Upgrade ai_user_agent table for first-class agent metadata
-- Date: 2026-05-02

-- 1. Add first-class columns
ALTER TABLE public.ai_user_agent
  ADD COLUMN IF NOT EXISTS name varchar(100) NOT NULL DEFAULT 'Unnamed Agent',
  ADD COLUMN IF NOT EXISTS description text NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid NULL,
  ADD COLUMN IF NOT EXISTS is_active bool NOT NULL DEFAULT true;

-- 2. Add foreign key to projects
ALTER TABLE public.ai_user_agent
  ADD CONSTRAINT ai_user_agent_project_fk
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- 3. Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_user_agent_project_id
  ON public.ai_user_agent(project_id) WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_ai_user_agent_active
  ON public.ai_user_agent(user_id, is_active) WHERE deleted = false;

-- 4. Backfill name/description from personality JSONB for existing agents
UPDATE public.ai_user_agent
SET
  name = COALESCE(personality->'metadata'->>'name', 'Unnamed Agent'),
  description = COALESCE(personality->'metadata'->>'description', NULL)
WHERE deleted = false
  AND personality->'metadata'->>'name' IS NOT NULL;
