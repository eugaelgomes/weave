
# Database Schema Documentation - Weave Notes

## Overview
Esta documentação descreve a estrutura completa do banco de dados PostgreSQL da aplicação Weave Notes, incluindo tabelas, tipos customizados, relacionamentos e índices.

---

## Schema Principal

```sql
CREATE SCHEMA public AUTHORIZATION pg_database_owner;
```

---

## Custom Types (ENUM)

### 1. access_status_enum
Status de tentativas de acesso ao sistema
```sql
CREATE TYPE public."access_status_enum" AS ENUM (
	'success',   -- Login bem-sucedido
	'failure'    -- Tentativa de login falhou
);
```

### 2. theme_mode_pattern
Preferência de tema do usuário
```sql
CREATE TYPE public."theme_mode_pattern" AS ENUM (
	'dark',   -- Modo escuro
	'light'   -- Modo claro
);
```

### 3. token_type_enum
Tipos de tokens para autenticação e verificação
```sql
CREATE TYPE public."token_type_enum" AS ENUM (
	'password_reset',        -- Recuperação de senha
	'email_verification',    -- Verificação de email
	'access',               -- Token de acesso
	'delete_user_account'   -- Confirmação de exclusão de conta
);
```

### 4. user_log_category
Categorias de logs de atividade do usuário
```sql
CREATE TYPE public."user_log_category" AS ENUM (
	'auth_login',       -- Login no sistema
	'auth_logout',      -- Logout do sistema
	'profile_update',   -- Atualização de perfil
	'security_change',  -- Mudanças de segurança
	'data_export',      -- Exportação de dados
	'system_error'      -- Erros do sistema
);
```

### 5. user_role
Papéis/permissões de usuários em organizações e projetos
```sql
CREATE TYPE public."user_role" AS ENUM (
	'admin',        -- Administrador
	'super_admin',  -- Super administrador
	'member',       -- Membro regular
	'guest'         -- Visitante com acesso limitado
);
```

---

## Sequences

```sql
-- Sequence para mensagens do servidor AI
CREATE SEQUENCE public.aiservermessages_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Sequence para tokens de autenticação
CREATE SEQUENCE public.tokens_token_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
```

---

## Tabelas Principais

### 📋 MÓDULO: PLANOS E ASSINATURAS



#### plans
Definição de planos disponíveis no sistema (free, pro, enterprise, etc)
```sql

CREATE TABLE public.aisessions (
	session_id varchar(255) NOT NULL,
	subject varchar(50) NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	last_activity timestamp DEFAULT now() NOT NULL,
	CONSTRAINT aisessions_pkey PRIMARY KEY (session_id)
);
CREATE INDEX idx_sessions_last_activity ON public.aisessions USING btree (last_activity);
CREATE INDEX idx_sessions_subject ON public.aisessions USING btree (subject);


-- public.blocks_logs definição

-- Drop table

-- DROP TABLE public.blocks_logs;

CREATE TABLE public.blocks_logs (
	log_id uuid DEFAULT uuid_generate_v4() NOT NULL,
	block_id uuid NOT NULL,
	note_id uuid NOT NULL,
	user_id uuid NULL,
	operation text NOT NULL,
	old_data jsonb NULL,
	new_data jsonb NULL,
	changed_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT blocks_logs_pkey PRIMARY KEY (log_id)
);
CREATE INDEX idx_blocks_logs_block_id ON public.blocks_logs USING btree (block_id);
CREATE INDEX idx_blocks_logs_note_id ON public.blocks_logs USING btree (note_id);


-- public."plans" definição

-- Drop table

-- DROP TABLE public."plans";

CREATE TABLE public."plans" (
	plan_id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	details jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	deleted bool DEFAULT false NOT NULL,
	personilized_for_client bool DEFAULT false NOT NULL,
	personilized_client varchar(50) COLLATE "pg_c_utf8" NULL,
	plan_value float8 DEFAULT 0 NULL,
	currency varchar(3) DEFAULT 'BRL'::character varying NOT NULL,
	billing_cycle varchar(20) DEFAULT 'monthly'::character varying NOT NULL,
	gateway_id varchar(255) NULL,
	trial_days int4 DEFAULT 0 NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	description text NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT plans_pkey PRIMARY KEY (plan_id)
);


-- public.sessions definição

-- Drop table

-- DROP TABLE public.sessions;

CREATE TABLE public.sessions (
	sid varchar NOT NULL,
	sess json NOT NULL,
	expire timestamp(6) NOT NULL,
	CONSTRAINT session_pkey PRIMARY KEY (sid)
);


-- public.aiservermessages definição

-- Drop table

-- DROP TABLE public.aiservermessages;

CREATE TABLE public.aiservermessages (
	id serial4 NOT NULL,
	session_id varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	metadata jsonb NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT aiservermessages_pkey PRIMARY KEY (id),
	CONSTRAINT aiservermessages_role_check CHECK (((role)::text = ANY ((ARRAY['system'::character varying, 'user'::character varying, 'assistant'::character varying])::text[]))),
	CONSTRAINT aiservermessages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.aisessions(session_id) ON DELETE CASCADE
);
CREATE INDEX idx_messages_created_at ON public.aiservermessages USING btree (created_at);
CREATE INDEX idx_messages_role ON public.aiservermessages USING btree (role);
CREATE INDEX idx_messages_session_id ON public.aiservermessages USING btree (session_id);


-- public.users definição

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	user_id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	email varchar(255) NOT NULL,
	username varchar(20) NOT NULL,
	"password" varchar(255) NOT NULL,
	avatar_url varchar NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp NULL,
	last_login timestamp NULL,
	email_verified bool DEFAULT false NOT NULL,
	deleted bool DEFAULT false NOT NULL,
	auth_with_google bool DEFAULT false NULL,
	google_id varchar(255) NULL,
	auth_with_github bool NULL,
	github_id varchar(255) NULL,
	theme_mode public."theme_mode_pattern" DEFAULT 'dark'::theme_mode_pattern NOT NULL,
	phone_number varchar(20) NULL,
	birth_date date NULL,
	private_profile bool DEFAULT false NOT NULL,
	email_verified_at timestamptz NULL,
	timezone varchar(100) NULL,
	org_id uuid NULL,
	plan_id uuid NULL,
	CONSTRAINT phone_number UNIQUE (phone_number),
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (user_id),
	CONSTRAINT users_username_key UNIQUE (username),
	CONSTRAINT users_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public."plans"(plan_id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX users_github_id_idx ON public.users USING btree (github_id);
CREATE UNIQUE INDEX users_google_id_idx ON public.users USING btree (google_id);


-- public.users_logs definição

-- Drop table

-- DROP TABLE public.users_logs;

CREATE TABLE public.users_logs (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	log_type public."user_log_category" NOT NULL,
	log jsonb NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT users_logs_pkey PRIMARY KEY (id),
	CONSTRAINT ulogs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE INDEX idx_users_logs_created_at ON public.users_logs USING btree (created_at);
CREATE INDEX idx_users_logs_type ON public.users_logs USING btree (log_type);
CREATE INDEX idx_users_logs_user_id ON public.users_logs USING btree (user_id);


-- public.ai_chat_sessions definição

-- Drop table

-- DROP TABLE public.ai_chat_sessions;

CREATE TABLE public.ai_chat_sessions (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	title varchar(255) DEFAULT 'Nova Conversa'::character varying NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT ai_chat_sessions_pkey PRIMARY KEY (id),
	CONSTRAINT ai_chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
	CONSTRAINT fk_chat_session_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_chat_sessions_updated_at ON public.ai_chat_sessions USING btree (updated_at DESC);
CREATE INDEX idx_chat_sessions_user_id ON public.ai_chat_sessions USING btree (user_id);


-- public.ai_user_agent definição

-- Drop table

-- DROP TABLE public.ai_user_agent;

CREATE TABLE public.ai_user_agent (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	personality jsonb DEFAULT '{}'::jsonb NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT ai_user_agent_pkey PRIMARY KEY (id),
	CONSTRAINT fk_ai_user_agent_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_ai_user_agent_metadata ON public.ai_user_agent USING gin (personality);
CREATE INDEX idx_ai_user_agent_user_id ON public.ai_user_agent USING btree (user_id);

-- Table Triggers

create trigger trg_ai_user_agent_updated_at before
update
    on
    public.ai_user_agent for each row execute function update_updated_at_column();


-- public.jobs definição

-- Drop table

-- DROP TABLE public.jobs;

CREATE TABLE public.jobs (
	id varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	status varchar(20) DEFAULT 'pending'::character varying NOT NULL,
	created_at timestamp DEFAULT now() NULL,
	started_at timestamp NULL,
	completed_at timestamp NULL,
	progress int4 DEFAULT 0 NULL,
	"error" text NULL,
	"result" jsonb NULL,
	metadata jsonb NULL,
	user_id uuid NOT NULL,
	CONSTRAINT jobs_pkey PRIMARY KEY (id),
	CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE INDEX idx_jobs_created_at ON public.jobs USING btree (created_at);
CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);


-- public.organizations definição

-- Drop table

-- DROP TABLE public.organizations;

CREATE TABLE public.organizations (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	org_name varchar(50) DEFAULT 'New Organization'::text NOT NULL,
	unique_name varchar(30) NOT NULL,
	logo_url varchar NULL,
	banner_url varchar NULL,
	description text DEFAULT 'Type description here...'::text NULL,
	basic_properties jsonb DEFAULT '{}'::jsonb NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	deleted bool DEFAULT false NOT NULL,
	org_domains _text NULL,
	settings jsonb DEFAULT '{}'::jsonb NOT NULL,
	"plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	address jsonb DEFAULT '{}'::jsonb NULL,
	user_id uuid NOT NULL,
	delete_at timestamptz NULL,
	deleted_by uuid NULL,
	plan_id uuid DEFAULT '4227a4fe-11bd-4a73-a78a-334543076891'::uuid NOT NULL,
	branding_properties jsonb DEFAULT '{}'::jsonb NULL,
	integrations jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT organizations_pkey PRIMARY KEY (id),
	CONSTRAINT fk_organizations_user_id FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
	CONSTRAINT org_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public."plans"(plan_id)
);


-- public.organizations_members definição

-- Drop table

-- DROP TABLE public.organizations_members;

CREATE TABLE public.organizations_members (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	org_id uuid NOT NULL,
	user_id uuid NOT NULL,
	"role" public."user_role" NOT NULL,
	status varchar(50) DEFAULT 'active'::character varying NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp NULL,
	invited_by uuid NOT NULL,
	deleted bool DEFAULT false NOT NULL,
	suspended bool DEFAULT false NOT NULL,
	CONSTRAINT organizations_members_pkey PRIMARY KEY (id),
	CONSTRAINT uq_organization_user UNIQUE (org_id, user_id),
	CONSTRAINT fk_organization FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
	CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_org_members_org_id ON public.organizations_members USING btree (org_id);
CREATE INDEX idx_org_members_user_id ON public.organizations_members USING btree (user_id);

-- Table Triggers

create trigger update_organizations_members_modtime before
update
    on
    public.organizations_members for each row execute function update_updated_at_column();


-- public.plans_usage definição

-- Drop table

-- DROP TABLE public.plans_usage;

CREATE TABLE public.plans_usage (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	plan_id uuid NOT NULL,
	client_type text NOT NULL,
	user_id uuid NULL,
	org_id uuid NULL,
	usage_details jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	last_reset_at timestamptz DEFAULT now() NULL,
	lifetime_stats jsonb DEFAULT '{"peak_usage_month": null, "total_notes_ever": 0, "first_activity_at": null, "total_months_active": 0, "total_projects_ever": 0, "total_storage_used_mb": 0, "total_ai_messages_ever": 0}'::jsonb NULL,
	is_trial bool DEFAULT false NULL,
	trial_ends_at timestamptz NULL,
	downgrade_scheduled_to uuid NULL,
	downgrade_effective_at timestamptz NULL,
	period_start timestamptz NULL,
	period_end timestamptz NULL,
	CONSTRAINT plans_usage_pkey PRIMARY KEY (id),
	CONSTRAINT fk_org_id FOREIGN KEY (org_id) REFERENCES public.organizations(id),
	CONSTRAINT fk_plan_usage_plan FOREIGN KEY (plan_id) REFERENCES public."plans"(plan_id),
	CONSTRAINT fk_plan_usage_user FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);


-- public.projects definição

-- Drop table

-- DROP TABLE public.projects;

CREATE TABLE public.projects (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	title text DEFAULT 'The new project'::text NOT NULL,
	description text DEFAULT 'Type description here...'::text NULL,
	properties jsonb DEFAULT '{}'::jsonb NULL,
	status text DEFAULT 'open'::text NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	deleted bool DEFAULT false NOT NULL,
	collaborators jsonb NULL,
	associated_notes jsonb NULL,
	org_id uuid NULL,
	CONSTRAINT projects_pkey PRIMARY KEY (id),
	CONSTRAINT fk_org_id FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
	CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);


-- public.projects_logs definição

-- Drop table

-- DROP TABLE public.projects_logs;

CREATE TABLE public.projects_logs (
	log_id uuid DEFAULT uuid_generate_v4() NOT NULL,
	project_id uuid NOT NULL,
	user_id uuid NULL,
	operation text NOT NULL,
	old_data jsonb NULL,
	new_data jsonb NULL,
	changed_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT projects_logs_pkey PRIMARY KEY (log_id),
	CONSTRAINT fk_project_id FOREIGN KEY (project_id) REFERENCES public.projects(id),
	CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE INDEX idx_projects_logs_changed_at ON public.projects_logs USING btree (changed_at);
CREATE INDEX idx_projects_logs_project_id ON public.projects_logs USING btree (project_id);


-- public.projects_members definição

-- Drop table

-- DROP TABLE public.projects_members;

CREATE TABLE public.projects_members (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	project_id uuid NOT NULL,
	user_id uuid NOT NULL,
	"role" public."user_role" NOT NULL,
	deleted bool DEFAULT false NOT NULL,
	suspended bool DEFAULT false NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	added_by uuid NOT NULL,
	CONSTRAINT projects_members_pkey PRIMARY KEY (id),
	CONSTRAINT members_projects_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
	CONSTRAINT projects_members_addedby_fkey FOREIGN KEY (added_by) REFERENCES public.users(user_id),
	CONSTRAINT projects_members_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);


-- public.tokens definição

-- Drop table

-- DROP TABLE public.tokens;

CREATE TABLE public.tokens (
	token_id serial4 NOT NULL,
	user_id uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"type" public."token_type_enum" NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	expires_at timestamp NOT NULL,
	active bool DEFAULT true NULL,
	data_to_update jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT tokens_pkey PRIMARY KEY (token_id),
	CONSTRAINT tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_token ON public.tokens USING btree (token);
CREATE INDEX idx_user_token ON public.tokens USING btree (user_id, type, active);


-- public.ai_agent_actions definição

-- Drop table

-- DROP TABLE public.ai_agent_actions;

CREATE TABLE public.ai_agent_actions (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	session_id uuid NULL,
	action_type varchar(50) NOT NULL,
	status varchar(20) DEFAULT 'pending'::character varying NOT NULL,
	input_data jsonb NOT NULL,
	output_data jsonb DEFAULT '{}'::jsonb NULL,
	error_message text NULL,
	entity_type varchar(50) NULL,
	entity_id uuid NULL,
	model varchar(50) NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	completed_at timestamptz NULL,
	CONSTRAINT ai_agent_actions_pkey PRIMARY KEY (id),
	CONSTRAINT ai_agent_actions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'success'::character varying, 'failed'::character varying])::text[]))),
	CONSTRAINT ai_agent_actions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(id) ON DELETE SET NULL,
	CONSTRAINT ai_agent_actions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
	CONSTRAINT fk_agent_action_session FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(id) ON DELETE SET NULL,
	CONSTRAINT fk_agent_action_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_agent_actions_action_type ON public.ai_agent_actions USING btree (action_type);
CREATE INDEX idx_agent_actions_created_at ON public.ai_agent_actions USING btree (created_at DESC);
CREATE INDEX idx_agent_actions_entity ON public.ai_agent_actions USING btree (entity_type, entity_id);
CREATE INDEX idx_agent_actions_session_id ON public.ai_agent_actions USING btree (session_id);
CREATE INDEX idx_agent_actions_status ON public.ai_agent_actions USING btree (status);
CREATE INDEX idx_agent_actions_user_id ON public.ai_agent_actions USING btree (user_id);


-- public.ai_chat_messages definição

-- Drop table

-- DROP TABLE public.ai_chat_messages;

CREATE TABLE public.ai_chat_messages (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	session_id uuid NOT NULL,
	user_id uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	model varchar(50) NOT NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT ai_chat_messages_pkey PRIMARY KEY (id),
	CONSTRAINT ai_chat_messages_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying])::text[]))),
	CONSTRAINT ai_chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
	CONSTRAINT ai_chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
	CONSTRAINT fk_chat_message_session FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
	CONSTRAINT fk_chat_message_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_chat_messages_session_id ON public.ai_chat_messages USING btree (session_id);
CREATE INDEX idx_chat_messages_user_id ON public.ai_chat_messages USING btree (user_id);


-- public.invite_org_members definição

-- Drop table

-- DROP TABLE public.invite_org_members;

CREATE TABLE public.invite_org_members (
	invite_id uuid DEFAULT uuid_generate_v4() NOT NULL,
	org_id uuid NOT NULL,
	"name" varchar(255) NULL,
	email varchar(255) NOT NULL,
	username varchar(255) NULL,
	"role" varchar(50) DEFAULT 'member'::character varying NOT NULL,
	invite_verified bool DEFAULT false NOT NULL,
	deleted bool DEFAULT false NOT NULL,
	invited_by uuid NOT NULL,
	expires_at timestamp NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT check_valid_role CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying, 'viewer'::character varying])::text[]))),
	CONSTRAINT invite_org_members_pkey PRIMARY KEY (invite_id),
	CONSTRAINT fk_invite_org FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
	CONSTRAINT fk_invited_by FOREIGN KEY (invited_by) REFERENCES public.users(user_id) ON DELETE SET NULL
);
CREATE INDEX idx_invite_org_members_active ON public.invite_org_members USING btree (deleted, invite_verified);
CREATE INDEX idx_invite_org_members_email ON public.invite_org_members USING btree (email);
CREATE INDEX idx_invite_org_members_org_id ON public.invite_org_members USING btree (org_id);
CREATE INDEX idx_invite_org_members_verified ON public.invite_org_members USING btree (invite_verified);

-- Table Triggers

create trigger trigger_update_invite_org_members_updated_at before
update
    on
    public.invite_org_members for each row execute function update_invite_org_members_updated_at();


-- public.notes definição

-- Drop table

-- DROP TABLE public.notes;

CREATE TABLE public.notes (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	title text NOT NULL,
	description text NULL,
	tags _text NULL,
	deleted bool DEFAULT false NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	status varchar(10) DEFAULT 'open'::text NULL,
	properties jsonb DEFAULT '{}'::jsonb NULL,
	project_id uuid NULL,
	org_id uuid NULL,
	deleted_at timestamptz(6) NULL,
	files jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT notes_pkey PRIMARY KEY (id),
	CONSTRAINT notes_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
	CONSTRAINT notes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
	CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_notes_user ON public.notes USING btree (user_id);


-- public.plan_usage_history definição

-- Drop table

-- DROP TABLE public.plan_usage_history;

CREATE TABLE public.plan_usage_history (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	plan_usage_id uuid NOT NULL,
	user_id uuid NOT NULL,
	org_id uuid NULL,
	plan_id uuid NOT NULL,
	period_start timestamptz NOT NULL,
	period_end timestamptz NOT NULL,
	final_usage_details jsonb NOT NULL,
	total_notes_created int4 DEFAULT 0 NULL,
	total_projects_created int4 DEFAULT 0 NULL,
	total_ai_messages int4 DEFAULT 0 NULL,
	total_storage_mb numeric(10, 2) DEFAULT 0 NULL,
	total_exports int4 DEFAULT 0 NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT plan_usage_history_pkey PRIMARY KEY (id),
	CONSTRAINT fk_plan_usage FOREIGN KEY (plan_usage_id) REFERENCES public.plans_usage(id) ON DELETE CASCADE
);
CREATE INDEX idx_usage_history_period ON public.plan_usage_history USING btree (period_end DESC);
CREATE INDEX idx_usage_history_plan_usage ON public.plan_usage_history USING btree (plan_usage_id);
CREATE INDEX idx_usage_history_user ON public.plan_usage_history USING btree (user_id);


-- public.blocks definição

-- Drop table

-- DROP TABLE public.blocks;

CREATE TABLE public.blocks (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	note_id uuid NOT NULL,
	user_id uuid NOT NULL,
	parent_id uuid NULL,
	"type" text NULL,
	"text" text NULL,
	properties jsonb DEFAULT '{}'::jsonb NULL,
	done bool NULL,
	deleted bool DEFAULT false NULL,
	"position" int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT blocks_pkey PRIMARY KEY (id),
	CONSTRAINT blocks_type_check CHECK ((type = ANY (ARRAY['text'::text, 'todo'::text, 'list'::text, 'page'::text, 'heading'::text, 'paragraph'::text, 'quote'::text, 'code'::text]))),
	CONSTRAINT blocks_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE,
	CONSTRAINT blocks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.blocks(id) ON DELETE CASCADE,
	CONSTRAINT blocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);


-- public.note_collaborators definição

-- Drop table

-- DROP TABLE public.note_collaborators;

CREATE TABLE public.note_collaborators (
	note_id uuid NOT NULL,
	user_id uuid NOT NULL,
	added_at timestamp DEFAULT now() NOT NULL,
	removed_at timestamp(6) NULL,
	removed bool DEFAULT false NULL,
	removed_by varchar(6) NULL,
	CONSTRAINT note_collaborators_pkey PRIMARY KEY (note_id, user_id),
	CONSTRAINT note_collaborators_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE,
	CONSTRAINT note_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);


-- public.note_collaborators_logs definição

-- Drop table

-- DROP TABLE public.note_collaborators_logs;

CREATE TABLE public.note_collaborators_logs (
	log_id uuid DEFAULT uuid_generate_v4() NOT NULL,
	note_id uuid NOT NULL,
	target_user_id uuid NOT NULL,
	operation text NOT NULL,
	data_snapshot jsonb NOT NULL,
	changed_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT note_collaborators_logs_pkey PRIMARY KEY (log_id),
	CONSTRAINT notes_collab_note_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id),
	CONSTRAINT user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(user_id)
);
CREATE INDEX idx_note_collab_logs_composite ON public.note_collaborators_logs USING btree (note_id, target_user_id);



-- DROP FUNCTION public.trigger_audit_log();

CREATE OR REPLACE FUNCTION public.trigger_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    target_table text;
BEGIN
    -- Define o nome da tabela de log baseado na tabela de origem
    target_table := projects || '_logs';
    
    IF (TG_OP = 'DELETE') THEN
        EXECUTE format('INSERT INTO %I (project_id, operation, old_data, changed_at) VALUES ($1, $2, $3, $4)', target_table)
        USING OLD.id, 'DELETE', row_to_json(OLD), now();
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        EXECUTE format('INSERT INTO %I (project_id, operation, old_data, new_data, changed_at) VALUES ($1, $2, $3, $4, $5)', target_table)
        USING NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), now();
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        EXECUTE format('INSERT INTO %I (project_id, operation, new_data, changed_at) VALUES ($1, $2, $3, $4)', target_table)
        USING NEW.id, 'INSERT', row_to_json(NEW), now();
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$function$
;

-- DROP FUNCTION public.update_invite_org_members_updated_at();

CREATE OR REPLACE FUNCTION public.update_invite_org_members_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$
;

-- DROP FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

-- DROP FUNCTION public.uuid_generate_v1();

CREATE OR REPLACE FUNCTION public.uuid_generate_v1()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$
;

-- DROP FUNCTION public.uuid_generate_v1mc();

CREATE OR REPLACE FUNCTION public.uuid_generate_v1mc()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$
;

-- DROP FUNCTION public.uuid_generate_v3(uuid, text);

CREATE OR REPLACE FUNCTION public.uuid_generate_v3(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$
;

-- DROP FUNCTION public.uuid_generate_v4();

CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$
;

-- DROP FUNCTION public.uuid_generate_v5(uuid, text);

CREATE OR REPLACE FUNCTION public.uuid_generate_v5(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$
;

-- DROP FUNCTION public.uuid_nil();

CREATE OR REPLACE FUNCTION public.uuid_nil()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_nil$function$
;

-- DROP FUNCTION public.uuid_ns_dns();

CREATE OR REPLACE FUNCTION public.uuid_ns_dns()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$
;

-- DROP FUNCTION public.uuid_ns_oid();

CREATE OR REPLACE FUNCTION public.uuid_ns_oid()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$
;

-- DROP FUNCTION public.uuid_ns_url();

CREATE OR REPLACE FUNCTION public.uuid_ns_url()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_url$function$
;

-- DROP FUNCTION public.uuid_ns_x500();

CREATE OR REPLACE FUNCTION public.uuid_ns_x500()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$
;