-- Migration: Create project_sprints and project_ai_report_configs tables
-- Date: 2026-05-02

-- ==========================================================================
-- Table 1: project_sprints
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.project_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  sprint_number smallint NOT NULL DEFAULT 1,
  title varchar(100) NULL,
  goal text NULL,
  status varchar(20) NOT NULL DEFAULT 'planned',
  start_date date NOT NULL,
  end_date date NOT NULL,
  workable_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',
  completed_at timestamptz NULL,
  summary text NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,

  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_sprint_project
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT chk_sprint_status
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  CONSTRAINT chk_sprint_dates
    CHECK (end_date >= start_date),
  CONSTRAINT uq_project_sprint_number
    UNIQUE (project_id, sprint_number)
);

CREATE INDEX IF NOT EXISTS idx_sprints_project_active
  ON public.project_sprints(project_id, status)
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_sprints_project_dates
  ON public.project_sprints(project_id, start_date DESC)
  WHERE deleted = false;

-- ==========================================================================
-- Table 2: project_ai_report_configs
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.project_ai_report_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  enabled bool NOT NULL DEFAULT false,

  -- Sprint defaults (used when auto-creating next sprint)
  default_sprint_duration_days smallint NOT NULL DEFAULT 14,
  default_workable_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',
  auto_create_next_sprint bool NOT NULL DEFAULT true,

  -- Report toggles
  enable_sprint_kickoff bool NOT NULL DEFAULT true,
  enable_daily_standup bool NOT NULL DEFAULT true,
  enable_sprint_review bool NOT NULL DEFAULT true,

  -- Schedule
  report_time_utc varchar(5) NOT NULL DEFAULT '14:00',

  -- Delivery
  channels text[] NOT NULL DEFAULT '{in_app}',
  recipient_scope varchar(20) NOT NULL DEFAULT 'all_members',
  custom_recipients jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Scheduler state (managed by worker)
  current_sprint_id uuid NULL,
  last_report_type varchar(30) NULL,
  last_report_at timestamptz NULL,
  next_report_at timestamptz NULL,

  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_report_config_project
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_config_user
    FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_report_config_sprint
    FOREIGN KEY (current_sprint_id) REFERENCES public.project_sprints(id) ON DELETE SET NULL,
  CONSTRAINT chk_sprint_duration
    CHECK (default_sprint_duration_days >= 1 AND default_sprint_duration_days <= 90),
  CONSTRAINT chk_recipient_scope
    CHECK (recipient_scope IN ('owner_only', 'all_members', 'custom')),
  CONSTRAINT chk_last_report_type
    CHECK (last_report_type IS NULL OR last_report_type IN ('sprint_kickoff', 'daily_standup', 'sprint_review'))
);

CREATE INDEX IF NOT EXISTS idx_report_configs_next_due
  ON public.project_ai_report_configs(next_report_at)
  WHERE deleted = false AND enabled = true;
