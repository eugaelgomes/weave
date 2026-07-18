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
DROP TABLE IF EXISTS public.note_blocks CASCADE;
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
  'SCRUM'
);

CREATE TYPE public.project_status AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED'
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
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  public_id varchar(25) DEFAULT generate_alphanumeric_id(25) NOT NULL,
  user_id uuid NOT NULL,
  org_name varchar(80) DEFAULT 'New Organization'::character varying NOT NULL,
  unique_name varchar(40) NOT NULL,
  logo_url text NULL,
  banner_url text NULL,
  description text DEFAULT 'Type description here...'::text NULL,
  basic_properties jsonb DEFAULT '{}'::jsonb NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb NOT NULL,
  "plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
  address jsonb DEFAULT '{}'::jsonb NULL,
  plan_id uuid NULL,
  branding_properties jsonb DEFAULT '{}'::jsonb NULL,
  integrations jsonb DEFAULT '{}'::jsonb NULL,
  deleted bool DEFAULT false NOT NULL,
  deleted_at timestamptz NULL,
  deleted_by uuid NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT organizations_pkey PRIMARY KEY (id),
  CONSTRAINT organizations_public_id_key UNIQUE (public_id),
  CONSTRAINT organizations_unique_name_key UNIQUE (unique_name),
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
  is_root_area bool NOT NULL DEFAULT false,
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
COMMENT ON TABLE public.organization_areas IS 'Áreas de uma organização. A área raiz (is_root_area=true) é criada automaticamente com a org.';

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.organization_workspace_role_enum NOT NULL,
  status public.organization_member_status_enum NOT NULL DEFAULT 'ACTIVE',
  invited_by uuid NULL,
  deleted bool NOT NULL DEFAULT false,
  removed_at timestamptz NULL,
  removed_by uuid NULL,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL,
  CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
);

CREATE TABLE public.organization_area_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  area_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.organization_workspace_role_enum NOT NULL,
  status public.organization_member_status_enum NOT NULL DEFAULT 'ACTIVE',
  invited_by uuid NULL,
  deleted bool NOT NULL DEFAULT false,
  removed_at timestamptz NULL,
  removed_by uuid NULL,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL,
  CONSTRAINT unique_org_area_user UNIQUE (organization_id, area_id, user_id),
  CONSTRAINT fk_org_area_members_org FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_area_members_area FOREIGN KEY (area_id) REFERENCES public.organization_areas(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_area_members_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
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
  target_areas jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL
);

-- public.projects definition
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  public_id varchar(25) NOT NULL DEFAULT public.generate_alphanumeric_id(25),
  user_id uuid NOT NULL,
  organization_id uuid NULL,
  parent_project_id uuid NULL,
  title text NOT NULL DEFAULT 'The new project',
  description text NULL DEFAULT 'Type description here...',
  methodology public.project_methodology_enum NOT NULL DEFAULT 'KANBAN',
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
  progress numeric(5, 2) NOT NULL DEFAULT 0.00,
  estimated_effort numeric(10, 2) NOT NULL DEFAULT 0.00,
  color varchar(7) NULL,
  icon jsonb NULL DEFAULT '{"name": "", "path": "", "size": "", "type": ""}'::jsonb,
  CONSTRAINT projects_actual_end_after_start_check
    CHECK (actual_end_date IS NULL OR start_date IS NULL OR actual_end_date >= start_date),
  CONSTRAINT projects_color_check
    CHECK (color::text ~ '^#[a-fA-F0-9]{6}$'::text),
  CONSTRAINT projects_files_is_array_check
    CHECK (jsonb_typeof(projects_files) = 'array'::text),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_progress_check
    CHECK (progress >= 0.00 AND progress <= 100.00),
  CONSTRAINT projects_public_id_format_check
    CHECK (public_id::text ~ '^[a-z0-9]{25}$'::text),
  CONSTRAINT projects_public_id_key UNIQUE (public_id),
  CONSTRAINT projects_target_end_after_start_check
    CHECK (target_end_date IS NULL OR start_date IS NULL OR target_end_date >= start_date),
  CONSTRAINT projects_org_fk
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT projects_parent_fk
    FOREIGN KEY (parent_project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT projects_user_fk
    FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT
);

CREATE TABLE public.user_project_prefs (
  user_id uuid NOT NULL REFERENCES public.users (user_id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_project_prefs_pkey PRIMARY KEY (user_id, project_id)
);

CREATE INDEX idx_user_project_prefs_project ON public.user_project_prefs (project_id);

-- public.project_members definition
CREATE TABLE public.project_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.project_member_role_enum NOT NULL,
  added_by uuid NOT NULL,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_members_pkey PRIMARY KEY (id),
  CONSTRAINT project_members_added_by_fk
    FOREIGN KEY (added_by) REFERENCES public.users(user_id) ON DELETE RESTRICT,
  CONSTRAINT project_members_project_fk
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT project_members_user_fk
    FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT
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

CREATE TABLE public.note_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL
    REFERENCES public.notes(id) ON DELETE CASCADE,
  parent_id uuid NULL
    REFERENCES public.note_blocks(id) ON DELETE CASCADE,
  type text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  position int NOT NULL DEFAULT 0,
  version int NOT NULL DEFAULT 1,
  created_by uuid NOT NULL
    REFERENCES public.users(user_id) ON DELETE RESTRICT,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT note_blocks_type_check CHECK (type IN (
    'paragraph', 'heading', 'quote', 'code', 'divider',
    'image', 'video', 'list', 'todo', 'table', 'page'
  )),
  CONSTRAINT note_blocks_properties_is_object_check
    CHECK (jsonb_typeof(properties) = 'object')
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
  name varchar(100) NOT NULL DEFAULT 'Unnamed Agent',
  description text NULL,
  project_id uuid NULL,
  is_active bool NOT NULL DEFAULT true,
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
  organization_id uuid NULL,
  project_id uuid NULL,
  note_id uuid NULL,
  title varchar(255) NOT NULL DEFAULT 'Nova Conversa',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_chat_sessions_user_fk FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
  CONSTRAINT ai_chat_sessions_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL,
  CONSTRAINT ai_chat_sessions_project_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL
);

CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  organization_id uuid NULL,
  parent_message_id uuid NULL,
  role varchar(20) NOT NULL,
  content text NULL,
  model varchar(50) NULL,
  tool_calls jsonb NULL,
  tool_call_id varchar(255) NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_chat_messages_role_check CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  CONSTRAINT ai_chat_messages_session_fk FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE
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

ALTER TABLE public.ai_user_agent
  ADD CONSTRAINT ai_user_agent_project_fk
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.ai_chat_sessions
  ADD CONSTRAINT ai_chat_sessions_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.ai_chat_messages
  ADD CONSTRAINT ai_chat_messages_session_fk
  FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE;

ALTER TABLE public.ai_chat_messages
  ADD CONSTRAINT ai_chat_messages_user_fk
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

ALTER TABLE public.ai_chat_messages
  ADD CONSTRAINT "ai_chat_messages_organization_FK"
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

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
  ON public.projects USING btree (organization_id)
  WHERE deleted = false AND active = true;
CREATE INDEX idx_projects_user_active
  ON public.projects USING btree (user_id)
  WHERE deleted = false AND active = true;
CREATE INDEX idx_projects_parent_project_id
  ON public.projects USING btree (parent_project_id)
  WHERE parent_project_id IS NOT NULL;

CREATE INDEX idx_project_members_project
  ON public.project_members USING btree (project_id);
CREATE INDEX idx_project_members_user
  ON public.project_members USING btree (user_id);
CREATE UNIQUE INDEX uq_project_members_active
  ON public.project_members USING btree (project_id, user_id)
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

CREATE INDEX idx_note_blocks_note ON public.note_blocks(note_id) WHERE deleted = false;
CREATE INDEX idx_note_blocks_parent ON public.note_blocks(parent_id) WHERE deleted = false;
CREATE INDEX idx_note_blocks_order
  ON public.note_blocks(note_id, parent_id, position)
  WHERE deleted = false;
CREATE UNIQUE INDEX uq_note_blocks_position
  ON public.note_blocks(
    note_id,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    position
  )
  WHERE deleted = false;

CREATE INDEX idx_notes_short_backups_note_created
  ON public.notes_short_backups(note_id, created_at DESC);
CREATE INDEX idx_notes_short_backups_user_created
  ON public.notes_short_backups(user_id, created_at DESC);
CREATE INDEX idx_jobs_user_created ON public.jobs(user_id, created_at DESC) WHERE deleted = false;
CREATE INDEX idx_jobs_status_created ON public.jobs(status, created_at DESC) WHERE deleted = false;
CREATE INDEX idx_ai_user_agent_user_id ON public.ai_user_agent(user_id) WHERE deleted = false;
CREATE INDEX idx_ai_user_agent_project_id ON public.ai_user_agent(project_id) WHERE deleted = false;
CREATE INDEX idx_ai_user_agent_active ON public.ai_user_agent(user_id, is_active) WHERE deleted = false;
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

CREATE TRIGGER trg_organizations_set_deleted_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_organizations_set_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

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

CREATE TRIGGER trg_projects_set_deleted_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_projects_set_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_project_members_set_deleted_at
BEFORE UPDATE ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

CREATE TRIGGER trg_project_members_set_updated_at
BEFORE UPDATE ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

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

CREATE TRIGGER trg_note_blocks_set_updated_at
BEFORE UPDATE ON public.note_blocks
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE TRIGGER trg_note_blocks_set_deleted_at
BEFORE UPDATE ON public.note_blocks
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



-- ============================================================================
-- FILE: ai_chat_sessions_upgrade.sql
-- ============================================================================
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



-- ============================================================================
-- FILE: microsoft_sso_upgrade.sql
-- ============================================================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_with_microsoft boolean NOT NULL DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS microsoft_id varchar(255) UNIQUE;


-- ============================================================================
-- FILE: organizations_country_upgrade.sql
-- ============================================================================
BEGIN;

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS country varchar(2) NULL;

ALTER TABLE public.organizations
DROP CONSTRAINT IF EXISTS organizations_country_format_check;

ALTER TABLE public.organizations
ADD CONSTRAINT organizations_country_format_check
CHECK (
  country IS NULL
  OR country ~ '^[A-Z]{2}$'
);

COMMIT;


-- ============================================================================
-- FILE: plans_v2_saas.sql
-- ============================================================================
-- Plans v2 for SaaS billing and entitlement management
-- Safe to run in dev after dropping previous plan-related tables.

BEGIN;

-- --------------------------------------------
-- Catalog: plan templates
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  plan_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL UNIQUE,
  description text NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan_version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  deleted boolean NOT NULL DEFAULT false,
  plan_value numeric(12, 2) NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'BRL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active, deleted);
CREATE INDEX IF NOT EXISTS idx_plans_name_lower ON plans((lower(name)));

-- --------------------------------------------
-- Billing source of truth: subscription instances
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_type text NOT NULL CHECK (subscriber_type IN ('user', 'organization')),
  subscriber_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES plans(plan_id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (
    status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired')
  ),
  provider varchar(30) NOT NULL DEFAULT 'internal',
  provider_customer_id text NULL,
  provider_subscription_id text NULL,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz NULL,
  trial_start timestamptz NULL,
  trial_end timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_provider_subscription_id
  ON subscriptions(provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_subscriber
  ON subscriptions(subscriber_type, subscriber_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_lookup
  ON subscriptions(subscriber_type, subscriber_id, status, updated_at DESC);

-- --------------------------------------------
-- Tenant-specific overrides over base plan.details
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS plan_limit_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(plan_id) ON DELETE CASCADE,
  subscriber_type text NOT NULL CHECK (subscriber_type IN ('user', 'organization')),
  subscriber_id uuid NOT NULL,
  override_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NULL,
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_limit_overrides_lookup
  ON plan_limit_overrides(plan_id, subscriber_type, subscriber_id, is_active, created_at DESC);

-- --------------------------------------------
-- Usage aggregate (current period + lifetime)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS plan_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(plan_id) ON DELETE RESTRICT,
  subscriber_type text NOT NULL CHECK (subscriber_type IN ('user', 'organization')),
  subscriber_id uuid NOT NULL,
  client_type text NOT NULL CHECK (client_type IN ('user', 'organization')),
  user_id uuid NULL,
  organization_id uuid NULL,
  usage_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_plan_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_plan_version integer NOT NULL DEFAULT 1,
  lifetime_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_reset_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscriber_type, subscriber_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_usages_plan_id ON plan_usages(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_usages_user_id ON plan_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_usages_organization_id ON plan_usages(organization_id);

-- --------------------------------------------
-- Idempotent usage event log (append-only)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE,
  plan_usage_id uuid NOT NULL REFERENCES plan_usages(id) ON DELETE CASCADE,
  operation text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_usage_id ON usage_events(plan_usage_id, processed_at DESC);

-- --------------------------------------------
-- Period snapshots for reports and billing audits
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS plan_usage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_usage_id uuid NOT NULL REFERENCES plan_usages(id) ON DELETE CASCADE,
  user_id uuid NULL,
  organization_id uuid NULL,
  plan_id uuid NOT NULL REFERENCES plans(plan_id) ON DELETE RESTRICT,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  final_usage_details jsonb NOT NULL,
  applied_plan_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_plan_version integer NOT NULL DEFAULT 1,
  total_notes_created integer NOT NULL DEFAULT 0,
  total_projects_created integer NOT NULL DEFAULT 0,
  total_ai_messages integer NOT NULL DEFAULT 0,
  total_storage_mb numeric(12, 2) NOT NULL DEFAULT 0,
  total_exports integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_usage_history_user
  ON plan_usage_history(user_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_plan_usage_history_org
  ON plan_usage_history(organization_id, period_end DESC);

COMMIT;


-- ============================================================================
-- FILE: public_api_request_logs.sql
-- ============================================================================
-- =============================================================================
-- Public API Observability
-- Table: public_api_request_logs
-- =============================================================================

CREATE TABLE public_api_request_logs (
  id               BIGSERIAL        PRIMARY KEY,

  -- Who made the request
  api_token_id     UUID             REFERENCES api_tokens(id)      ON DELETE SET NULL,
  user_id          UUID             REFERENCES users(id)            ON DELETE SET NULL,
  organization_id  UUID             REFERENCES organizations(id)    ON DELETE SET NULL,

  -- What was accessed
  http_method      VARCHAR(10)      NOT NULL,                        -- GET | POST | PUT | DELETE | PATCH
  path             TEXT             NOT NULL,                        -- /api/public/v1/notes?...
  api_version      VARCHAR(10)      NOT NULL DEFAULT 'v1',
  scopes_required  TEXT[],                                           -- ['notes:read'] declared by requireScope

  -- How we responded
  status_code      SMALLINT         NOT NULL,                        -- 200 | 401 | 403 | 429 | 500
  duration_ms      INTEGER,                                          -- response time in ms
  error_code       VARCHAR(64),                                      -- AppError.code on failure; NULL on success
  request_id       UUID,                                             -- correlates with x-request-id / APM

  -- Where the request came from
  ip_address       INET,
  user_agent       TEXT,
  origin_header    TEXT,
  referer_header   TEXT,

  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public_api_request_logs IS 'Audit log for every authenticated Public API request (Bearer wn_*).';
COMMENT ON COLUMN public_api_request_logs.api_token_id     IS 'Token used in this request (SET NULL on token deletion to preserve history).';
COMMENT ON COLUMN public_api_request_logs.scopes_required  IS 'Scopes declared as required by the requireScope middleware on the matched route.';
COMMENT ON COLUMN public_api_request_logs.error_code       IS 'AppError.code when the request failed; NULL on success.';
COMMENT ON COLUMN public_api_request_logs.request_id       IS 'Correlates with x-request-id response header and APM/Sentry traces.';
COMMENT ON COLUMN public_api_request_logs.duration_ms      IS 'Wall-clock time from request start to res.finish, measured in the Node.js process.';

-- =============================================================================
-- Indexes
-- =============================================================================

-- Most common query: audit a specific token (abuse detection, usage dashboards)
CREATE INDEX idx_parl_token_id
  ON public_api_request_logs (api_token_id, created_at DESC);

-- Usage per user (billing, quotas)
CREATE INDEX idx_parl_user_id
  ON public_api_request_logs (user_id, created_at DESC);

-- Usage per organization (org-level dashboards)
CREATE INDEX idx_parl_org_id
  ON public_api_request_logs (organization_id, created_at DESC);

-- Error monitoring: filter by HTTP status
CREATE INDEX idx_parl_status
  ON public_api_request_logs (status_code, created_at DESC);

-- Endpoint popularity / latency analysis
CREATE INDEX idx_parl_path
  ON public_api_request_logs (path, created_at DESC);

-- APM / Sentry trace correlation (partial — only rows that have a request_id)
CREATE INDEX idx_parl_request_id
  ON public_api_request_logs (request_id)
  WHERE request_id IS NOT NULL;

-- =============================================================================
-- Retention policy — run monthly via pg_cron or external job
-- =============================================================================

-- DELETE FROM public_api_request_logs
-- WHERE created_at < NOW() - INTERVAL '90 days';


-- ============================================================================
-- FILE: seed_free_plan.sql
-- ============================================================================
-- Seed/update default FREE plan for plans v2.
-- Safe to run multiple times (upsert by plan name).

INSERT INTO plans (
  name,
  description,
  details,
  plan_version,
  is_active,
  deleted,
  plan_value,
  currency
)
VALUES (
  'free',
  'Free starter tier for new accounts.',
  '{
    "limits": {
      "exports": {
        "notes_monthly": 10,
        "backups_monthly": 1
      },
      "storage": {
        "retention_days": 30,
        "max_file_size_mb": 10,
        "total_monthly_upload_mb": 250
      },
      "max_notes": 500,
      "max_projects": 10,
      "max_team_members": 3
    },
    "features": {
      "dark_mode": true,
      "custom_branding": false,
      "priority_support": false,
      "collaboration_tools": true
    },
    "metadata": {
      "version": "1.0",
      "plan_tier": "free",
      "is_trial_available": false,
      "is_signup_default": true
    },
    "billing": {
      "billing_cycle": "monthly",
      "price": {
        "amount": 0,
        "currency": "BRL"
      },
      "trial_days": 0
    },
    "governance": {
      "feature_flags": {}
    },
    "weave_ai": {
      "enabled": true,
      "config": {
        "default_model": "gpt-4o-mini",
        "available_models": ["gpt-4o-mini"],
        "monthly_messages": 100,
        "max_tokens_per_message": 4096,
        "context_window_messages": 10
      },
      "features": ["chat", "summarization"]
    }
  }'::jsonb,
  1,
  true,
  false,
  0,
  'BRL'
)
ON CONFLICT (name)
DO UPDATE SET
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  plan_version = GREATEST(plans.plan_version, EXCLUDED.plan_version),
  is_active = EXCLUDED.is_active,
  deleted = EXCLUDED.deleted,
  plan_value = EXCLUDED.plan_value,
  currency = EXCLUDED.currency,
  updated_at = NOW();



-- ============================================================================
-- MIGRATION: 2026-05-02_create_sprints_and_report_configs.sql
-- ============================================================================
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


-- ============================================================================
-- MIGRATION: 2026-05-02_upgrade_ai_user_agent.sql
-- ============================================================================
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


-- ============================================================================
-- MIGRATION: 2026-05-03_create_note_blocks.sql
-- ============================================================================
-- Incremental migration: note_blocks table + remove notes.document
-- Requires public.set_row_updated_at / public.set_row_deleted_at (see new_structure_db.sql).

BEGIN;

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.note_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL
    REFERENCES public.notes(id) ON DELETE CASCADE,
  parent_id uuid NULL
    REFERENCES public.note_blocks(id) ON DELETE CASCADE,
  type text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  position int NOT NULL DEFAULT 0,
  version int NOT NULL DEFAULT 1,
  created_by uuid NOT NULL
    REFERENCES public.users(user_id) ON DELETE RESTRICT,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT note_blocks_type_check CHECK (type IN (
    'paragraph', 'heading', 'quote', 'code', 'divider',
    'image', 'list', 'todo', 'table', 'page'
  )),
  CONSTRAINT note_blocks_properties_is_object_check
    CHECK (jsonb_typeof(properties) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_note_blocks_note ON public.note_blocks(note_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_note_blocks_parent ON public.note_blocks(parent_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_note_blocks_order
  ON public.note_blocks(note_id, parent_id, position)
  WHERE deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_note_blocks_position
  ON public.note_blocks(
    note_id,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    position
  )
  WHERE deleted = false;

DROP TRIGGER IF EXISTS trg_note_blocks_set_updated_at ON public.note_blocks;
CREATE TRIGGER trg_note_blocks_set_updated_at
BEFORE UPDATE ON public.note_blocks
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS trg_note_blocks_set_deleted_at ON public.note_blocks;
CREATE TRIGGER trg_note_blocks_set_deleted_at
BEFORE UPDATE ON public.note_blocks
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

-- One empty paragraph per note that has no blocks yet (legacy rows with document jsonb).
INSERT INTO public.note_blocks (note_id, parent_id, type, properties, position, created_by)
SELECT n.id, NULL, 'paragraph', '{}'::jsonb, 0, n.user_id
FROM public.notes n
WHERE n.deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM public.note_blocks nb WHERE nb.note_id = n.id AND nb.deleted = false
  );

ALTER TABLE public.notes DROP COLUMN IF EXISTS document;

COMMIT;


-- ============================================================================
-- MIGRATION: 2026-05-04_create_weave_engine_reasonings.sql
-- ============================================================================
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


-- ============================================================================
-- MIGRATION: 2026-05-07_projects_filters_indexes.sql
-- ============================================================================
-- Optional indexes to support filtered project / note list queries.
-- Safe to run multiple times (IF NOT EXISTS).

CREATE INDEX IF NOT EXISTS idx_projects_status
  ON public.projects(status)
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_projects_methodology
  ON public.projects(methodology)
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_projects_org_active
  ON public.projects(organization_id, active)
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_projects_parent
  ON public.projects(parent_project_id)
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_projects_dates
  ON public.projects(start_date, target_end_date)
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_projects_properties_gin
  ON public.projects USING gin (properties jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_notes_due_date
  ON public.notes(due_date)
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_notes_priority_id
  ON public.notes(priority_id)
  WHERE deleted = false;


-- ============================================================================
-- MIGRATION: 2026-05-08_split_view_pref_and_shrink_methodology.sql
-- ============================================================================
-- Per-user per-project preferences (future-proof).
CREATE TABLE IF NOT EXISTS public.user_project_prefs (
  user_id uuid NOT NULL REFERENCES public.users (user_id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_user_project_prefs_project ON public.user_project_prefs (project_id);

-- Backfill: copy project default view to the project owner (board/list only).
INSERT INTO public.user_project_prefs (user_id, project_id, prefs)
SELECT
  p.user_id,
  p.id,
  jsonb_build_object('view', LOWER(p.default_view::text))
FROM public.projects p
WHERE LOWER(p.default_view::text) IN ('board', 'list')
ON CONFLICT (user_id, project_id) DO NOTHING;

-- Shrink methodology to KANBAN | SCRUM before enum swap.
UPDATE public.projects
SET methodology = 'KANBAN'
WHERE methodology IN ('WATERFALL', 'CUSTOM');

CREATE TYPE public.project_methodology_enum_v2 AS ENUM (
  'KANBAN',
  'SCRUM'
);

ALTER TABLE public.projects
  ALTER COLUMN methodology DROP DEFAULT,
  ALTER COLUMN methodology TYPE public.project_methodology_enum_v2
    USING methodology::text::public.project_methodology_enum_v2,
  ALTER COLUMN methodology SET DEFAULT 'KANBAN';

DROP TYPE public.project_methodology_enum;
ALTER TYPE public.project_methodology_enum_v2 RENAME TO project_methodology_enum;

ALTER TABLE public.projects DROP COLUMN default_view;
DROP TYPE public.project_view_enum;


-- ============================================================================
-- MIGRATION: 2026-05-09_create_organization_slack_integrations.sql
-- ============================================================================
-- Slack workspace installation per Weave organization (OAuth bot token).
-- Requires public.set_row_updated_at / public.set_row_deleted_at (see new_structure_db.sql).

BEGIN;

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.organization_slack_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  slack_team_id varchar(32) NOT NULL,
  slack_team_name varchar(255) NULL,
  bot_user_id varchar(32) NULL,
  app_id varchar(32) NULL,
  scopes text NULL,
  bot_access_token text NOT NULL,
  installed_by_user_id uuid NULL
    REFERENCES public.users(user_id) ON DELETE SET NULL,
  default_channel_id varchar(32) NULL,
  default_channel_name varchar(255) NULL,
  is_active boolean NOT NULL DEFAULT true,
  deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_slack_integrations_org_unique UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_slack_integrations_team
  ON public.organization_slack_integrations(slack_team_id)
  WHERE deleted = false;

COMMENT ON TABLE public.organization_slack_integrations IS
  'Slack OAuth installation (bot token) scoped to a Weave organization.';

DROP TRIGGER IF EXISTS trg_org_slack_integrations_set_updated_at
  ON public.organization_slack_integrations;
CREATE TRIGGER trg_org_slack_integrations_set_updated_at
BEFORE UPDATE ON public.organization_slack_integrations
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS trg_org_slack_integrations_set_deleted_at
  ON public.organization_slack_integrations;
CREATE TRIGGER trg_org_slack_integrations_set_deleted_at
BEFORE UPDATE ON public.organization_slack_integrations
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

COMMIT;


-- ============================================================================
-- MIGRATION: 2026-05-11_add_notes_revision_occ.sql
-- ============================================================================
-- Add optimistic concurrency token for notes.
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;

-- Ensure null legacy rows are normalized (safety for manual schema drift).
UPDATE public.notes
SET revision = 1
WHERE revision IS NULL;

-- Optional helper index for conflict-heavy update paths.
CREATE INDEX IF NOT EXISTS idx_notes_id_revision ON public.notes (id, revision);


-- ============================================================================
-- MIGRATION: 2026-05-11_note_blocks_type_video.sql
-- ============================================================================
-- Allow `video` blocks in note_blocks (TipTap / document sync).

BEGIN;

SET search_path TO public;

ALTER TABLE public.note_blocks DROP CONSTRAINT IF EXISTS note_blocks_type_check;

ALTER TABLE public.note_blocks ADD CONSTRAINT note_blocks_type_check CHECK (type IN (
  'paragraph', 'heading', 'quote', 'code', 'divider',
  'image', 'video', 'list', 'todo', 'table', 'page'
));

COMMIT;


-- ============================================================================
-- MIGRATION: 2026-05-20_add_reasoning_instructions_to_report_configs.sql
-- ============================================================================
-- Migration: Add reasoning_instructions to project_ai_report_configs
-- Date: 2026-05-20
-- Description: Stores per-project custom append instructions for proactive Weave Engine reports.

ALTER TABLE public.project_ai_report_configs
  ADD COLUMN IF NOT EXISTS reasoning_instructions jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.project_ai_report_configs.reasoning_instructions IS
  'Custom append instructions: { global: { systemAppend, promptAppend }, byType: { [type]: { systemAppend, promptAppend } } }';


-- ============================================================================
-- MIGRATION: 2026-05-21_add_notes_public_note_id.sql
-- ============================================================================
-- Public note IDs (same pattern as projects.public_project_id: 12-char alphanumeric).

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS public_note_id varchar(12) NULL;

CREATE OR REPLACE FUNCTION public.generate_public_id_12()
RETURNS varchar(12)
LANGUAGE plpgsql
AS $$
DECLARE
  chars constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
  pick int;
BEGIN
  FOR i IN 1..12 LOOP
    pick := 1 + floor(random() * length(chars))::int;
    result := result || substr(chars, pick, 1);
  END LOOP;
  RETURN result;
END;
$$;

DO $$
DECLARE
  note_row record;
  candidate text;
  attempts int;
BEGIN
  FOR note_row IN
    SELECT id FROM public.notes WHERE public_note_id IS NULL
  LOOP
    attempts := 0;
    LOOP
      candidate := public.generate_public_id_12();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.notes n WHERE n.public_note_id = candidate
      );
      attempts := attempts + 1;
      IF attempts > 50 THEN
        RAISE EXCEPTION 'Could not assign unique public_note_id for note %', note_row.id;
      END IF;
    END LOOP;
    UPDATE public.notes SET public_note_id = candidate WHERE id = note_row.id;
  END LOOP;
END;
$$;

ALTER TABLE public.notes
  ALTER COLUMN public_note_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notes_public_note_id_key
  ON public.notes (public_note_id);


-- ============================================================================
-- MIGRATION: 2026-05-22_notes_embedding_vector.sql
-- ============================================================================
-- pgvector embeddings for semantic note search (text-embedding-3-small, 1536 dims).

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_notes_embedding_ivfflat
  ON public.notes
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE deleted = false AND embedding IS NOT NULL;

COMMIT;


-- ============================================================================
-- MIGRATION: 2026-06-02_add_organization_fk_to_ai_chat_messages.sql
-- ============================================================================
-- Add foreign key constraint to link ai_chat_messages.organization_id with organizations.id

BEGIN;

ALTER TABLE public.ai_chat_messages
  ADD CONSTRAINT "ai_chat_messages_organization_FK"
  FOREIGN KEY (organization_id)
  REFERENCES public.organizations(id)
  ON DELETE SET NULL;

COMMIT;


-- ============================================================================
-- MIGRATION: 2026-06-17_add_share_token_to_ai_chat_sessions.sql
-- ============================================================================
ALTER TABLE ai_chat_sessions
ADD COLUMN share_token VARCHAR(255) UNIQUE;


-- ============================================================================
-- MIGRATION: 2026-06-27_create_artifacts_table.sql
-- ============================================================================
CREATE TABLE ai_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Document',
  type VARCHAR(50) NOT NULL DEFAULT 'document',
  content JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_artifacts_user_id ON ai_artifacts(user_id);
CREATE INDEX idx_ai_artifacts_organization_id ON ai_artifacts(organization_id);


-- ============================================================================
-- MIGRATION: add_session_metadata.sql
-- ============================================================================
-- Migration: Add metadata to sessions table

-- First, ensure the table exists (in case it wasn't created yet by connect-pg-simple)
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);

-- Add new metadata columns
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES "users"("user_id") ON DELETE CASCADE;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "ip_address" varchar(45);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "user_agent" text;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT NOW();
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "last_active" timestamp DEFAULT NOW();
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "api_type" varchar(20);

-- Create indices for quick lookups and cleanup
CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_last_active" ON "sessions" ("last_active");
CREATE INDEX IF NOT EXISTS "idx_sessions_expire" ON "sessions" ("expire");




-- ============================================================================
-- TABLE: public.api_token_usage_logs
-- ============================================================================
CREATE TABLE public.api_token_usage_logs (
    id uuid default gen_random_uuid() not null,
    api_token_id uuid not null,
    user_id uuid not null,
    organization_id uuid null,
    -- identificação da requisição
    request_id varchar(100) null,
    endpoint varchar(255) not null,
    http_method varchar(10) not null,
    -- resultado da requisição
    status_code smallint not null,
    success bool generated always as (status_code >= 200 and status_code < 300) stored,
    error_message text null,
    -- performance
    latency_ms integer null,
    -- metadados extras
    ip_address inet null,
    metadata jsonb null,
    deleted bool default false not null,
    deleted_at timestamptz null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    constraint api_token_usage_logs_pkey primary key (id),
    constraint ck_api_token_usage_logs_soft_delete check (((deleted and (deleted_at is not null)) or ((not deleted) and (deleted_at is null)))) not valid
);

-- índices
CREATE INDEX idx_api_token_usage_logs_token ON public.api_token_usage_logs USING btree (api_token_id, created_at) WHERE (deleted = false);
CREATE INDEX idx_api_token_usage_logs_user_org ON public.api_token_usage_logs USING btree (user_id, organization_id, created_at) WHERE (deleted = false);
CREATE INDEX idx_api_token_usage_logs_created_at ON public.api_token_usage_logs USING btree (created_at);
CREATE INDEX idx_api_token_usage_logs_status ON public.api_token_usage_logs USING btree (status_code) WHERE (success = false and deleted = false);
CREATE INDEX idx_api_token_usage_logs_request_id ON public.api_token_usage_logs USING btree (request_id) WHERE (request_id is not null);
