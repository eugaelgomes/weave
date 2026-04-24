-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

COMMENT ON SCHEMA public IS 'standard public schema';

-- DROP TYPE public."access_status_enum";

CREATE TYPE public."access_status_enum" AS ENUM (
	'success',
	'failure');

-- DROP TYPE public."area_member_role";

CREATE TYPE public."area_member_role" AS ENUM (
	'manager',
	'editor',
	'viewer');

-- DROP TYPE public."domain_verification_status";

CREATE TYPE public."domain_verification_status" AS ENUM (
	'PENDING',
	'VERIFIED',
	'FAILED',
	'EXPIRED');

-- DROP TYPE public."event_source_type";

CREATE TYPE public."event_source_type" AS ENUM (
	'NOTE',
	'PROJECT',
	'MANUAL');

-- DROP TYPE public."invite_role";

CREATE TYPE public."invite_role" AS ENUM (
	'ORGANIZER',
	'REQUIRED',
	'OPTIONAL',
	'RESOURCE');

-- DROP TYPE public."invite_status";

CREATE TYPE public."invite_status" AS ENUM (
	'PENDING',
	'ACCEPTED',
	'DECLINED',
	'TENTATIVE');

-- DROP TYPE public."notes_status";

CREATE TYPE public."notes_status" AS ENUM (
	'archived',
	'visible',
	'secure');

-- DROP TYPE public."notification_entity_type_enum";

CREATE TYPE public."notification_entity_type_enum" AS ENUM (
	'organization',
	'project',
	'note',
	'job',
	'weave-ai');

-- DROP TYPE public."notification_type_enum";

CREATE TYPE public."notification_type_enum" AS ENUM (
	'system_alert',
	'system_update',
	'organization_invite',
	'organization_action',
	'project_invite',
	'project_action',
	'note_shared',
	'note_action',
	'ai_action',
	'job_actoin');

-- DROP TYPE public."project_methodology";

CREATE TYPE public."project_methodology" AS ENUM (
	'scrum',
	'kanban',
	'waterfall',
	'custom');

-- DROP TYPE public."project_status";

CREATE TYPE public."project_status" AS ENUM (
	'open',
	'in_progress',
	'paused',
	'completed',
	'archived');

-- DROP TYPE public."project_view_type";

CREATE TYPE public."project_view_type" AS ENUM (
	'board',
	'list',
	'calendar',
	'timeline',
	'gantt');

-- DROP TYPE public."sync_status";

CREATE TYPE public."sync_status" AS ENUM (
	'SYNCED',
	'PENDING',
	'FAILED',
	'OUT_OF_SYNC');

-- DROP TYPE public."system_users_roles";

CREATE TYPE public."system_users_roles" AS ENUM (
	'super_admin',
	'support',
	'manager',
	'read_only');

-- DROP TYPE public."theme_mode_pattern";

CREATE TYPE public."theme_mode_pattern" AS ENUM (
	'dark',
	'light');

-- DROP TYPE public."token_type_enum";

CREATE TYPE public."token_type_enum" AS ENUM (
	'password_reset',
	'email_verification',
	'access',
	'delete_user_account',
	'backup_download');

-- DROP TYPE public."user_log_category";

CREATE TYPE public."user_log_category" AS ENUM (
	'auth_login',
	'auth_logout',
	'profile_update',
	'security_change',
	'data_export',
	'system_error');

-- DROP TYPE public."user_role";

CREATE TYPE public."user_role" AS ENUM (
	'admin',
	'super_admin',
	'member',
	'guest');

-- DROP SEQUENCE public.aiservermessages_id_seq;

CREATE SEQUENCE public.aiservermessages_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.tokens_token_id_seq;

CREATE SEQUENCE public.tokens_token_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;-- public.aisessions definition

-- Drop table

-- DROP TABLE public.aisessions;

CREATE TABLE public.aisessions ( session_id varchar(255) NOT NULL, subject varchar(50) NOT NULL, created_at timestamp DEFAULT now() NOT NULL, last_activity timestamp DEFAULT now() NOT NULL, CONSTRAINT aisessions_pkey PRIMARY KEY (session_id));
CREATE INDEX idx_sessions_last_activity ON public.aisessions USING btree (last_activity);
CREATE INDEX idx_sessions_subject ON public.aisessions USING btree (subject);
COMMENT ON TABLE public.aisessions IS 'Armazena informações sobre as sessões de conversação';

-- Column comments

COMMENT ON COLUMN public.aisessions.session_id IS 'Identificador único da sessão';
COMMENT ON COLUMN public.aisessions.subject IS 'Assunto da sessão (codigo, programacao, dados)';
COMMENT ON COLUMN public.aisessions.last_activity IS 'Timestamp da última atividade na sessão';


-- public.blocks_logs definition

-- Drop table

-- DROP TABLE public.blocks_logs;

CREATE TABLE public.blocks_logs ( log_id uuid DEFAULT uuid_generate_v4() NOT NULL, block_id uuid NOT NULL, note_id uuid NOT NULL, user_id uuid NULL, operation text NOT NULL, old_data jsonb NULL, new_data jsonb NULL, changed_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT blocks_logs_pkey PRIMARY KEY (log_id));
CREATE INDEX idx_blocks_logs_block_id ON public.blocks_logs USING btree (block_id);
CREATE INDEX idx_blocks_logs_note_id ON public.blocks_logs USING btree (note_id);


-- public.domain_verification_queue definition

-- Drop table

-- DROP TABLE public.domain_verification_queue;

CREATE TABLE public.domain_verification_queue ( id uuid DEFAULT uuid_generate_v4() NOT NULL, domain_id int8 NOT NULL, organization_id int8 NOT NULL, requested_by_user_id int8 NOT NULL, status text DEFAULT 'pending'::text NOT NULL, attempt_count int4 DEFAULT 0 NOT NULL, max_attempts int4 DEFAULT 8 NOT NULL, priority int2 DEFAULT 50 NOT NULL, next_attempt_at timestamptz DEFAULT now() NOT NULL, last_attempt_at timestamptz NULL, locked_at timestamptz NULL, locked_by text NULL, checked_hosts jsonb NULL, last_error text NULL, completed_at timestamptz NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT domain_verification_queue_attempt_count_check CHECK ((attempt_count >= 0)), CONSTRAINT domain_verification_queue_max_attempts_check CHECK ((max_attempts > 0)), CONSTRAINT domain_verification_queue_pkey PRIMARY KEY (id), CONSTRAINT domain_verification_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'retry'::text, 'verified'::text, 'failed'::text, 'dead_letter'::text, 'cancelled'::text]))));
CREATE INDEX idx_domain_verification_queue_domain ON public.domain_verification_queue USING btree (domain_id, created_at DESC);
CREATE INDEX idx_domain_verification_queue_pending ON public.domain_verification_queue USING btree (status, next_attempt_at, priority DESC, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'retry'::text]));


-- public.email_delivery_queue definition

-- Drop table

-- DROP TABLE public.email_delivery_queue;

CREATE TABLE public.email_delivery_queue ( id uuid DEFAULT uuid_generate_v4() NOT NULL, template_key text NULL, from_email text NOT NULL, to_emails _text NOT NULL, cc_emails _text DEFAULT '{}'::text[] NOT NULL, bcc_emails _text DEFAULT '{}'::text[] NOT NULL, reply_to_emails _text DEFAULT '{}'::text[] NOT NULL, subject text NOT NULL, text_body text NULL, html_body text NULL, metadata jsonb DEFAULT '{}'::jsonb NOT NULL, provider text DEFAULT 'resend'::text NOT NULL, provider_message_id text NULL, status text DEFAULT 'pending'::text NOT NULL, priority int2 DEFAULT 50 NOT NULL, attempt_count int4 DEFAULT 0 NOT NULL, max_attempts int4 DEFAULT 5 NOT NULL, next_attempt_at timestamptz DEFAULT now() NOT NULL, last_attempt_at timestamptz NULL, locked_at timestamptz NULL, locked_by text NULL, sent_at timestamptz NULL, last_error text NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT email_delivery_queue_attempt_count_check CHECK ((attempt_count >= 0)), CONSTRAINT email_delivery_queue_max_attempts_check CHECK ((max_attempts > 0)), CONSTRAINT email_delivery_queue_pkey PRIMARY KEY (id), CONSTRAINT email_delivery_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'retry'::text, 'sent'::text, 'dead_letter'::text]))), CONSTRAINT email_delivery_queue_to_emails_check CHECK ((cardinality(to_emails) > 0)));
CREATE INDEX idx_email_delivery_queue_pending ON public.email_delivery_queue USING btree (status, next_attempt_at, priority DESC, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'retry'::text]));
CREATE INDEX idx_email_delivery_queue_status_created ON public.email_delivery_queue USING btree (status, created_at DESC);
CREATE INDEX idx_email_delivery_queue_template ON public.email_delivery_queue USING btree (template_key, created_at DESC);


-- public."plans" definition

-- Drop table

-- DROP TABLE public."plans";

CREATE TABLE public."plans" ( plan_id uuid DEFAULT uuid_generate_v4() NOT NULL, "name" varchar(255) NOT NULL, details jsonb DEFAULT '{}'::jsonb NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, deleted bool DEFAULT false NOT NULL, personalized_for_client bool DEFAULT false NOT NULL, personalized_client varchar(50) COLLATE "pg_c_utf8" NULL, plan_value float8 DEFAULT 0 NULL, currency varchar(3) DEFAULT 'BRL'::character varying NOT NULL, billing_cycle varchar(20) DEFAULT 'monthly'::character varying NOT NULL, gateway_id varchar(255) NULL, trial_days int4 DEFAULT 0 NULL, updated_at timestamptz DEFAULT now() NOT NULL, description text NULL, is_active bool DEFAULT true NOT NULL, CONSTRAINT plans_pkey PRIMARY KEY (plan_id));

-- Column comments

COMMENT ON COLUMN public."plans".billing_cycle IS 'Frequência de cobrança: monthly, yearly, lifetime';
COMMENT ON COLUMN public."plans".gateway_id IS 'ID correspondente ao plano no Stripe ou outro provedor';


-- public.sessions definition

-- Drop table

-- DROP TABLE public.sessions;

CREATE TABLE public.sessions ( sid varchar NOT NULL, sess json NOT NULL, expire timestamp(6) NOT NULL, CONSTRAINT session_pkey PRIMARY KEY (sid));


-- public.users_logs definition

-- Drop table

-- DROP TABLE public.users_logs;

CREATE TABLE public.users_logs ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, log_type public."user_log_category" NOT NULL, log jsonb NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT users_logs_pkey PRIMARY KEY (id));
CREATE INDEX idx_users_logs_created_at ON public.users_logs USING btree (created_at);
CREATE INDEX idx_users_logs_type ON public.users_logs USING btree (log_type);
CREATE INDEX idx_users_logs_user_id ON public.users_logs USING btree (user_id);


-- public.aiservermessages definition

-- Drop table

-- DROP TABLE public.aiservermessages;

CREATE TABLE public.aiservermessages ( id serial4 NOT NULL, session_id varchar(255) NOT NULL, "role" varchar(20) NOT NULL, "content" text NOT NULL, metadata jsonb NULL, created_at timestamp DEFAULT now() NOT NULL, CONSTRAINT aiservermessages_pkey PRIMARY KEY (id), CONSTRAINT aiservermessages_role_check CHECK (((role)::text = ANY ((ARRAY['system'::character varying, 'user'::character varying, 'assistant'::character varying])::text[]))), CONSTRAINT aiservermessages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.aisessions(session_id) ON DELETE CASCADE);
CREATE INDEX idx_messages_created_at ON public.aiservermessages USING btree (created_at);
CREATE INDEX idx_messages_role ON public.aiservermessages USING btree (role);
CREATE INDEX idx_messages_session_id ON public.aiservermessages USING btree (session_id);
COMMENT ON TABLE public.aiservermessages IS 'Armazena o histórico de mensagens de cada sessão';

-- Column comments

COMMENT ON COLUMN public.aiservermessages.session_id IS 'Referência para a sessão';
COMMENT ON COLUMN public.aiservermessages."role" IS 'Papel da mensagem: system, user ou assistant';
COMMENT ON COLUMN public.aiservermessages."content" IS 'Conteúdo textual da mensagem';
COMMENT ON COLUMN public.aiservermessages.metadata IS 'Dados adicionais em formato JSON (ex: citations)';


-- public.system_admins definition

-- Drop table

-- DROP TABLE public.system_admins;

CREATE TABLE public.system_admins ( id uuid DEFAULT gen_random_uuid() NOT NULL, email text NOT NULL, "name" text NOT NULL, "role" public."system_users_roles" DEFAULT 'read_only'::system_users_roles NOT NULL, user_function text NULL, is_active bool DEFAULT true NOT NULL, is_suspended bool DEFAULT false NOT NULL, is_deleted bool DEFAULT false NOT NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, deleted_at timestamptz NULL, created_by uuid NULL, "password" text DEFAULT '.'::text NOT NULL, CONSTRAINT email_format_check CHECK ((email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)), CONSTRAINT system_admins_email_unique UNIQUE (email), CONSTRAINT system_admins_pk PRIMARY KEY (id), CONSTRAINT system_admins_system_admins_fk FOREIGN KEY (created_by) REFERENCES public.system_admins(id));
CREATE INDEX idx_system_admins_active ON public.system_admins USING btree (is_active) WHERE (NOT is_deleted);
CREATE INDEX idx_system_admins_email ON public.system_admins USING btree (email) WHERE (NOT is_deleted);

-- Table Triggers

create trigger update_system_admins_updated_at before
update
    on
    public.system_admins for each row execute function update_updated_at_column();


-- public.ai_agent_actions definition

-- Drop table

-- DROP TABLE public.ai_agent_actions;

CREATE TABLE public.ai_agent_actions ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, session_id uuid NULL, action_type varchar(50) NOT NULL, status varchar(20) DEFAULT 'pending'::character varying NOT NULL, input_data jsonb NOT NULL, output_data jsonb DEFAULT '{}'::jsonb NULL, error_message text NULL, entity_type varchar(50) NULL, entity_id uuid NULL, model varchar(50) NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, completed_at timestamptz NULL, CONSTRAINT ai_agent_actions_pkey PRIMARY KEY (id), CONSTRAINT ai_agent_actions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'success'::character varying, 'failed'::character varying])::text[]))));
CREATE INDEX idx_agent_actions_action_type ON public.ai_agent_actions USING btree (action_type);
CREATE INDEX idx_agent_actions_created_at ON public.ai_agent_actions USING btree (created_at DESC);
CREATE INDEX idx_agent_actions_entity ON public.ai_agent_actions USING btree (entity_type, entity_id);
CREATE INDEX idx_agent_actions_session_id ON public.ai_agent_actions USING btree (session_id);
CREATE INDEX idx_agent_actions_status ON public.ai_agent_actions USING btree (status);
CREATE INDEX idx_agent_actions_user_id ON public.ai_agent_actions USING btree (user_id);
COMMENT ON TABLE public.ai_agent_actions IS 'Histórico de ações executadas pelo agente de IA';

-- Column comments

COMMENT ON COLUMN public.ai_agent_actions.action_type IS 'Tipo de ação: create_note, update_project, etc';
COMMENT ON COLUMN public.ai_agent_actions.status IS 'pending: em andamento, success: concluída, failed: falhou';
COMMENT ON COLUMN public.ai_agent_actions.input_data IS 'Dados de entrada fornecidos para a ação';
COMMENT ON COLUMN public.ai_agent_actions.output_data IS 'Resultado da execução da ação';


-- public.ai_chat_messages definition

-- Drop table

-- DROP TABLE public.ai_chat_messages;

CREATE TABLE public.ai_chat_messages ( id uuid DEFAULT uuid_generate_v4() NOT NULL, session_id uuid NOT NULL, user_id uuid NOT NULL, "role" varchar(20) NOT NULL, "content" text NOT NULL, model varchar(50) NOT NULL, metadata jsonb DEFAULT '{}'::jsonb NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT ai_chat_messages_pkey PRIMARY KEY (id), CONSTRAINT ai_chat_messages_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying])::text[]))));
CREATE INDEX idx_chat_messages_session_id ON public.ai_chat_messages USING btree (session_id);
CREATE INDEX idx_chat_messages_user_id ON public.ai_chat_messages USING btree (user_id);
COMMENT ON TABLE public.ai_chat_messages IS 'Mensagens trocadas entre usuário e IA';

-- Column comments

COMMENT ON COLUMN public.ai_chat_messages."role" IS 'user: mensagem do usuário, assistant: resposta da IA';
COMMENT ON COLUMN public.ai_chat_messages.model IS 'Modelo de IA usado: gemini, perplexity, etc';
COMMENT ON COLUMN public.ai_chat_messages.metadata IS 'Dados adicionais: citações, contexto, etc';


-- public.ai_chat_sessions definition

-- Drop table

-- DROP TABLE public.ai_chat_sessions;

CREATE TABLE public.ai_chat_sessions ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, title varchar(255) DEFAULT 'Nova Conversa'::character varying NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT ai_chat_sessions_pkey PRIMARY KEY (id));
CREATE INDEX idx_chat_sessions_updated_at ON public.ai_chat_sessions USING btree (updated_at DESC);
CREATE INDEX idx_chat_sessions_user_id ON public.ai_chat_sessions USING btree (user_id);
COMMENT ON TABLE public.ai_chat_sessions IS 'Sessões de conversa com IA';


-- public.ai_user_agent definition

-- Drop table

-- DROP TABLE public.ai_user_agent;

CREATE TABLE public.ai_user_agent ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, personality jsonb DEFAULT '{}'::jsonb NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, knowledge_files jsonb DEFAULT '[]'::jsonb NULL, deleted bool DEFAULT false NULL, deleted_at timestamptz NULL, shared_with jsonb DEFAULT '[]'::jsonb NULL, CONSTRAINT ai_user_agent_pkey PRIMARY KEY (id));
CREATE INDEX idx_ai_user_agent_metadata ON public.ai_user_agent USING gin (personality);
CREATE INDEX idx_ai_user_agent_user_id ON public.ai_user_agent USING btree (user_id);

-- Table Triggers

create trigger trg_ai_user_agent_updated_at before
update
    on
    public.ai_user_agent for each row execute function update_updated_at_column();


-- public.api_tokens definition

-- Drop table

-- DROP TABLE public.api_tokens;

CREATE TABLE public.api_tokens ( id uuid DEFAULT uuid_generate_v4() NOT NULL, "name" varchar(255) NOT NULL, key_prefix varchar(50) NOT NULL, token_hash varchar(255) NOT NULL, user_id uuid NOT NULL, organization_id uuid NULL, scopes _text DEFAULT '{read}'::text[] NULL, expires_at timestamptz NULL, revoked_at timestamptz NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, deleted bool DEFAULT false NOT NULL, deleted_at timestamptz NULL, description varchar(255) NULL, CONSTRAINT api_tokens_key_prefix_key UNIQUE (key_prefix), CONSTRAINT api_tokens_pkey PRIMARY KEY (id));
CREATE INDEX idx_api_tokens_key_prefix ON public.api_tokens USING btree (key_prefix);
CREATE INDEX idx_api_tokens_user_org ON public.api_tokens USING btree (user_id, organization_id);


-- public.blocks definition

-- Drop table

-- DROP TABLE public.blocks;

CREATE TABLE public.blocks ( id uuid DEFAULT uuid_generate_v4() NOT NULL, note_id uuid NOT NULL, user_id uuid NOT NULL, parent_id uuid NULL, "type" text NULL, "text" text NULL, properties jsonb DEFAULT '{}'::jsonb NULL, done bool NULL, deleted bool DEFAULT false NULL, "position" int4 NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, CONSTRAINT blocks_pkey PRIMARY KEY (id), CONSTRAINT blocks_type_check CHECK ((type = ANY (ARRAY['text'::text, 'todo'::text, 'list'::text, 'page'::text, 'heading'::text, 'paragraph'::text, 'quote'::text, 'code'::text]))));


-- public.calendar_event_invites definition

-- Drop table

-- DROP TABLE public.calendar_event_invites;

CREATE TABLE public.calendar_event_invites ( id uuid DEFAULT uuid_generate_v4() NOT NULL, event_id uuid NOT NULL, user_id uuid NULL, email varchar(255) NOT NULL, "role" public."invite_role" DEFAULT 'REQUIRED'::invite_role NOT NULL, status public."invite_status" DEFAULT 'PENDING'::invite_status NOT NULL, external_guest_id varchar(512) NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, deleted bool DEFAULT false NULL, deleted_at timestamptz NULL, CONSTRAINT calendar_event_invites_pkey PRIMARY KEY (id), CONSTRAINT unique_event_invite_email UNIQUE (event_id, email));
CREATE INDEX idx_invites_email_lower ON public.calendar_event_invites USING btree (lower((email)::text));
CREATE INDEX idx_invites_event_id ON public.calendar_event_invites USING btree (event_id);
CREATE INDEX idx_invites_user_id ON public.calendar_event_invites USING btree (user_id) WHERE (user_id IS NOT NULL);

-- Table Triggers

create trigger trg_calendar_event_invites_updated_at before
update
    on
    public.calendar_event_invites for each row execute function update_updated_at_column();


-- public.calendar_events definition

-- Drop table

-- DROP TABLE public.calendar_events;

CREATE TABLE public.calendar_events ( id uuid DEFAULT uuid_generate_v4() NOT NULL, organization_id uuid NULL, creator_id uuid NOT NULL, title varchar(255) NOT NULL, description text NULL, "location" text NULL, start_time timestamptz NOT NULL, end_time timestamptz NOT NULL, is_all_day bool DEFAULT false NULL, note_id uuid NULL, project_id uuid NULL, is_from_note bool DEFAULT false NULL, is_from_project bool DEFAULT false NULL, google_event_id varchar(512) NULL, google_calendar_id varchar(255) NULL, outlook_event_id varchar(512) NULL, outlook_calendar_id varchar(255) NULL, last_synced_at timestamptz NULL, "sync_status" public."sync_status" DEFAULT 'PENDING'::sync_status NULL, etag text NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, deleted bool DEFAULT false NULL, deleted_at timestamptz NULL, CONSTRAINT calendar_events_google_event_id_key UNIQUE (google_event_id), CONSTRAINT calendar_events_outlook_event_id_key UNIQUE (outlook_event_id), CONSTRAINT calendar_events_pkey PRIMARY KEY (id));
CREATE INDEX idx_cal_note ON public.calendar_events USING btree (note_id) WHERE (note_id IS NOT NULL);
CREATE INDEX idx_cal_org_dates ON public.calendar_events USING btree (organization_id, start_time, end_time);
CREATE INDEX idx_cal_project ON public.calendar_events USING btree (project_id) WHERE (project_id IS NOT NULL);
CREATE INDEX idx_events_google_id ON public.calendar_events USING btree (google_event_id) WHERE (google_event_id IS NOT NULL);
CREATE INDEX idx_events_org_date ON public.calendar_events USING btree (organization_id, start_time);
CREATE INDEX idx_events_outlook_id ON public.calendar_events USING btree (outlook_event_id) WHERE (outlook_event_id IS NOT NULL);


-- public.document_collaborators definition

-- Drop table

-- DROP TABLE public.document_collaborators;

CREATE TABLE public.document_collaborators ( id uuid DEFAULT uuid_generate_v4() NOT NULL, document_id uuid NULL, user_id uuid NULL, "role" varchar(50) NOT NULL, granted_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, deleted bool DEFAULT false NOT NULL, deleted_at timestamptz NULL, CONSTRAINT document_collaborators_pkey PRIMARY KEY (id), CONSTRAINT document_collaborators_role_check CHECK (((role)::text = ANY ((ARRAY['viewer'::character varying, 'commenter'::character varying, 'editor'::character varying, 'owner'::character varying])::text[]))));

-- Table Triggers

create trigger set_timestamp_doc_collab before
update
    on
    public.document_collaborators for each row execute function trigger_set_timestamp();


-- public.documents definition

-- Drop table

-- DROP TABLE public.documents;

CREATE TABLE public.documents ( id uuid DEFAULT uuid_generate_v4() NOT NULL, organization_id uuid NULL, title varchar(255) DEFAULT 'Untitled document'::character varying NOT NULL, description varchar(255) NULL, "content" jsonb DEFAULT '[]'::jsonb NOT NULL, user_id uuid NOT NULL, current_version int8 DEFAULT 1 NOT NULL, is_archived bool DEFAULT false NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, deleted bool DEFAULT false NOT NULL, deleted_at timestamptz NULL, deleted_by uuid NULL, CONSTRAINT documents_pkey PRIMARY KEY (id));
CREATE INDEX idx_documents_active ON public.documents USING btree (organization_id) WHERE (deleted = false);

-- Table Triggers

create trigger set_timestamp_documents before
update
    on
    public.documents for each row execute function trigger_set_timestamp();


-- public.google_calendar_webhooks definition

-- Drop table

-- DROP TABLE public.google_calendar_webhooks;

CREATE TABLE public.google_calendar_webhooks ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, calendar_id varchar(255) NOT NULL, channel_id uuid NOT NULL, resource_id varchar(255) NULL, sync_token varchar(255) NULL, expires_at timestamptz NULL, is_active bool DEFAULT true NOT NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, deleted bool DEFAULT false NOT NULL, CONSTRAINT google_calendar_webhooks_pkey PRIMARY KEY (id));


-- public.jobs definition

-- Drop table

-- DROP TABLE public.jobs;

CREATE TABLE public.jobs ( job_id uuid DEFAULT uuid_generate_v4() NOT NULL, "type" varchar(50) NOT NULL, status varchar(20) DEFAULT 'pending'::character varying NOT NULL, created_at timestamp DEFAULT now() NULL, started_at timestamp NULL, completed_at timestamp NULL, progress int4 DEFAULT 0 NULL, "error" text NULL, "result" jsonb NULL, metadata jsonb NULL, user_id uuid NOT NULL, CONSTRAINT jobs_pkey PRIMARY KEY (job_id));
CREATE INDEX idx_jobs_created_at ON public.jobs USING btree (created_at);
CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);
COMMENT ON TABLE public.jobs IS 'Armazena informações sobre jobs assíncronos (backups, exports, etc)';

-- Column comments

COMMENT ON COLUMN public.jobs.job_id IS 'ID único do job';
COMMENT ON COLUMN public.jobs."type" IS 'Tipo do job (backup_export, etc)';
COMMENT ON COLUMN public.jobs.status IS 'Status: pending, processing, completed, failed';
COMMENT ON COLUMN public.jobs.progress IS 'Progresso de 0 a 100';
COMMENT ON COLUMN public.jobs."result" IS 'Resultado do job em formato JSON';
COMMENT ON COLUMN public.jobs.metadata IS 'Metadados adicionais em formato JSON';


-- public.note_collaborators definition

-- Drop table

-- DROP TABLE public.note_collaborators;

CREATE TABLE public.note_collaborators ( note_id uuid NOT NULL, user_id uuid NOT NULL, added_at timestamp DEFAULT now() NOT NULL, removed_at timestamp(6) NULL, removed bool DEFAULT false NULL, removed_by varchar(6) NULL, CONSTRAINT note_collaborators_pkey PRIMARY KEY (note_id, user_id));


-- public.note_collaborators_logs definition

-- Drop table

-- DROP TABLE public.note_collaborators_logs;

CREATE TABLE public.note_collaborators_logs ( log_id uuid DEFAULT uuid_generate_v4() NOT NULL, note_id uuid NOT NULL, target_user_id uuid NOT NULL, operation text NOT NULL, data_snapshot jsonb NOT NULL, changed_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT note_collaborators_logs_pkey PRIMARY KEY (log_id));
CREATE INDEX idx_note_collab_logs_composite ON public.note_collaborators_logs USING btree (note_id, target_user_id);


-- public.notes definition

-- Drop table

-- DROP TABLE public.notes;

CREATE TABLE public.notes ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, title text DEFAULT 'Set note title'::text NOT NULL, description text DEFAULT 'Write note description here'::text NULL, deleted bool DEFAULT false NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, properties jsonb DEFAULT '{}'::jsonb NULL, project_id uuid NULL, org_id uuid NULL, deleted_at timestamptz(6) NULL, status public."notes_status" NULL, project_stage_id uuid NULL, due_date timestamptz NULL, priority_id uuid NULL, deleted_by uuid NULL, tags _uuid DEFAULT '{}'::uuid[] NOT NULL, parent_id uuid NULL, "document" jsonb DEFAULT '{"type": "doc", "content": [{"type": "paragraph"}]}'::jsonb NOT NULL, CONSTRAINT notes_pkey PRIMARY KEY (id));
CREATE INDEX idx_notes_due_date ON public.notes USING btree (due_date) WHERE ((deleted = false) AND (due_date IS NOT NULL));
CREATE INDEX idx_notes_priority_id ON public.notes USING btree (priority_id);
CREATE INDEX idx_notes_tags_uuids ON public.notes USING gin (tags);
CREATE INDEX idx_notes_user ON public.notes USING btree (user_id);


-- public.notes_comments definition

-- Drop table

-- DROP TABLE public.notes_comments;

CREATE TABLE public.notes_comments ( id uuid DEFAULT uuid_generate_v4() NOT NULL, note_id uuid NOT NULL, user_id uuid NOT NULL, org_id uuid NULL, "content" jsonb NOT NULL, files jsonb DEFAULT '[]'::jsonb NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL, updated_at timestamptz NULL, deleted bool DEFAULT false NULL, deleted_at timestamptz NULL, parent_id uuid NULL, CONSTRAINT notes_comments_pkey PRIMARY KEY (id));
CREATE INDEX idx_comments_note_id ON public.notes_comments USING btree (note_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_comments_org_id ON public.notes_comments USING btree (org_id);
CREATE INDEX idx_comments_user_id ON public.notes_comments USING btree (user_id);


-- public.notifications definition

-- Drop table

-- DROP TABLE public.notifications;

CREATE TABLE public.notifications ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, actor_id uuid NULL, "type" public."notification_type_enum" NOT NULL, entity_type public."notification_entity_type_enum" NOT NULL, entity_id uuid NOT NULL, title varchar(255) NOT NULL, "content" jsonb DEFAULT '{}'::jsonb NOT NULL, is_read bool DEFAULT false NOT NULL, read_at timestamptz NULL, in_trash bool DEFAULT false NOT NULL, trashed_at timestamptz NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, deleted bool DEFAULT false NOT NULL, CONSTRAINT chk_notifications_read_state CHECK ((((is_read = true) AND (read_at IS NOT NULL)) OR ((is_read = false) AND (read_at IS NULL)))), CONSTRAINT chk_notifications_trash_state CHECK ((((in_trash = true) AND (trashed_at IS NOT NULL)) OR ((in_trash = false) AND (trashed_at IS NULL)))), CONSTRAINT notifications_pkey PRIMARY KEY (id));
CREATE INDEX idx_notifications_entity ON public.notifications USING btree (entity_type, entity_id);
CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC) WHERE ((deleted = false) AND (in_trash = false));
CREATE INDEX idx_notifications_user_trash ON public.notifications USING btree (user_id, trashed_at DESC) WHERE ((deleted = false) AND (in_trash = true));
CREATE INDEX idx_notifications_user_type ON public.notifications USING btree (user_id, type) WHERE ((deleted = false) AND (in_trash = false));
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE ((deleted = false) AND (in_trash = false));

-- Table Triggers

create trigger trg_notifications_updated_at before
update
    on
    public.notifications for each row execute function update_updated_at_column();


-- public.organization_domains definition

-- Drop table

-- DROP TABLE public.organization_domains;

CREATE TABLE public.organization_domains ( id uuid DEFAULT uuid_generate_v4() NOT NULL, organization_id uuid NOT NULL, domain_name varchar(255) NOT NULL, verification_token varchar(255) NOT NULL, status public."domain_verification_status" DEFAULT 'PENDING'::domain_verification_status NOT NULL, sso_enabled bool DEFAULT false NOT NULL, sso_provider varchar(50) NULL, sso_metadata jsonb NULL, verified_at timestamptz NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL, updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL, deleted bool DEFAULT false NOT NULL, deleted_at timestamp NULL, CONSTRAINT organization_domains_pkey PRIMARY KEY (id), CONSTRAINT organization_domains_verification_token_key UNIQUE (verification_token), CONSTRAINT unique_org_domain UNIQUE (organization_id, domain_name));
CREATE UNIQUE INDEX idx_global_domain_name ON public.organization_domains USING btree (domain_name);
CREATE INDEX idx_org_domains_org_id ON public.organization_domains USING btree (organization_id);
CREATE INDEX idx_org_domains_status_pending ON public.organization_domains USING btree (status) WHERE (status = 'PENDING'::domain_verification_status);


-- public.organization_invites_members definition

-- Drop table

-- DROP TABLE public.organization_invites_members;

CREATE TABLE public.organization_invites_members ( invite_id uuid DEFAULT uuid_generate_v4() NOT NULL, org_id uuid NOT NULL, "name" varchar(255) NULL, email varchar(255) NOT NULL, username varchar(255) NULL, "role" varchar(50) DEFAULT 'member'::character varying NOT NULL, invite_verified bool DEFAULT false NOT NULL, deleted bool DEFAULT false NOT NULL, invited_by uuid NOT NULL, expires_at timestamp NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL, area_id uuid NULL, "area_member_role" varchar(50) NULL, CONSTRAINT organization_invites_members_area_role_check CHECK (((area_id IS NULL) OR ((area_member_role IS NOT NULL) AND ((area_member_role)::text = ANY (ARRAY['manager'::text, 'editor'::text, 'viewer'::text]))))), CONSTRAINT organization_invites_members_pkey PRIMARY KEY (invite_id), CONSTRAINT organization_invites_members_role_check CHECK (((role)::text = ANY (ARRAY['super_admin'::text, 'admin'::text, 'member'::text, 'guest'::text]))));
CREATE INDEX idx_org_invites_members_active ON public.organization_invites_members USING btree (deleted, invite_verified);
CREATE INDEX idx_org_invites_members_email ON public.organization_invites_members USING btree (email);
CREATE INDEX idx_org_invites_members_org_id ON public.organization_invites_members USING btree (org_id);
CREATE INDEX idx_org_invites_members_verified ON public.organization_invites_members USING btree (invite_verified);
CREATE UNIQUE INDEX uq_org_invites_pending_email ON public.organization_invites_members USING btree (org_id, lower((email)::text)) WHERE ((deleted = false) AND (invite_verified = false));
COMMENT ON TABLE public.organization_invites_members IS 'Convites pendentes para membros de organização';

-- Column comments

COMMENT ON COLUMN public.organization_invites_members.invite_id IS 'ID único do convite (token na URL)';
COMMENT ON COLUMN public.organization_invites_members.org_id IS 'Organização';
COMMENT ON COLUMN public.organization_invites_members.email IS 'E-mail do convidado';
COMMENT ON COLUMN public.organization_invites_members."role" IS 'Papel na organização (user_role)';
COMMENT ON COLUMN public.organization_invites_members.area_id IS 'Área opcional ao aceitar';
COMMENT ON COLUMN public.organization_invites_members."area_member_role" IS 'Papel na área (manager/editor/viewer)';

-- Table Triggers

create trigger trigger_organization_invites_members_updated_at before
update
    on
    public.organization_invites_members for each row execute function update_invite_org_members_updated_at();


-- public.organizations definition

-- Drop table

-- DROP TABLE public.organizations;

CREATE TABLE public.organizations ( id uuid DEFAULT uuid_generate_v4() NOT NULL, org_name varchar(50) DEFAULT 'New Organization'::text NOT NULL, unique_name varchar(30) NOT NULL, logo_url varchar NULL, banner_url varchar NULL, description text DEFAULT 'Type description here...'::text NULL, basic_properties jsonb DEFAULT '{}'::jsonb NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, deleted bool DEFAULT false NOT NULL, org_domains _text NULL, settings jsonb DEFAULT '{}'::jsonb NOT NULL, "plan" jsonb DEFAULT '{}'::jsonb NOT NULL, address jsonb DEFAULT '{}'::jsonb NULL, user_id uuid NOT NULL, delete_at timestamptz NULL, deleted_by uuid NULL, plan_id uuid DEFAULT '4227a4fe-11bd-4a73-a78a-334543076891'::uuid NOT NULL, branding_properties jsonb DEFAULT '{}'::jsonb NULL, integrations jsonb DEFAULT '{}'::jsonb NULL, CONSTRAINT organizations_pkey PRIMARY KEY (id), CONSTRAINT organizations_unique_unique_name UNIQUE (unique_name));

-- Column comments

COMMENT ON COLUMN public.organizations.plan_id IS 'By pattern, free plan id';


-- public.organizations_areas definition

-- Drop table

-- DROP TABLE public.organizations_areas;

CREATE TABLE public.organizations_areas ( id uuid DEFAULT uuid_generate_v4() NOT NULL, organization_id uuid NOT NULL, parent_area_id uuid NULL, area_name text NOT NULL, slug text NOT NULL, description text DEFAULT 'Area description here'::text NULL, active bool DEFAULT true NOT NULL, deleted bool DEFAULT false NOT NULL, properties jsonb DEFAULT '{}'::jsonb NOT NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, created_by uuid NOT NULL, updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_by uuid NULL, deleted_at timestamp NULL, deleted_by bool DEFAULT false NULL, CONSTRAINT organizations_areas_pk PRIMARY KEY (id));
CREATE INDEX idx_org_areas_parent ON public.organizations_areas USING btree (parent_area_id);
CREATE UNIQUE INDEX org_area_slug_idx ON public.organizations_areas USING btree (organization_id, slug) WHERE (deleted IS FALSE);


-- public.organizations_members definition

-- Drop table

-- DROP TABLE public.organizations_members;

CREATE TABLE public.organizations_members ( id uuid DEFAULT uuid_generate_v4() NOT NULL, org_id uuid NOT NULL, user_id uuid NOT NULL, "role" text NOT NULL, status varchar(50) DEFAULT 'active'::character varying NOT NULL, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp NULL, invited_by uuid NOT NULL, deleted bool DEFAULT false NOT NULL, suspended bool DEFAULT false NOT NULL, area_id uuid NULL, removed_at timestamp NULL, removed_by uuid NULL, CONSTRAINT organizations_members_pkey PRIMARY KEY (id));
CREATE INDEX idx_org_members_area_id ON public.organizations_members USING btree (area_id);
CREATE INDEX idx_org_members_org_id ON public.organizations_members USING btree (org_id);
CREATE INDEX idx_org_members_user_id ON public.organizations_members USING btree (user_id);
CREATE UNIQUE INDEX uq_org_user_area_active_idx ON public.organizations_members USING btree (org_id, user_id, area_id) WHERE (deleted IS FALSE);

-- Table Triggers

create trigger update_organizations_members_modtime before
update
    on
    public.organizations_members for each row execute function update_updated_at_column();


-- public.plan_usage_history definition

-- Drop table

-- DROP TABLE public.plan_usage_history;

CREATE TABLE public.plan_usage_history ( id uuid DEFAULT uuid_generate_v4() NOT NULL, plan_usage_id uuid NOT NULL, user_id uuid NOT NULL, org_id uuid NULL, plan_id uuid NOT NULL, period_start timestamptz NOT NULL, period_end timestamptz NOT NULL, final_usage_details jsonb NOT NULL, total_notes_created int4 DEFAULT 0 NULL, total_projects_created int4 DEFAULT 0 NULL, total_ai_messages int4 DEFAULT 0 NULL, total_storage_mb numeric(10, 2) DEFAULT 0 NULL, total_exports int4 DEFAULT 0 NULL, created_at timestamptz DEFAULT now() NULL, CONSTRAINT plan_usage_history_pkey PRIMARY KEY (id));
CREATE INDEX idx_usage_history_period ON public.plan_usage_history USING btree (period_end DESC);
CREATE INDEX idx_usage_history_plan_usage ON public.plan_usage_history USING btree (plan_usage_id);
CREATE INDEX idx_usage_history_user ON public.plan_usage_history USING btree (user_id);
COMMENT ON TABLE public.plan_usage_history IS 'Snapshots mensais de uso salvos ao final de cada ciclo';


-- public.plans_usage definition

-- Drop table

-- DROP TABLE public.plans_usage;

CREATE TABLE public.plans_usage ( id uuid DEFAULT uuid_generate_v4() NOT NULL, plan_id uuid NOT NULL, client_type text NOT NULL, user_id uuid NULL, org_id uuid NULL, usage_details jsonb DEFAULT '{}'::jsonb NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, last_reset_at timestamptz DEFAULT now() NULL, lifetime_stats jsonb DEFAULT '{"peak_usage_month": null, "total_notes_ever": 0, "first_activity_at": null, "total_months_active": 0, "total_projects_ever": 0, "total_storage_used_mb": 0, "total_ai_messages_ever": 0}'::jsonb NULL, is_trial bool DEFAULT false NULL, trial_ends_at timestamptz NULL, downgrade_scheduled_to uuid NULL, downgrade_effective_at timestamptz NULL, period_start timestamptz NULL, period_end timestamptz NULL, CONSTRAINT plans_usage_pkey PRIMARY KEY (id));

-- Column comments

COMMENT ON COLUMN public.plans_usage.usage_details IS 'Dados do ciclo mensal atual (reseta todo mês)';
COMMENT ON COLUMN public.plans_usage.last_reset_at IS 'Data da última vez que os contadores mensais foram zerados';
COMMENT ON COLUMN public.plans_usage.lifetime_stats IS 'Estatísticas agregadas de toda a vida útil do usuário';


-- public.project_stages definition

-- Drop table

-- DROP TABLE public.project_stages;

CREATE TABLE public.project_stages ( id uuid DEFAULT uuid_generate_v4() NOT NULL, project_id uuid NOT NULL, "name" text NOT NULL, "position" int4 NOT NULL, color text DEFAULT '#E2E8F0'::text NULL, properties jsonb DEFAULT '{}'::jsonb NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT project_stages_pkey PRIMARY KEY (id));
CREATE INDEX idx_project_stages_project ON public.project_stages USING btree (project_id);


-- public.projects definition

-- Drop table

-- DROP TABLE public.projects;

CREATE TABLE public.projects ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, title text DEFAULT 'The new project'::text NOT NULL, description text DEFAULT 'Type description here...'::text NULL, properties jsonb DEFAULT '{}'::jsonb NULL, status public."project_status" DEFAULT 'open'::project_status NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, deleted bool DEFAULT false NOT NULL, org_id uuid NULL, active bool DEFAULT true NOT NULL, methodology public."project_methodology" DEFAULT 'kanban'::project_methodology NOT NULL, default_view public."project_view_type" DEFAULT 'board'::project_view_type NOT NULL, projects_files jsonb DEFAULT '{}'::jsonb NOT NULL, parent_project_id uuid NULL, start_date date NULL, target_end_date date NULL, actual_end_date date NULL, visibility text DEFAULT 'private'::text NULL, CONSTRAINT projects_pkey PRIMARY KEY (id), CONSTRAINT projects_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'org_wide'::text, 'public'::text]))));
CREATE INDEX idx_projects_org_active ON public.projects USING btree (org_id) WHERE ((deleted = false) AND (active = true));
CREATE INDEX idx_projects_parent_project_id ON public.projects USING btree (parent_project_id) WHERE (parent_project_id IS NOT NULL);
CREATE INDEX idx_projects_user_active ON public.projects USING btree (user_id) WHERE ((deleted = false) AND (active = true));

-- Table Triggers

create trigger update_projects_modtime before
update
    on
    public.projects for each row execute function update_modified_column();


-- public.projects_logs definition

-- Drop table

-- DROP TABLE public.projects_logs;

CREATE TABLE public.projects_logs ( log_id uuid DEFAULT uuid_generate_v4() NOT NULL, project_id uuid NOT NULL, user_id uuid NULL, operation text NOT NULL, old_data jsonb NULL, new_data jsonb NULL, changed_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT projects_logs_pkey PRIMARY KEY (log_id));
CREATE INDEX idx_projects_logs_changed_at ON public.projects_logs USING btree (changed_at);
CREATE INDEX idx_projects_logs_project_id ON public.projects_logs USING btree (project_id);


-- public.projects_members definition

-- Drop table

-- DROP TABLE public.projects_members;

CREATE TABLE public.projects_members ( id uuid DEFAULT uuid_generate_v4() NOT NULL, project_id uuid NOT NULL, user_id uuid NOT NULL, "role" public."user_role" NOT NULL, deleted bool DEFAULT false NOT NULL, suspended bool DEFAULT false NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, added_by uuid NOT NULL, CONSTRAINT projects_members_pkey PRIMARY KEY (id));


-- public.tags definition

-- Drop table

-- DROP TABLE public.tags;

CREATE TABLE public.tags ( id uuid DEFAULT uuid_generate_v4() NOT NULL, org_id uuid NOT NULL, user_id uuid NOT NULL, "name" varchar(30) NOT NULL, color_hex varchar(7) DEFAULT '#E2E8F0'::character varying NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, deleted bool DEFAULT false NOT NULL, deleted_at timestamptz NULL, deleted_by uuid NULL, project_id uuid NULL, CONSTRAINT tags_pkey PRIMARY KEY (id));
CREATE INDEX idx_tags_org ON public.tags USING btree (org_id);
CREATE UNIQUE INDEX uidx_tags_org_global_name ON public.tags USING btree (org_id, lower((name)::text)) WHERE ((project_id IS NULL) AND (deleted = false));
CREATE UNIQUE INDEX uidx_tags_org_project_name ON public.tags USING btree (org_id, project_id, lower((name)::text)) WHERE ((project_id IS NOT NULL) AND (deleted = false));

-- Table Triggers

create trigger trg_remove_orphan_tag after
delete
    on
    public.tags for each row execute function remove_orphan_tag_from_notes();


-- public.task_priorities definition

-- Drop table

-- DROP TABLE public.task_priorities;

CREATE TABLE public.task_priorities ( id uuid DEFAULT uuid_generate_v4() NOT NULL, org_id uuid NULL, user_id uuid NOT NULL, "name" varchar(30) NOT NULL, color_hex varchar(7) DEFAULT '#808080'::character varying NULL, sort_order int4 DEFAULT 0 NOT NULL, is_active bool DEFAULT true NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, deleted bool DEFAULT false NOT NULL, deleted_at timestamptz NULL, deleted_by uuid NULL, project_id uuid NOT NULL, CONSTRAINT task_priorities_pkey PRIMARY KEY (id));
CREATE INDEX idx_task_priorities_org ON public.task_priorities USING btree (org_id);


-- public.tokens definition

-- Drop table

-- DROP TABLE public.tokens;

CREATE TABLE public.tokens ( token_id serial4 NOT NULL, user_id uuid NOT NULL, "token" varchar(255) NOT NULL, "type" public."token_type_enum" NOT NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, expires_at timestamp NOT NULL, active bool DEFAULT true NULL, data_to_update jsonb DEFAULT '{}'::jsonb NULL, code varchar(20) NULL, CONSTRAINT tokens_pkey PRIMARY KEY (token_id));
CREATE INDEX idx_token ON public.tokens USING btree (token);
CREATE INDEX idx_user_token ON public.tokens USING btree (user_id, type, active);


-- public.user_oauth_tokens definition

-- Drop table

-- DROP TABLE public.user_oauth_tokens;

CREATE TABLE public.user_oauth_tokens ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, provider varchar(50) DEFAULT 'google'::character varying NULL, access_token text NOT NULL, refresh_token text NULL, expires_at timestamptz NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamptz DEFAULT now() NULL, deleted bool DEFAULT false NOT NULL, CONSTRAINT user_oauth_tokens_pkey PRIMARY KEY (id));


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users ( user_id uuid DEFAULT uuid_generate_v4() NOT NULL, "name" varchar(255) NOT NULL, email varchar(255) NOT NULL, username varchar(20) NOT NULL, "password" varchar(255) NOT NULL, avatar_url varchar NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamp NULL, last_login timestamp NULL, email_verified bool DEFAULT false NOT NULL, deleted bool DEFAULT false NOT NULL, auth_with_google bool DEFAULT false NULL, google_id varchar(255) NULL, auth_with_github bool NULL, github_id varchar(255) NULL, theme_mode public."theme_mode_pattern" DEFAULT 'dark'::theme_mode_pattern NOT NULL, phone_number varchar(20) NULL, birth_date date NULL, private_profile bool DEFAULT false NOT NULL, email_verified_at timestamptz NULL, timezone varchar(100) NULL, org_id uuid NULL, plan_id uuid NULL, user_preference jsonb DEFAULT '{}'::jsonb NOT NULL, CONSTRAINT phone_number UNIQUE (phone_number), CONSTRAINT users_email_key UNIQUE (email), CONSTRAINT users_pkey PRIMARY KEY (user_id), CONSTRAINT users_username_key UNIQUE (username));
CREATE UNIQUE INDEX users_github_id_idx ON public.users USING btree (github_id);
CREATE UNIQUE INDEX users_google_id_idx ON public.users USING btree (google_id);


-- public.ai_agent_actions foreign keys

ALTER TABLE public.ai_agent_actions ADD CONSTRAINT ai_agent_actions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.ai_agent_actions ADD CONSTRAINT ai_agent_actions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;
ALTER TABLE public.ai_agent_actions ADD CONSTRAINT fk_agent_action_session FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.ai_agent_actions ADD CONSTRAINT fk_agent_action_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


-- public.ai_chat_messages foreign keys

ALTER TABLE public.ai_chat_messages ADD CONSTRAINT ai_chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.ai_chat_messages ADD CONSTRAINT ai_chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;
ALTER TABLE public.ai_chat_messages ADD CONSTRAINT fk_chat_message_session FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.ai_chat_messages ADD CONSTRAINT fk_chat_message_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


-- public.ai_chat_sessions foreign keys

ALTER TABLE public.ai_chat_sessions ADD CONSTRAINT ai_chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;
ALTER TABLE public.ai_chat_sessions ADD CONSTRAINT fk_chat_session_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


-- public.ai_user_agent foreign keys

ALTER TABLE public.ai_user_agent ADD CONSTRAINT fk_ai_user_agent_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


-- public.api_tokens foreign keys

ALTER TABLE public.api_tokens ADD CONSTRAINT api_tokens_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.api_tokens ADD CONSTRAINT api_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


-- public.blocks foreign keys

ALTER TABLE public.blocks ADD CONSTRAINT blocks_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;
ALTER TABLE public.blocks ADD CONSTRAINT blocks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.blocks(id) ON DELETE CASCADE;
ALTER TABLE public.blocks ADD CONSTRAINT blocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


-- public.calendar_event_invites foreign keys

ALTER TABLE public.calendar_event_invites ADD CONSTRAINT fk_invite_event FOREIGN KEY (event_id) REFERENCES public.calendar_events(id) ON DELETE CASCADE;
ALTER TABLE public.calendar_event_invites ADD CONSTRAINT fk_invite_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


-- public.calendar_events foreign keys

ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


-- public.document_collaborators foreign keys

ALTER TABLE public.document_collaborators ADD CONSTRAINT document_collaborators_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;
ALTER TABLE public.document_collaborators ADD CONSTRAINT document_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


-- public.documents foreign keys

ALTER TABLE public.documents ADD CONSTRAINT documents_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(user_id);
ALTER TABLE public.documents ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


-- public.google_calendar_webhooks foreign keys

ALTER TABLE public.google_calendar_webhooks ADD CONSTRAINT google_calendar_webhooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


-- public.jobs foreign keys

ALTER TABLE public.jobs ADD CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


-- public.note_collaborators foreign keys

ALTER TABLE public.note_collaborators ADD CONSTRAINT note_collaborators_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;
ALTER TABLE public.note_collaborators ADD CONSTRAINT note_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


-- public.note_collaborators_logs foreign keys

ALTER TABLE public.note_collaborators_logs ADD CONSTRAINT notes_collab_note_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id);
ALTER TABLE public.note_collaborators_logs ADD CONSTRAINT user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(user_id);


-- public.notes foreign keys

ALTER TABLE public.notes ADD CONSTRAINT notes_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(user_id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD CONSTRAINT notes_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.notes ADD CONSTRAINT notes_priority_id_fkey FOREIGN KEY (priority_id) REFERENCES public.task_priorities(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD CONSTRAINT notes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.notes ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


-- public.notes_comments foreign keys

ALTER TABLE public.notes_comments ADD CONSTRAINT fk_note FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;
ALTER TABLE public.notes_comments ADD CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.notes_comments ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;


-- public.notifications foreign keys

ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES public.users(user_id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


-- public.organization_domains foreign keys

ALTER TABLE public.organization_domains ADD CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- public.organization_invites_members foreign keys

ALTER TABLE public.organization_invites_members ADD CONSTRAINT fk_org_invites_area FOREIGN KEY (area_id) REFERENCES public.organizations_areas(id) ON DELETE SET NULL;
ALTER TABLE public.organization_invites_members ADD CONSTRAINT fk_org_invites_invited_by FOREIGN KEY (invited_by) REFERENCES public.users(user_id) ON DELETE RESTRICT;
ALTER TABLE public.organization_invites_members ADD CONSTRAINT fk_org_invites_org FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- public.organizations foreign keys

ALTER TABLE public.organizations ADD CONSTRAINT fk_organizations_user_id FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;
ALTER TABLE public.organizations ADD CONSTRAINT org_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public."plans"(plan_id);


-- public.organizations_areas foreign keys

ALTER TABLE public.organizations_areas ADD CONSTRAINT organizations_areas_org_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.organizations_areas ADD CONSTRAINT organizations_areas_parent_fk FOREIGN KEY (parent_area_id) REFERENCES public.organizations_areas(id) ON DELETE SET NULL;
ALTER TABLE public.organizations_areas ADD CONSTRAINT organizations_areas_user_creator_id_fk FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE RESTRICT;


-- public.organizations_members foreign keys

ALTER TABLE public.organizations_members ADD CONSTRAINT fk_org_members_area FOREIGN KEY (area_id) REFERENCES public.organizations_areas(id) ON DELETE CASCADE;
ALTER TABLE public.organizations_members ADD CONSTRAINT fk_organization FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.organizations_members ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


-- public.plan_usage_history foreign keys

ALTER TABLE public.plan_usage_history ADD CONSTRAINT fk_plan_usage FOREIGN KEY (plan_usage_id) REFERENCES public.plans_usage(id) ON DELETE CASCADE;


-- public.plans_usage foreign keys

ALTER TABLE public.plans_usage ADD CONSTRAINT fk_org_id FOREIGN KEY (org_id) REFERENCES public.organizations(id);
ALTER TABLE public.plans_usage ADD CONSTRAINT fk_plan_usage_plan FOREIGN KEY (plan_id) REFERENCES public."plans"(plan_id);
ALTER TABLE public.plans_usage ADD CONSTRAINT fk_plan_usage_user FOREIGN KEY (user_id) REFERENCES public.users(user_id);


-- public.project_stages foreign keys

ALTER TABLE public.project_stages ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


-- public.projects foreign keys

ALTER TABLE public.projects ADD CONSTRAINT fk_org_id FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.projects ADD CONSTRAINT parent_project_id_fk FOREIGN KEY (parent_project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


-- public.projects_logs foreign keys

ALTER TABLE public.projects_logs ADD CONSTRAINT fk_project_id FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.projects_logs ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES public.users(user_id);


-- public.projects_members foreign keys

ALTER TABLE public.projects_members ADD CONSTRAINT members_projects_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.projects_members ADD CONSTRAINT projects_members_addedby_fkey FOREIGN KEY (added_by) REFERENCES public.users(user_id);
ALTER TABLE public.projects_members ADD CONSTRAINT projects_members_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


-- public.tags foreign keys

ALTER TABLE public.tags ADD CONSTRAINT tags_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(user_id) ON DELETE SET NULL;
ALTER TABLE public.tags ADD CONSTRAINT tags_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.tags ADD CONSTRAINT tags_projects_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.tags ADD CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


-- public.task_priorities foreign keys

ALTER TABLE public.task_priorities ADD CONSTRAINT task_priorities_projects_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.task_priorities ADD CONSTRAINT tp_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(user_id) ON DELETE SET NULL;
ALTER TABLE public.task_priorities ADD CONSTRAINT tp_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.task_priorities ADD CONSTRAINT tp_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


-- public.tokens foreign keys

ALTER TABLE public.tokens ADD CONSTRAINT tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE ON UPDATE CASCADE;


-- public.user_oauth_tokens foreign keys

ALTER TABLE public.user_oauth_tokens ADD CONSTRAINT "user_oauth_tokens_userId_fk" FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE ON UPDATE CASCADE;


-- public.users foreign keys

ALTER TABLE public.users ADD CONSTRAINT organizations_fkay_id FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD CONSTRAINT users_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public."plans"(plan_id) ON DELETE SET NULL;
