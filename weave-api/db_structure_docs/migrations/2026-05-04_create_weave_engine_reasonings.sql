-- Migration: Create weave_engine_reasonings tables
-- Date: 2026-05-04
-- Description: Persists proactive AI reasoning outputs from weave-engine.
--              4-table architecture for scalability:
--              1. weave_engine_reasonings        — lean metadata
--              2. weave_engine_reasoning_contents — heavy payload (1:1)
--              3. weave_engine_reasoning_interactions — per-member state
--              4. weave_engine_reasoning_action_items — trackable AI items

-- ==========================================================================
-- Enum
-- ==========================================================================
CREATE TYPE public.weave_engine_reasoning_type AS ENUM (
  'sprint_kickoff',
  'daily_standup',
  'sprint_review',
  'deadline_alert',
  'analysis'
);

-- ==========================================================================
-- Table 1: weave_engine_reasonings (lean metadata)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.weave_engine_reasonings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  sprint_id uuid NOT NULL,
  report_config_id uuid NULL,
  organization_id uuid NULL,
  triggered_by uuid NOT NULL,
  reasoning_type public.weave_engine_reasoning_type NOT NULL,
  title varchar(255) NOT NULL,
  provider_used varchar(50) NULL,
  model_used varchar(100) NULL,
  safety_label varchar(20) NOT NULL DEFAULT 'safe',
  safety_reason text NULL,
  safety_blocked bool NOT NULL DEFAULT false,
  status varchar(20) NOT NULL DEFAULT 'completed',
  error_message text NULL,
  processing_time_ms int NULL,
  recipient_scope varchar(20) NOT NULL DEFAULT 'all_members',
  custom_recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_items_count smallint NOT NULL DEFAULT 0,

  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_reasoning_status
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT chk_reasoning_safety_label
    CHECK (safety_label IN ('safe', 'review', 'unsafe')),
  CONSTRAINT chk_reasoning_recipient_scope
    CHECK (recipient_scope IN ('owner_only', 'all_members', 'custom')),
  CONSTRAINT chk_reasoning_custom_recipients_is_array
    CHECK (jsonb_typeof(custom_recipients) = 'array'),

  CONSTRAINT fk_reasoning_project
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_reasoning_sprint
    FOREIGN KEY (sprint_id) REFERENCES public.project_sprints(id) ON DELETE CASCADE,
  CONSTRAINT fk_reasoning_report_config
    FOREIGN KEY (report_config_id) REFERENCES public.project_ai_report_configs(id) ON DELETE SET NULL,
  CONSTRAINT fk_reasoning_organization
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_reasoning_triggered_by
    FOREIGN KEY (triggered_by) REFERENCES public.users(user_id) ON DELETE RESTRICT
);

-- ==========================================================================
-- Table 2: weave_engine_reasoning_contents (1:1 heavy payload)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.weave_engine_reasoning_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reasoning_id uuid NOT NULL UNIQUE,
  output_markdown text NOT NULL,
  output_raw jsonb NULL,
  output_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_prompt text NULL,
  input_system_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_reasoning_content_output_metadata_is_object
    CHECK (jsonb_typeof(output_metadata) = 'object'),
  CONSTRAINT chk_reasoning_content_input_context_is_object
    CHECK (jsonb_typeof(input_context) = 'object'),

  CONSTRAINT fk_reasoning_content_reasoning
    FOREIGN KEY (reasoning_id) REFERENCES public.weave_engine_reasonings(id) ON DELETE CASCADE
);

-- ==========================================================================
-- Table 3: weave_engine_reasoning_interactions (per-member)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.weave_engine_reasoning_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reasoning_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_read bool NOT NULL DEFAULT false,
  read_at timestamptz NULL,
  is_dismissed bool NOT NULL DEFAULT false,
  dismissed_at timestamptz NULL,
  is_pinned bool NOT NULL DEFAULT false,
  pinned_at timestamptz NULL,
  feedback varchar(20) NULL,
  feedback_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_reasoning_interaction_user
    UNIQUE (reasoning_id, user_id),
  CONSTRAINT chk_reasoning_interaction_feedback
    CHECK (feedback IS NULL OR feedback IN ('helpful', 'not_helpful', 'neutral')),

  CONSTRAINT fk_reasoning_interaction_reasoning
    FOREIGN KEY (reasoning_id) REFERENCES public.weave_engine_reasonings(id) ON DELETE CASCADE,
  CONSTRAINT fk_reasoning_interaction_user
    FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT
);

-- ==========================================================================
-- Table 4: weave_engine_reasoning_action_items (trackable items)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.weave_engine_reasoning_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reasoning_id uuid NOT NULL,
  note_id uuid NULL,
  position smallint NOT NULL DEFAULT 0,
  content text NOT NULL,
  priority varchar(20) NULL,
  assigned_to uuid NULL,
  is_completed bool NOT NULL DEFAULT false,
  completed_at timestamptz NULL,
  completed_by uuid NULL,

  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_reasoning_action_priority
    CHECK (priority IS NULL OR priority IN ('critical', 'high', 'medium', 'low')),

  CONSTRAINT fk_reasoning_action_reasoning
    FOREIGN KEY (reasoning_id) REFERENCES public.weave_engine_reasonings(id) ON DELETE CASCADE,
  CONSTRAINT fk_reasoning_action_note
    FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE SET NULL,
  CONSTRAINT fk_reasoning_action_assigned_to
    FOREIGN KEY (assigned_to) REFERENCES public.users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_reasoning_action_completed_by
    FOREIGN KEY (completed_by) REFERENCES public.users(user_id) ON DELETE SET NULL
);

-- ==========================================================================
-- Indexes: weave_engine_reasonings
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_reasonings_project_sprint
  ON public.weave_engine_reasonings(project_id, sprint_id, created_at DESC)
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_reasonings_project_type
  ON public.weave_engine_reasonings(project_id, reasoning_type)
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_reasonings_status_pending
  ON public.weave_engine_reasonings(status, created_at)
  WHERE deleted = false AND status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_reasonings_organization
  ON public.weave_engine_reasonings(organization_id, created_at DESC)
  WHERE deleted = false AND organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reasonings_expires_at
  ON public.weave_engine_reasonings(expires_at)
  WHERE deleted = false AND expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reasonings_safety
  ON public.weave_engine_reasonings(safety_label)
  WHERE deleted = false AND safety_label != 'safe';

-- ==========================================================================
-- Indexes: weave_engine_reasoning_interactions
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_reasoning_interactions_unread
  ON public.weave_engine_reasoning_interactions(user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_reasoning_interactions_feedback
  ON public.weave_engine_reasoning_interactions(reasoning_id, feedback)
  WHERE feedback IS NOT NULL;

-- ==========================================================================
-- Indexes: weave_engine_reasoning_action_items
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_reasoning_actions_reasoning
  ON public.weave_engine_reasoning_action_items(reasoning_id, position)
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_reasoning_actions_assigned
  ON public.weave_engine_reasoning_action_items(assigned_to, is_completed)
  WHERE deleted = false AND assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reasoning_actions_note
  ON public.weave_engine_reasoning_action_items(note_id)
  WHERE deleted = false AND note_id IS NOT NULL;

-- ==========================================================================
-- Triggers
-- ==========================================================================
CREATE TRIGGER trg_weave_engine_reasonings_set_updated_at
BEFORE UPDATE ON public.weave_engine_reasonings
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_weave_engine_reasonings_set_deleted_at
BEFORE UPDATE ON public.weave_engine_reasonings
FOR EACH ROW EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_reasoning_interactions_set_updated_at
BEFORE UPDATE ON public.weave_engine_reasoning_interactions
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_reasoning_action_items_set_updated_at
BEFORE UPDATE ON public.weave_engine_reasoning_action_items
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_reasoning_action_items_set_deleted_at
BEFORE UPDATE ON public.weave_engine_reasoning_action_items
FOR EACH ROW EXECUTE FUNCTION public.set_row_deleted_at();
