-- ============================================================================
-- Weave Notes - Azure PostgreSQL bootstrap (v1)
-- ============================================================================
-- Objetivo:
-- - Recriar o banco do zero em Azure PostgreSQL (ambiente DEV)
-- - Remover dependência de uuid-ossp/uuid_generate_v4()
-- - Usar gen_random_uuid() (pgcrypto)
-- - Consolidar memberships com area_id em organization_members
--
-- Observação:
-- - Este script usa DROP ... CASCADE para facilitar reset em ambiente DEV.
-- - Execute com usuário com permissão para criar extensões/tipos/tabelas.
-- ============================================================================

BEGIN;

SET search_path TO public;
SET TIME ZONE 'UTC';
SET lock_timeout TO '10s';
SET statement_timeout TO '0';

-- ============================================================================
-- Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- Reset (DEV)
-- ============================================================================
DROP TABLE IF EXISTS public.calendar_event_invites CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.google_calendar_webhooks CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.ai_chat_messages CASCADE;
DROP TABLE IF EXISTS public.ai_chat_sessions CASCADE;
DROP TABLE IF EXISTS public.ai_user_agent CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.note_collaborators CASCADE;
DROP TABLE IF EXISTS public.notes_short_backups CASCADE;
DROP TABLE IF EXISTS public.notes_comments CASCADE;
DROP TABLE IF EXISTS public.notes CASCADE;
DROP TABLE IF EXISTS public.project_stages CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.task_priorities CASCADE;
DROP TABLE IF EXISTS public.organization_domains CASCADE;
DROP TABLE IF EXISTS public.organization_member_invites CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organization_areas CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.api_tokens CASCADE;
DROP TABLE IF EXISTS public.plan_usages CASCADE;
DROP TABLE IF EXISTS public.plan_usage_history CASCADE;
DROP TABLE IF EXISTS public.tokens CASCADE;
DROP TABLE IF EXISTS public.user_oauth_tokens CASCADE;
DROP TABLE IF EXISTS public.user_logs CASCADE;
DROP TABLE IF EXISTS public.system_admins CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.invite_status CASCADE;
DROP TYPE IF EXISTS public.invite_role CASCADE;
DROP TYPE IF EXISTS public.sync_status CASCADE;
DROP TYPE IF EXISTS public.domain_verification_status CASCADE;
DROP TYPE IF EXISTS public.notification_entity_type_enum CASCADE;
DROP TYPE IF EXISTS public.notification_type_enum CASCADE;
DROP TYPE IF EXISTS public.project_methodology_enum CASCADE;
DROP TYPE IF EXISTS public.project_status CASCADE;
DROP TYPE IF EXISTS public.project_view_enum CASCADE;
DROP TYPE IF EXISTS public.notes_status CASCADE;
DROP TYPE IF EXISTS public.theme_mode_pattern CASCADE;
DROP TYPE IF EXISTS public.token_type_enum CASCADE;
DROP TYPE IF EXISTS public.user_log_category CASCADE;
DROP TYPE IF EXISTS public.system_users_roles CASCADE;
DROP TYPE IF EXISTS public.billing_cycle_enum CASCADE;
DROP TYPE IF EXISTS public.organization_member_status_enum CASCADE;
DROP TYPE IF EXISTS public.organization_workspace_role_enum CASCADE;
DROP TYPE IF EXISTS public.project_visibility_enum CASCADE;
DROP TYPE IF EXISTS public.project_member_role_enum CASCADE;
DROP TYPE IF EXISTS public.oauth_provider_enum CASCADE;

-- ============================================================================
-- Utility trigger functions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_row_deleted_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.deleted = true THEN
    NEW.deleted_at = COALESCE(NEW.deleted_at, NOW());
  ELSIF NEW.deleted = false THEN
    NEW.deleted_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_alphanumeric_id(p_length int DEFAULT 25)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  generated_id text;
BEGIN
  IF p_length < 1 THEN
    RAISE EXCEPTION 'p_length must be greater than zero';
  END IF;

  generated_id := substring(
    encode(gen_random_bytes(GREATEST(16, p_length)), 'hex')
    FROM 1 FOR p_length
  );

  RETURN generated_id;
END;
$$;

-- ============================================================================
-- Enums
-- ============================================================================
CREATE TYPE public.domain_verification_status AS ENUM (
  'PENDING',
  'VERIFIED',
  'FAILED',
  'EXPIRED'
);

CREATE TYPE public.invite_role AS ENUM (
  'ORGANIZER',
  'REQUIRED',
  'OPTIONAL',
  'RESOURCE'
);

CREATE TYPE public.invite_status AS ENUM (
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'TENTATIVE'
);

CREATE TYPE public.notes_status AS ENUM (
  'VISIBLE',
  'SECURE',
  'ARCHIVED'
);

CREATE TYPE public.notification_entity_type_enum AS ENUM (
  'ORGANIZATION',
  'PROJECT',
  'NOTE',
  'JOB',
  'WEAVE-AI'
);

CREATE TYPE public.notification_type_enum AS ENUM (
  'SYSTEM_ALERT',
  'SYSTEM_UPDATE',
  'ORGANIZATION_INVITE',
  'ORGANIZATION_ACTION',
  'PROJECT_INVITE',
  'PROJECT_ACTION',
  'NOTE_SHARED',
  'NOTE_ACTION',
  'AI_ACTION',
  'JOB_ACTION'
);

CREATE TYPE public.project_methodology_enum AS ENUM (
  'KANBAN',
  'SCRUM',
  'WATERFALL',
  'CUSTOM'
);

CREATE TYPE public.project_status AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED'
);

CREATE TYPE public.project_view_enum AS ENUM (
  'BOARD',
  'LIST',
  'CALENDAR',
  'TIMELINE',
  'GANTT'
);

CREATE TYPE public.sync_status AS ENUM (
  'PENDING',
  'SYNCED',
  'FAILED',
  'OUT_OF_SYNC'
);

CREATE TYPE public.system_users_roles AS ENUM (
  'SUPER_ADMIN',
  'MANAGER',
  'SUPPORT',
  'READ_ONLY'
);

CREATE TYPE public.theme_mode_pattern AS ENUM (
  'DARK',
  'LIGHT'
);

CREATE TYPE public.token_type_enum AS ENUM (
  'PASSWORD_RESET',
  'EMAIL_VERIFICATION',
  'ACCESS',
  'DELETE_USER_ACCOUNT',
  'BACKUP_DOWNLOAD'
);

CREATE TYPE public.user_log_category AS ENUM (
  'AUTH_LOGIN',
  'AUTH_LOGOUT',
  'PROFILE_UPDATE',
  'SECURITY_CHANGE',
  'DATA_EXPORT',
  'SYSTEM_ERROR'
);

CREATE TYPE public.billing_cycle_enum AS ENUM (
  'MONTHLY',
  'YEARLY',
  'LIFETIME'
);

CREATE TYPE public.organization_member_status_enum AS ENUM (
  'ACTIVE',
  'PENDING',
  'INVITED',
  'SUSPENDED',
  'REMOVED'
);

CREATE TYPE public.organization_workspace_role_enum AS ENUM (
  'SUPER_ADMIN',
  'ADMIN',
  'BILLING_MANAGER',
  'MEMBER',
  'GUEST'
);
COMMENT ON TYPE public.organization_workspace_role_enum IS
  'Workspace roles. "owner" is represented by "SUPER_ADMIN".';

CREATE TYPE public.project_visibility_enum AS ENUM (
  'PRIVATE',
  'ORG_WIDE',
  'PUBLIC'
);

CREATE TYPE public.project_member_role_enum AS ENUM (
  'PROJECT_MANAGER',
  'CONTRIBUTOR',
  'COMMENTER',
  'VIEWER'
);

CREATE TYPE public.oauth_provider_enum AS ENUM (
  'GOOGLE',
  'GITHUB',
  'MICROSOFT',
  'APPLE'
);

-- ============================================================================
-- Core tables
-- ============================================================================
CREATE TABLE public.plans (
  plan_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  description text NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan_value numeric(12, 2) NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'BRL',
  billing_cycle public.billing_cycle_enum NOT NULL DEFAULT 'MONTHLY',
  gateway_id varchar(255) NULL,
  trial_days int NOT NULL DEFAULT 0,
  is_active bool NOT NULL DEFAULT true,
  personalized_for_client bool NOT NULL DEFAULT false,
  personalized_client varchar(50) NULL,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plans_trial_days_non_negative CHECK (trial_days >= 0)
);
COMMENT ON TABLE public.plans IS 'Catálogo de planos SaaS.';

CREATE TABLE public.users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  username varchar(80) NOT NULL UNIQUE,
  password varchar(255) NOT NULL,
  avatar_url text NULL,
  auth_with_google bool NOT NULL DEFAULT false,
  google_id varchar(255) NULL UNIQUE,
  auth_with_github bool NOT NULL DEFAULT false,
  github_id varchar(255) NULL UNIQUE,
  auth_with_microsoft bool NOT NULL DEFAULT false,
  microsoft_id varchar(255) NULL UNIQUE,
  theme_mode public.theme_mode_pattern NOT NULL DEFAULT 'DARK',
  phone_number varchar(20) NULL UNIQUE,
  birth_date date NULL,
  private_profile bool NOT NULL DEFAULT false,
  timezone varchar(100) NULL,
  email_verified bool NOT NULL DEFAULT false,
  email_verified_at timestamptz NULL,
  last_login timestamptz NULL,
  organization_id uuid NULL,
  plan_id uuid NULL,
  user_preference jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_format_check
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
COMMENT ON TABLE public.users IS 'Usuários finais da plataforma.';

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id varchar(25) NOT NULL DEFAULT public.generate_alphanumeric_id(25) UNIQUE,
  user_id uuid NOT NULL,
  org_name varchar(80) NOT NULL DEFAULT 'New Organization',
  unique_name varchar(40) NOT NULL UNIQUE,
  logo_url text NULL,
  banner_url text NULL,
  description text NULL DEFAULT 'Type description here...',
  basic_properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  org_domains text[] NULL DEFAULT '{}'::text[],
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  address jsonb NULL DEFAULT '{}'::jsonb,
  plan_id uuid NULL,
  branding_properties jsonb NULL DEFAULT '{}'::jsonb,
  integrations jsonb NULL DEFAULT '{}'::jsonb,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  deleted_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_public_id_format_check
    CHECK (public_id ~ '^[a-z0-9]{25}$'),
  CONSTRAINT organizations_unique_name_pattern_check
    CHECK (unique_name ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
COMMENT ON TABLE public.organizations IS 'Workspaces/organizações da plataforma.';

CREATE TABLE public.organization_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  parent_area_id uuid NULL,
  area_name text NOT NULL,
  slug text NOT NULL,
  description text NULL DEFAULT 'Area description here',
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  active bool NOT NULL DEFAULT true,
  deleted bool NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  updated_by uuid NULL,
  deleted_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CONSTRAINT organization_areas_slug_pattern_check
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
COMMENT ON TABLE public.organization_areas IS 'Áreas de uma organização.';

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  area_id uuid NULL,
  role public.organization_workspace_role_enum NOT NULL,
  status public.organization_member_status_enum NOT NULL DEFAULT 'ACTIVE',
  invited_by uuid NULL,
  suspended bool NOT NULL DEFAULT false,
  deleted bool NOT NULL DEFAULT false,
  removed_at timestamptz NULL,
  removed_by uuid NULL,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL
);
CREATE TABLE public.organization_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  domain_name varchar(255) NOT NULL,
  verification_token varchar(255) NOT NULL UNIQUE,
  status public.domain_verification_status NOT NULL DEFAULT 'PENDING',
  sso_enabled bool NOT NULL DEFAULT false,
  sso_provider varchar(50) NULL,
  sso_metadata jsonb NULL,
  verified_at timestamptz NULL,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_org_domain UNIQUE (organization_id, domain_name),
  CONSTRAINT organization_domains_domain_name_format_check
    CHECK (domain_name ~* '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$')
);

CREATE TABLE public.organization_member_invites (
  invite_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name varchar(255) NULL,
  email varchar(255) NOT NULL,
  username varchar(255) NULL,
  role public.organization_workspace_role_enum NOT NULL DEFAULT 'MEMBER',
  invite_verified bool NOT NULL DEFAULT false,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  invited_by uuid NOT NULL,
  expires_at timestamptz NULL,
  area_id uuid NULL,
  project_member_role public.project_member_role_enum NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL,
  CONSTRAINT organization_member_invites_project_role_check
    CHECK (
      area_id IS NULL
      OR project_member_role IS NOT NULL
    )
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id varchar(25) NOT NULL DEFAULT public.generate_alphanumeric_id(25) UNIQUE,
  user_id uuid NOT NULL,
  organization_id uuid NULL,
  parent_project_id uuid NULL,
  title text NOT NULL DEFAULT 'The new project',
  description text NULL DEFAULT 'Type description here...',
  methodology public.project_methodology_enum NOT NULL DEFAULT 'KANBAN',
  default_view public.project_view_enum NOT NULL DEFAULT 'BOARD',
  status public.project_status NOT NULL DEFAULT 'OPEN',
  visibility public.project_visibility_enum NOT NULL DEFAULT 'PRIVATE',
  active bool NOT NULL DEFAULT true,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  projects_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  start_date date NULL,
  target_end_date date NULL,
  actual_end_date date NULL,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_public_id_format_check
    CHECK (public_id ~ '^[a-z0-9]{25}$'),
  CONSTRAINT projects_target_end_after_start_check
    CHECK (target_end_date IS NULL OR start_date IS NULL OR target_end_date >= start_date),
  CONSTRAINT projects_actual_end_after_start_check
    CHECK (actual_end_date IS NULL OR start_date IS NULL OR actual_end_date >= start_date),
  CONSTRAINT projects_files_is_array_check
    CHECK (jsonb_typeof(projects_files) = 'array')
);

CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.project_member_role_enum NOT NULL,
  added_by uuid NOT NULL,
  suspended bool NOT NULL DEFAULT false,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.project_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  position int NOT NULL,
  color text NULL DEFAULT '#E2E8F0',
  properties jsonb NULL DEFAULT '{}'::jsonb,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_stages_position_non_negative_check CHECK (position >= 0)
);

CREATE TABLE public.task_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NULL,
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  name varchar(30) NOT NULL,
  color_hex varchar(7) NULL DEFAULT '#808080',
  sort_order int NOT NULL DEFAULT 0,
  is_active bool NOT NULL DEFAULT true,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  deleted_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  project_id uuid NULL,
  name varchar(30) NOT NULL,
  color_hex varchar(7) NULL DEFAULT '#E2E8F0',
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  deleted_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id varchar(25) NOT NULL DEFAULT public.generate_alphanumeric_id(25) UNIQUE,
  user_id uuid NOT NULL,
  project_id uuid NULL,
  organization_id uuid NULL,
  parent_id uuid NULL,
  project_stage_id uuid NULL,
  priority_id uuid NULL,
  title text NOT NULL DEFAULT 'Set note title',
  description text NULL DEFAULT 'Write note description here',
  document jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  properties jsonb NULL DEFAULT '{}'::jsonb,
  tags uuid[] NOT NULL DEFAULT '{}'::uuid[],
  status public.notes_status NULL DEFAULT 'VISIBLE',
  due_date timestamptz NULL,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  deleted_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notes_public_id_format_check
    CHECK (public_id ~ '^[a-z0-9]{25}$')
);

CREATE TABLE public.notes_short_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL,
  user_id uuid NOT NULL,
  organization_id uuid NULL,
  project_id uuid NULL,
  title text NOT NULL,
  description text NULL,
  short_backup jsonb NOT NULL,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notes_short_backups_short_backup_is_object_check
    CHECK (jsonb_typeof(short_backup) = 'object')
);

CREATE TABLE public.note_collaborators (
  note_id uuid NOT NULL,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  removed bool NOT NULL DEFAULT false,
  removed_at timestamptz NULL,
  removed_by uuid NULL,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  PRIMARY KEY (note_id, user_id)
);

CREATE TABLE public.notes_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL,
  user_id uuid NOT NULL,
  organization_id uuid NULL,
  parent_id uuid NULL,
  content jsonb NOT NULL,
  files jsonb NULL DEFAULT '[]'::jsonb,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL
);

CREATE TABLE public.jobs (
  job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(50) NOT NULL,
  user_id uuid NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  progress int NOT NULL DEFAULT 0,
  error text NULL,
  result jsonb NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NULL,
  completed_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jobs_progress_range_check CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT jobs_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- express-session store (connect-pg-simple), tableName: "sessions"
CREATE TABLE public.sessions (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL,
  CONSTRAINT sessions_pkey PRIMARY KEY (sid)
);

CREATE INDEX idx_sessions_expire ON public.sessions (expire);

CREATE TABLE public.ai_user_agent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  personality jsonb NOT NULL DEFAULT '{}'::jsonb,
  knowledge_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  shared_with jsonb NOT NULL DEFAULT '[]'::jsonb,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_user_agent_knowledge_files_is_array_check
    CHECK (jsonb_typeof(knowledge_files) = 'array'),
  CONSTRAINT ai_user_agent_shared_with_is_array_check
    CHECK (jsonb_typeof(shared_with) = 'array')
);

CREATE TABLE public.ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title varchar(255) NOT NULL DEFAULT 'Nova Conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role varchar(20) NOT NULL,
  content text NOT NULL,
  model varchar(50) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_chat_messages_role_check CHECK (role IN ('user', 'assistant'))
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid NULL,
  type public.notification_type_enum NOT NULL,
  entity_type public.notification_entity_type_enum NOT NULL,
  entity_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read bool NOT NULL DEFAULT false,
  read_at timestamptz NULL,
  in_trash bool NOT NULL DEFAULT false,
  trashed_at timestamptz NULL,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_notifications_read_state
    CHECK (
      (is_read = true AND read_at IS NOT NULL)
      OR (is_read = false)
    ),
  CONSTRAINT chk_notifications_trash_state
    CHECK (
      (in_trash = true AND trashed_at IS NOT NULL)
      OR (in_trash = false)
    )
);

CREATE TABLE public.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  key_prefix varchar(50) NOT NULL UNIQUE,
  token_hash varchar(255) NOT NULL,
  user_id uuid NOT NULL,
  organization_id uuid NULL,
  scopes text[] NULL DEFAULT '{read}',
  description varchar(255) NULL,
  expires_at timestamptz NULL,
  revoked_at timestamptz NULL,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tokens (
  token_id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  token varchar(255) NOT NULL,
  type public.token_type_enum NOT NULL,
  code varchar(20) NULL,
  data_to_update jsonb NULL DEFAULT '{}'::jsonb,
  active bool NOT NULL DEFAULT true,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE public.user_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider public.oauth_provider_enum NOT NULL DEFAULT 'GOOGLE',
  access_token text NOT NULL,
  refresh_token text NULL,
  expires_at timestamptz NULL,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL
);

CREATE TABLE public.user_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_type public.user_log_category NOT NULL,
  log jsonb NULL,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.plan_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  client_type text NOT NULL,
  user_id uuid NULL,
  organization_id uuid NULL,
  usage_details jsonb NULL DEFAULT '{}'::jsonb,
  lifetime_stats jsonb NULL DEFAULT '{}'::jsonb,
  is_trial bool NULL DEFAULT false,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  trial_ends_at timestamptz NULL,
  downgrade_scheduled_to uuid NULL,
  downgrade_effective_at timestamptz NULL,
  period_start timestamptz NULL,
  period_end timestamptz NULL,
  last_reset_at timestamptz NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_usages_period_range_check
    CHECK (period_start IS NULL OR period_end IS NULL OR period_end >= period_start)
);

CREATE TABLE public.plan_usage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_usage_id uuid NOT NULL,
  user_id uuid NOT NULL,
  organization_id uuid NULL,
  plan_id uuid NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  final_usage_details jsonb NOT NULL,
  total_notes_created int NULL DEFAULT 0,
  total_projects_created int NULL DEFAULT 0,
  total_ai_messages int NULL DEFAULT 0,
  total_storage_mb numeric(10, 2) NULL DEFAULT 0,
  total_exports int NULL DEFAULT 0,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.system_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role public.system_users_roles NOT NULL DEFAULT 'READ_ONLY',
  user_function text NULL,
  password text NOT NULL DEFAULT '.',
  is_active bool NOT NULL DEFAULT true,
  is_suspended bool NOT NULL DEFAULT false,
  deleted bool NOT NULL DEFAULT false,
  created_by uuid NULL,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_format_check
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NULL,
  creator_id uuid NOT NULL,
  note_id uuid NULL,
  project_id uuid NULL,
  title varchar(255) NOT NULL,
  description text NULL,
  location text NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_all_day bool NULL DEFAULT false,
  is_from_note bool NULL DEFAULT false,
  is_from_project bool NULL DEFAULT false,
  google_event_id varchar(512) NULL UNIQUE,
  google_calendar_id varchar(255) NULL,
  outlook_event_id varchar(512) NULL UNIQUE,
  outlook_calendar_id varchar(255) NULL,
  sync_status public.sync_status NULL DEFAULT 'PENDING',
  last_synced_at timestamptz NULL,
  etag text NULL,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL,
  CONSTRAINT calendar_events_date_range_check CHECK (end_time >= start_time)
);

CREATE TABLE public.calendar_event_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NULL,
  email varchar(255) NOT NULL,
  role public.invite_role NOT NULL DEFAULT 'REQUIRED',
  status public.invite_status NOT NULL DEFAULT 'PENDING',
  external_guest_id varchar(512) NULL,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NULL DEFAULT now(),
  updated_at timestamptz NULL,
  CONSTRAINT unique_event_invite_email UNIQUE (event_id, email)
);

CREATE TABLE public.google_calendar_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  calendar_id varchar(255) NOT NULL,
  channel_id uuid NOT NULL,
  resource_id varchar(255) NULL,
  sync_token varchar(255) NULL,
  expires_at timestamptz NULL,
  is_active bool NOT NULL DEFAULT true,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Foreign keys
-- ============================================================================
ALTER TABLE public.users
  ADD CONSTRAINT users_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES public.plans(plan_id) ON DELETE SET NULL;

ALTER TABLE public.organizations
  ADD CONSTRAINT fk_organizations_user_id
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES public.plans(plan_id) ON DELETE SET NULL;

ALTER TABLE public.organization_areas
  ADD CONSTRAINT organization_areas_org_id_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.organization_areas
  ADD CONSTRAINT organization_areas_parent_fk
  FOREIGN KEY (parent_area_id) REFERENCES public.organization_areas(id) ON DELETE SET NULL;

ALTER TABLE public.organization_areas
  ADD CONSTRAINT organization_areas_created_by_fk
  FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.organization_areas
  ADD CONSTRAINT organization_areas_updated_by_fk
  FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.organization_areas
  ADD CONSTRAINT organization_areas_deleted_by_fk
  FOREIGN KEY (deleted_by) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.organization_members
  ADD CONSTRAINT fk_org_members_area
  FOREIGN KEY (area_id) REFERENCES public.organization_areas(id) ON DELETE CASCADE;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_invited_by_fk
  FOREIGN KEY (invited_by) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_removed_by_fk
  FOREIGN KEY (removed_by) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.organization_domains
  ADD CONSTRAINT organization_domains_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.organization_member_invites
  ADD CONSTRAINT organization_invites_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.organization_member_invites
  ADD CONSTRAINT organization_invites_invited_by_fk
  FOREIGN KEY (invited_by) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.organization_member_invites
  ADD CONSTRAINT organization_invites_area_fk
  FOREIGN KEY (area_id) REFERENCES public.organization_areas(id) ON DELETE SET NULL;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_parent_fk
  FOREIGN KEY (parent_project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_project_fk
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_added_by_fk
  FOREIGN KEY (added_by) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.project_stages
  ADD CONSTRAINT project_stages_project_fk
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.task_priorities
  ADD CONSTRAINT task_priorities_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.task_priorities
  ADD CONSTRAINT task_priorities_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.task_priorities
  ADD CONSTRAINT task_priorities_project_fk
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.tags
  ADD CONSTRAINT tags_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.tags
  ADD CONSTRAINT tags_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.tags
  ADD CONSTRAINT tags_project_fk
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.notes
  ADD CONSTRAINT notes_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.notes
  ADD CONSTRAINT notes_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.notes
  ADD CONSTRAINT notes_project_fk
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.notes
  ADD CONSTRAINT notes_stage_fk
  FOREIGN KEY (project_stage_id) REFERENCES public.project_stages(id) ON DELETE SET NULL;

ALTER TABLE public.notes
  ADD CONSTRAINT notes_priority_fk
  FOREIGN KEY (priority_id) REFERENCES public.task_priorities(id) ON DELETE SET NULL;

ALTER TABLE public.notes_short_backups
  ADD CONSTRAINT notes_short_backups_note_fk
  FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;

ALTER TABLE public.notes_short_backups
  ADD CONSTRAINT notes_short_backups_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.notes_short_backups
  ADD CONSTRAINT notes_short_backups_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.notes_short_backups
  ADD CONSTRAINT notes_short_backups_project_fk
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.note_collaborators
  ADD CONSTRAINT note_collaborators_note_fk
  FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;

ALTER TABLE public.note_collaborators
  ADD CONSTRAINT note_collaborators_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.notes_comments
  ADD CONSTRAINT notes_comments_note_fk
  FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;

ALTER TABLE public.notes_comments
  ADD CONSTRAINT notes_comments_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.notes_comments
  ADD CONSTRAINT notes_comments_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.notes_comments
  ADD CONSTRAINT notes_comments_parent_fk
  FOREIGN KEY (parent_id) REFERENCES public.notes_comments(id) ON DELETE CASCADE;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.ai_user_agent
  ADD CONSTRAINT ai_user_agent_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.ai_chat_sessions
  ADD CONSTRAINT ai_chat_sessions_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.ai_chat_messages
  ADD CONSTRAINT ai_chat_messages_session_fk
  FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE;

ALTER TABLE public.ai_chat_messages
  ADD CONSTRAINT ai_chat_messages_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_actor_fk
  FOREIGN KEY (actor_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.api_tokens
  ADD CONSTRAINT api_tokens_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.api_tokens
  ADD CONSTRAINT api_tokens_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.tokens
  ADD CONSTRAINT tokens_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.user_oauth_tokens
  ADD CONSTRAINT user_oauth_tokens_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.user_logs
  ADD CONSTRAINT user_logs_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.plan_usages
  ADD CONSTRAINT plan_usages_plan_fk
  FOREIGN KEY (plan_id) REFERENCES public.plans(plan_id) ON DELETE RESTRICT;

ALTER TABLE public.plan_usages
  ADD CONSTRAINT plan_usages_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.plan_usages
  ADD CONSTRAINT plan_usages_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.plan_usage_history
  ADD CONSTRAINT plan_usage_history_plan_usage_fk
  FOREIGN KEY (plan_usage_id) REFERENCES public.plan_usages(id) ON DELETE CASCADE;

ALTER TABLE public.plan_usage_history
  ADD CONSTRAINT plan_usage_history_plan_fk
  FOREIGN KEY (plan_id) REFERENCES public.plans(plan_id) ON DELETE RESTRICT;

ALTER TABLE public.system_admins
  ADD CONSTRAINT system_admins_created_by_fk
  FOREIGN KEY (created_by) REFERENCES public.system_admins(id) ON DELETE SET NULL;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_creator_fk
  FOREIGN KEY (creator_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_note_fk
  FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_project_fk
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.calendar_event_invites
  ADD CONSTRAINT calendar_event_invites_event_fk
  FOREIGN KEY (event_id) REFERENCES public.calendar_events(id) ON DELETE CASCADE;

ALTER TABLE public.calendar_event_invites
  ADD CONSTRAINT calendar_event_invites_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.google_calendar_webhooks
  ADD CONSTRAINT google_calendar_webhooks_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.users
  ADD CONSTRAINT users_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_users_organization_id ON public.users(organization_id);
CREATE INDEX idx_users_plan_id ON public.users(plan_id);
CREATE INDEX idx_users_deleted ON public.users(deleted);
CREATE UNIQUE INDEX uq_users_email_lower ON public.users(lower(email));

CREATE INDEX idx_org_members_organization_id ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_org_members_area_id ON public.organization_members(area_id);
CREATE UNIQUE INDEX uq_org_user_workspace_active_idx
  ON public.organization_members(organization_id, user_id)
  WHERE deleted = false AND area_id IS NULL;
CREATE UNIQUE INDEX uq_org_user_area_active_idx
  ON public.organization_members(organization_id, user_id, area_id)
  WHERE deleted = false AND area_id IS NOT NULL;
CREATE INDEX idx_org_members_workspace_scope
  ON public.organization_members(organization_id, role, status)
  WHERE deleted = false AND area_id IS NULL;
CREATE INDEX idx_org_members_area_scope
  ON public.organization_members(area_id, role)
  WHERE deleted = false AND area_id IS NOT NULL;

CREATE INDEX idx_org_areas_parent ON public.organization_areas(parent_area_id);
CREATE UNIQUE INDEX org_area_slug_idx
  ON public.organization_areas(organization_id, slug)
  WHERE deleted = false;

CREATE INDEX idx_org_invites_organization_id ON public.organization_member_invites(organization_id);
CREATE UNIQUE INDEX uq_org_invites_pending_email
  ON public.organization_member_invites(organization_id, lower(email))
  WHERE deleted = false AND invite_verified = false;
CREATE INDEX idx_org_invites_expires_at ON public.organization_member_invites(expires_at);

CREATE UNIQUE INDEX idx_global_domain_name ON public.organization_domains(lower(domain_name));
CREATE INDEX idx_org_domains_org_id ON public.organization_domains(organization_id);
CREATE INDEX idx_org_domains_status ON public.organization_domains(status) WHERE deleted = false;

CREATE INDEX idx_projects_org_active
  ON public.projects(organization_id)
  WHERE deleted = false AND active = true;
CREATE INDEX idx_projects_user_active
  ON public.projects(user_id)
  WHERE deleted = false AND active = true;
CREATE INDEX idx_projects_parent_project_id
  ON public.projects(parent_project_id)
  WHERE parent_project_id IS NOT NULL;

CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_project_members_user ON public.project_members(user_id);
CREATE UNIQUE INDEX uq_project_members_active
  ON public.project_members(project_id, user_id)
  WHERE deleted = false;

CREATE INDEX idx_project_stages_project ON public.project_stages(project_id);
CREATE UNIQUE INDEX uq_project_stages_position
  ON public.project_stages(project_id, position);

CREATE INDEX idx_notes_user ON public.notes(user_id);
CREATE INDEX idx_notes_project ON public.notes(project_id);
CREATE INDEX idx_notes_organization ON public.notes(organization_id);
CREATE INDEX idx_notes_due_date
  ON public.notes(due_date)
  WHERE deleted = false AND due_date IS NOT NULL;
CREATE INDEX idx_notes_tags_uuids ON public.notes USING gin(tags);

CREATE INDEX idx_notes_short_backups_note_created
  ON public.notes_short_backups(note_id, created_at DESC);
CREATE INDEX idx_notes_short_backups_user_created
  ON public.notes_short_backups(user_id, created_at DESC);
CREATE INDEX idx_jobs_user_created ON public.jobs(user_id, created_at DESC) WHERE deleted = false;
CREATE INDEX idx_jobs_status_created ON public.jobs(status, created_at DESC) WHERE deleted = false;
CREATE INDEX idx_ai_user_agent_user_id ON public.ai_user_agent(user_id) WHERE deleted = false;
CREATE INDEX idx_ai_chat_sessions_user_updated ON public.ai_chat_sessions(user_id, updated_at DESC);
CREATE INDEX idx_ai_chat_messages_session_created ON public.ai_chat_messages(session_id, created_at ASC);

CREATE INDEX idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC)
  WHERE deleted = false AND in_trash = false;

CREATE INDEX idx_api_tokens_key_prefix ON public.api_tokens(key_prefix);
CREATE INDEX idx_api_tokens_user_org ON public.api_tokens(user_id, organization_id);

CREATE INDEX idx_tokens_lookup ON public.tokens(user_id, type, active);
CREATE UNIQUE INDEX uq_tokens_active_code
  ON public.tokens(user_id, type, code)
  WHERE active = true AND code IS NOT NULL;
CREATE INDEX idx_user_logs_user_id ON public.user_logs(user_id);
CREATE INDEX idx_user_logs_created_at ON public.user_logs(created_at);

CREATE INDEX idx_plan_usages_user ON public.plan_usages(user_id);
CREATE INDEX idx_plan_usages_organization ON public.plan_usages(organization_id);
CREATE INDEX idx_usage_history_user ON public.plan_usage_history(user_id);
CREATE INDEX idx_usage_history_period ON public.plan_usage_history(period_end DESC);

CREATE INDEX idx_system_admins_email ON public.system_admins(email) WHERE deleted = false;
CREATE INDEX idx_system_admins_active ON public.system_admins(is_active) WHERE deleted = false;

CREATE INDEX idx_calendar_events_org_date ON public.calendar_events(organization_id, start_time);
CREATE INDEX idx_calendar_invites_event_id ON public.calendar_event_invites(event_id);

-- ============================================================================
-- Triggers
-- ============================================================================
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_users_set_deleted_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_plans_set_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_plans_set_deleted_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_organizations_set_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_organizations_set_deleted_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_organization_areas_set_updated_at
BEFORE UPDATE ON public.organization_areas
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_organization_areas_set_deleted_at
BEFORE UPDATE ON public.organization_areas
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_organization_members_set_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_organization_members_set_deleted_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_organization_domains_set_updated_at
BEFORE UPDATE ON public.organization_domains
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_organization_domains_set_deleted_at
BEFORE UPDATE ON public.organization_domains
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_organization_member_invites_set_updated_at
BEFORE UPDATE ON public.organization_member_invites
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_organization_member_invites_set_deleted_at
BEFORE UPDATE ON public.organization_member_invites
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_projects_set_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_projects_set_deleted_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_project_members_set_updated_at
BEFORE UPDATE ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_project_members_set_deleted_at
BEFORE UPDATE ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_project_stages_set_updated_at
BEFORE UPDATE ON public.project_stages
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_project_stages_set_deleted_at
BEFORE UPDATE ON public.project_stages
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_task_priorities_set_updated_at
BEFORE UPDATE ON public.task_priorities
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_task_priorities_set_deleted_at
BEFORE UPDATE ON public.task_priorities
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_tags_set_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_tags_set_deleted_at
BEFORE UPDATE ON public.tags
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_notes_set_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_notes_set_deleted_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_notes_comments_set_updated_at
BEFORE UPDATE ON public.notes_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_notes_comments_set_deleted_at
BEFORE UPDATE ON public.notes_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_jobs_set_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_jobs_set_deleted_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_ai_user_agent_set_updated_at
BEFORE UPDATE ON public.ai_user_agent
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_ai_user_agent_set_deleted_at
BEFORE UPDATE ON public.ai_user_agent
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_ai_chat_sessions_set_updated_at
BEFORE UPDATE ON public.ai_chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_notifications_set_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_notifications_set_deleted_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_api_tokens_set_updated_at
BEFORE UPDATE ON public.api_tokens
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_api_tokens_set_deleted_at
BEFORE UPDATE ON public.api_tokens
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_user_oauth_tokens_set_updated_at
BEFORE UPDATE ON public.user_oauth_tokens
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_user_oauth_tokens_set_deleted_at
BEFORE UPDATE ON public.user_oauth_tokens
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_plan_usages_set_updated_at
BEFORE UPDATE ON public.plan_usages
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_plan_usages_set_deleted_at
BEFORE UPDATE ON public.plan_usages
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_system_admins_set_updated_at
BEFORE UPDATE ON public.system_admins
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_system_admins_set_deleted_at
BEFORE UPDATE ON public.system_admins
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_calendar_events_set_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_calendar_events_set_deleted_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_calendar_event_invites_set_updated_at
BEFORE UPDATE ON public.calendar_event_invites
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_calendar_event_invites_set_deleted_at
BEFORE UPDATE ON public.calendar_event_invites
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_google_calendar_webhooks_set_updated_at
BEFORE UPDATE ON public.google_calendar_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_google_calendar_webhooks_set_deleted_at
BEFORE UPDATE ON public.google_calendar_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_notes_short_backups_set_deleted_at
BEFORE UPDATE ON public.notes_short_backups
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_note_collaborators_set_deleted_at
BEFORE UPDATE ON public.note_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_tokens_set_deleted_at
BEFORE UPDATE ON public.tokens
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_user_logs_set_deleted_at
BEFORE UPDATE ON public.user_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_plan_usage_history_set_deleted_at
BEFORE UPDATE ON public.plan_usage_history
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

-- ============================================================================
-- Role constraints for consolidated organization_members
-- ============================================================================
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_scope_check
  CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'BILLING_MANAGER', 'MEMBER', 'GUEST'));

COMMENT ON TABLE public.organization_members IS
  'Workspace membership. "owner" is represented by "SUPER_ADMIN".';

