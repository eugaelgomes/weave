-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "billing_cycle_enum" AS ENUM ('MONTHLY', 'YEARLY', 'LIFETIME');

-- CreateEnum
CREATE TYPE "domain_verification_status" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "invite_role" AS ENUM ('ORGANIZER', 'REQUIRED', 'OPTIONAL', 'RESOURCE');

-- CreateEnum
CREATE TYPE "invite_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE');

-- CreateEnum
CREATE TYPE "user_status_enum" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_INVITE');

-- CreateEnum
CREATE TYPE "ai_prompts_status" AS ENUM ('VISIBLE', 'SECURE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "notification_entity_type_enum" AS ENUM ('WORKSPACE', 'PROJECT', 'NOTE', 'JOB', 'WEAVE-AI');

-- CreateEnum
CREATE TYPE "notification_type_enum" AS ENUM ('SYSTEM_ALERT', 'SYSTEM_UPDATE', 'WORKSPACE_INVITE', 'WORKSPACE_ACTION', 'PROJECT_INVITE', 'PROJECT_ACTION', 'NOTE_SHARED', 'NOTE_ACTION', 'AI_ACTION', 'JOB_ACTION');

-- CreateEnum
CREATE TYPE "oauth_provider_enum" AS ENUM ('GOOGLE', 'GITHUB', 'MICROSOFT', 'APPLE');

-- CreateEnum
CREATE TYPE "workspace_member_status_enum" AS ENUM ('ACTIVE', 'PENDING', 'INVITED', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "workspace_status_enum" AS ENUM ('ACTIVE', 'SUSPENDED', 'PAST_DUE', 'PENDING');

-- CreateEnum
CREATE TYPE "workspace_visibility_enum" AS ENUM ('PRIVATE', 'WORKSPACE_WIDE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "sync_status" AS ENUM ('PENDING', 'SYNCED', 'FAILED', 'OUT_OF_SYNC');

-- CreateEnum
CREATE TYPE "theme_mode_pattern" AS ENUM ('DARK', 'LIGHT');

-- CreateEnum
CREATE TYPE "token_type_enum" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFICATION', 'LOGIN_CODE', 'ACCESS', 'DELETE_USER_ACCOUNT', 'BACKUP_DOWNLOAD');

-- CreateEnum
CREATE TYPE "user_log_category" AS ENUM ('AUTH_LOGIN', 'AUTH_LOGOUT', 'PROFILE_UPDATE', 'SECURITY_CHANGE', 'DATA_EXPORT', 'SYSTEM_ERROR');

-- CreateTable
CREATE TABLE "credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "encrypted_data" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_token_usage_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "api_token_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_id" UUID,
    "request_id" VARCHAR(100),
    "endpoint" VARCHAR(255) NOT NULL,
    "http_method" VARCHAR(10) NOT NULL,
    "status_code" SMALLINT NOT NULL,
    "success" BOOLEAN,
    "error_message" TEXT,
    "latency_ms" INTEGER,
    "ip_address" INET,
    "metadata" JSONB,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_token_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "key_prefix" VARCHAR(50) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_id" UUID,
    "scopes" TEXT[] DEFAULT ARRAY['read']::TEXT[],
    "description" VARCHAR(255),
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "budget_usd" DECIMAL(10,4),
    "spend_usd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "max_rpm" INTEGER,
    "max_tpm" INTEGER,
    "allowed_models" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_settings" (
    "workspace_id" UUID NOT NULL,
    "saml" JSONB NOT NULL DEFAULT '{}',
    "domains" JSONB NOT NULL DEFAULT '{}',
    "tracing" JSONB NOT NULL DEFAULT '{}',
    "branding" JSONB NOT NULL DEFAULT '{}',
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "integrations" JSONB NOT NULL DEFAULT '{}',
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_settings_pkey" PRIMARY KEY ("workspace_id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "workspace_member_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "invited_by" UUID,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "removed_at" TIMESTAMPTZ(6),
    "removed_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_member_roles" (
    "workspace_member_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "workspace_member_roles_pkey" PRIMARY KEY ("workspace_member_id","role_id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_id" VARCHAR(30) NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_name" VARCHAR(80) NOT NULL DEFAULT 'New Workspace',
    "unique_name" VARCHAR(40) NOT NULL,
    "logo_url" TEXT,
    "banner_url" TEXT,
    "description" TEXT DEFAULT 'Type description here...',
    "plan_id" UUID,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "workspace_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "stripe_customer_id" VARCHAR(255),
    "billing_email" VARCHAR(255),
    "country" VARCHAR(2),
    "public_workspace_id" TEXT NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_api_request_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "api_token_id" UUID,
    "user_id" UUID,
    "workspace_id" UUID,
    "http_method" VARCHAR(10) NOT NULL,
    "path" TEXT NOT NULL,
    "api_version" VARCHAR(10) NOT NULL DEFAULT 'v1',
    "scopes_required" TEXT[],
    "status_code" SMALLINT NOT NULL,
    "duration_ms" INTEGER,
    "error_code" VARCHAR(64),
    "request_id" UUID,
    "ip_address" INET,
    "user_agent" TEXT,
    "origin_header" TEXT,
    "referer_header" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_api_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,
    "user_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_active" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "api_type" VARCHAR(20),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "workspaces_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "type" "token_type_enum" NOT NULL,
    "code" VARCHAR(20),
    "data_to_update" JSONB DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "used_at" TIMESTAMPTZ(6),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "log_type" "user_log_category" NOT NULL,
    "log" JSONB,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_oauth_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "oauth_provider_enum" NOT NULL DEFAULT 'GOOGLE',
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "avatar_url" TEXT,
    "auth_with_google" BOOLEAN NOT NULL DEFAULT false,
    "google_id" VARCHAR(255),
    "auth_with_github" BOOLEAN NOT NULL DEFAULT false,
    "github_id" VARCHAR(255),
    "theme_mode" "theme_mode_pattern" NOT NULL DEFAULT 'DARK',
    "phone_number" VARCHAR(20),
    "birth_date" DATE,
    "private_profile" BOOLEAN NOT NULL DEFAULT false,
    "timezone" VARCHAR(100),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ(6),
    "last_login" TIMESTAMPTZ(6),
    "workspace_id" UUID,
    "plan_id" UUID,
    "user_preference" JSONB NOT NULL DEFAULT '{}',
    "onboarding_state" JSONB NOT NULL DEFAULT '{"step": "REGISTERED", "completed_steps": [], "metadata": {}}',
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "user_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "auth_with_microsoft" BOOLEAN DEFAULT false,
    "microsoft_id" TEXT,
    "public_user_id" TEXT NOT NULL,
    "auth_with_saml" BOOLEAN DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_id" VARCHAR(30) NOT NULL,
    "workspace_id" UUID NOT NULL,
    "parent_team_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" JSONB DEFAULT '{}',
    "color" VARCHAR(7),
    "visibility" "workspace_visibility_enum" NOT NULL DEFAULT 'PRIVATE',
    "properties" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "added_by" UUID,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_artifacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID,
    "user_id" UUID NOT NULL,
    "session_id" UUID,
    "title" VARCHAR(255) NOT NULL DEFAULT 'Untitled Document',
    "type" VARCHAR(50) NOT NULL DEFAULT 'document',
    "content" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT,
    "model" VARCHAR(50),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "request_id" UUID,
    "provider" VARCHAR(40),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ok',
    "error_code" VARCHAR(80),
    "error_message" TEXT,
    "latency_ms" INTEGER,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "total_tokens" INTEGER,
    "agent_id" UUID,
    "allow_edit" BOOLEAN DEFAULT false,
    "parent_message_id" UUID,
    "tool_calls" JSONB,
    "tool_call_id" VARCHAR(255),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "workspace_id" UUID,
    "user_feedback_rating" VARCHAR(50),
    "user_feedback_comment" TEXT,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL DEFAULT 'Nova Conversa',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMPTZ(6),
    "last_model" VARCHAR(80),
    "last_provider" VARCHAR(40),
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" BIGINT NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "workspace_id" UUID,
    "team_id" UUID,
    "note_id" UUID,
    "context" JSONB NOT NULL DEFAULT '{}',
    "share_token" VARCHAR(255),

    CONSTRAINT "ai_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_mcp_servers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "transport" VARCHAR(20) NOT NULL DEFAULT 'stdio',
    "url" VARCHAR(255),
    "command" VARCHAR(255),
    "config" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_mcp_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_custom_tools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "workspace_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "webhook_url" TEXT,
    "method" VARCHAR(10) DEFAULT 'POST',
    "headers" JSONB DEFAULT '{}',
    "payload_schema" JSONB DEFAULT '{}',
    "type" VARCHAR(50) NOT NULL DEFAULT 'api',
    "mcp_server_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ai_custom_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_llm_models" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" VARCHAR(100) NOT NULL,
    "provider_id" VARCHAR(50) NOT NULL,
    "provider_name" VARCHAR(100) NOT NULL,
    "logo_url" VARCHAR(255),
    "name" VARCHAR(100) NOT NULL,
    "version" VARCHAR(50),
    "description" TEXT,
    "context_window" INTEGER,
    "max_output_tokens" INTEGER,
    "supported_for_agents" BOOLEAN DEFAULT true,
    "features" JSONB DEFAULT '[]',
    "tags" JSONB DEFAULT '[]',
    "reasoning_levels" JSONB DEFAULT '["none"]',
    "deprecated" BOOLEAN DEFAULT false,
    "cost_per_1k_input" DECIMAL(12,6),
    "cost_per_1k_output" DECIMAL(12,6),
    "rpm_limit" INTEGER,
    "tpm_limit" INTEGER,
    "is_vision_supported" BOOLEAN DEFAULT false,
    "is_tool_calling_supported" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_llm_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_llms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "workspace_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "api_key" TEXT NOT NULL,
    "temperature" DECIMAL(3,2) DEFAULT 0.7,
    "max_tokens" INTEGER,
    "reasoning_effort" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ai_llms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_user_agent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "personality" JSONB NOT NULL DEFAULT '{}',
    "knowledge_files" JSONB NOT NULL DEFAULT '[]',
    "shared_with" JSONB NOT NULL DEFAULT '[]',
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(100) NOT NULL DEFAULT 'Unnamed Agent',
    "description" TEXT,
    "team_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "llm_config_id" UUID,
    "tools" JSONB DEFAULT '[]',

    CONSTRAINT "ai_user_agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_prompt_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_id" UUID,
    "team_id" UUID,
    "parent_id" UUID,
    "title" TEXT NOT NULL DEFAULT 'Set note title',
    "description" TEXT DEFAULT 'Write note description here',
    "document" JSONB NOT NULL DEFAULT '{"type": "doc", "content": [{"type": "paragraph"}]}',
    "properties" JSONB DEFAULT '{}',
    "tags" UUID[] DEFAULT ARRAY[]::UUID[],
    "status" "ai_prompts_status" DEFAULT 'VISIBLE',
    "due_date" TIMESTAMPTZ(6),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "embedding" vector,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ai_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "connections" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "execution_data" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "method" VARCHAR(10) NOT NULL DEFAULT 'POST',
    "auth_type" VARCHAR(50) NOT NULL DEFAULT 'none',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "job_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" VARCHAR(50) NOT NULL,
    "user_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "result" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "workflow_collaborators" (
    "workflow_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "removed_at" TIMESTAMPTZ(6),
    "removed_by" UUID,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "ai_promptsId" UUID,

    CONSTRAINT "workflow_collaborators_pkey" PRIMARY KEY ("workflow_id","user_id")
);

-- CreateTable
CREATE TABLE "workflow_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "user_id" UUID,
    "workspace_id" UUID,
    "parent_id" UUID,
    "content" JSONB NOT NULL,
    "files" JSONB DEFAULT '[]',
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "ai_promptsId" UUID,

    CONSTRAINT "workflow_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_limit_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id" UUID NOT NULL,
    "subscriber_type" TEXT NOT NULL,
    "subscriber_id" UUID NOT NULL,
    "override_details" JSONB NOT NULL DEFAULT '{}',
    "reason" TEXT,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_limit_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_usage_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_usage_id" UUID NOT NULL,
    "user_id" UUID,
    "workspace_id" UUID,
    "plan_id" UUID NOT NULL,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "final_usage_details" JSONB NOT NULL,
    "applied_plan_snapshot" JSONB NOT NULL DEFAULT '{}',
    "applied_plan_version" INTEGER NOT NULL DEFAULT 1,
    "total_notes_created" INTEGER NOT NULL DEFAULT 0,
    "total_projects_created" INTEGER NOT NULL DEFAULT 0,
    "total_ai_messages" INTEGER NOT NULL DEFAULT 0,
    "total_storage_mb" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_exports" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_usage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_usages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id" UUID NOT NULL,
    "subscriber_type" TEXT NOT NULL,
    "subscriber_id" UUID NOT NULL,
    "client_type" TEXT NOT NULL,
    "user_id" UUID,
    "workspace_id" UUID,
    "usage_details" JSONB NOT NULL DEFAULT '{}',
    "applied_plan_snapshot" JSONB NOT NULL DEFAULT '{}',
    "applied_plan_version" INTEGER NOT NULL DEFAULT 1,
    "lifetime_stats" JSONB NOT NULL DEFAULT '{}',
    "last_reset_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "plan_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "plan_version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "plan_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscriber_type" TEXT NOT NULL,
    "subscriber_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "provider" VARCHAR(30) NOT NULL DEFAULT 'internal',
    "provider_customer_id" TEXT,
    "provider_subscription_id" TEXT,
    "current_period_start" TIMESTAMPTZ(6) NOT NULL,
    "current_period_end" TIMESTAMPTZ(6) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMPTZ(6),
    "trial_start" TIMESTAMPTZ(6),
    "trial_end" TIMESTAMPTZ(6),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "plan_usage_id" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spans" (
    "id" UUID NOT NULL,
    "trace_id" UUID NOT NULL,
    "parent_span_id" UUID,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "span_type" VARCHAR(50) NOT NULL,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6),
    "status" VARCHAR(50) DEFAULT 'running',
    "input" JSONB DEFAULT '{}',
    "output" JSONB DEFAULT '{}',
    "error_message" TEXT,
    "prompt_tokens" INTEGER DEFAULT 0,
    "completion_tokens" INTEGER DEFAULT 0,
    "model" VARCHAR(255),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traces" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "team_id" UUID,
    "user_id" UUID,
    "session_id" VARCHAR(255),
    "name" VARCHAR(255) NOT NULL,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6),
    "status" VARCHAR(50) DEFAULT 'running',
    "total_tokens" INTEGER DEFAULT 0,
    "total_cost" DECIMAL(10,6) DEFAULT 0.000000,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trace_id" UUID NOT NULL,
    "observation_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "source" VARCHAR(50) NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "actor_id" UUID,
    "type" "notification_type_enum" NOT NULL,
    "entity_type" "notification_entity_type_enum" NOT NULL,
    "entity_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "in_trash" BOOLEAN NOT NULL DEFAULT false,
    "trashed_at" TIMESTAMPTZ(6),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "storage_config" JSONB DEFAULT '{}',
    "smtp_config" JSONB DEFAULT '{}',
    "oauth_config" JSONB DEFAULT '{}',
    "ai_global_config" JSONB DEFAULT '{}',
    "instance_branding" JSONB DEFAULT '{}',
    "rate_limit_config" JSONB DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "team_id" UUID,
    "user_id" UUID,
    "name" VARCHAR(30) NOT NULL,
    "color_hex" VARCHAR(7) DEFAULT '#E2E8F0',
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_credentials_workspace" ON "credentials"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_credentials_user" ON "credentials"("user_id");

-- CreateIndex
CREATE INDEX "idx_api_token_usage_logs_created_at" ON "api_token_usage_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_api_token_usage_logs_metadata" ON "api_token_usage_logs" USING GIN ("metadata");

-- CreateIndex
CREATE INDEX "idx_api_token_usage_logs_token" ON "api_token_usage_logs"("api_token_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_api_token_usage_logs_user_workspace" ON "api_token_usage_logs"("user_id", "workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_key_prefix_key" ON "api_tokens"("key_prefix");

-- CreateIndex
CREATE INDEX "idx_api_tokens_key_prefix" ON "api_tokens"("key_prefix");

-- CreateIndex
CREATE INDEX "idx_api_tokens_user_workspace" ON "api_tokens"("user_id", "workspace_id");

-- CreateIndex
CREATE INDEX "idx_workspace_members_workspace_id" ON "workspace_members"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_workspace_members_user_id" ON "workspace_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_workspace_user" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_wm_roles_member" ON "workspace_member_roles"("workspace_member_id");

-- CreateIndex
CREATE INDEX "idx_wm_roles_role" ON "workspace_member_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_public_id_key" ON "workspaces"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_unique_name_key" ON "workspaces"("unique_name");

-- CreateIndex
CREATE INDEX "idx_sessions_expire" ON "sessions"("expire");

-- CreateIndex
CREATE INDEX "idx_sessions_last_active" ON "sessions"("last_active");

-- CreateIndex
CREATE INDEX "idx_sessions_user_id" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_roles_workspace_id_name_key" ON "workspaces_roles"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "idx_tokens_token" ON "tokens"("token");

-- CreateIndex
CREATE INDEX "idx_tokens_lookup" ON "tokens"("user_id", "type", "active");

-- CreateIndex
CREATE INDEX "idx_tokens_code_lookup" ON "tokens"("code", "type", "active");

-- CreateIndex
CREATE INDEX "idx_user_logs_created_at" ON "user_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_user_logs_user_id" ON "user_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_public_user_id_idx" ON "users"("public_user_id");

-- CreateIndex
CREATE INDEX "idx_users_deleted" ON "users"("deleted");

-- CreateIndex
CREATE INDEX "idx_users_workspace_id" ON "users"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_users_plan_id" ON "users"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_public_id_key" ON "teams"("public_id");

-- CreateIndex
CREATE INDEX "idx_teams_workspace" ON "teams"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_teams_parent" ON "teams"("parent_team_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_teams_workspace_slug" ON "teams"("workspace_id", "slug");

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "team_members_role_id_idx" ON "team_members"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_ai_artifacts_workspace_id" ON "ai_artifacts"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_ai_artifacts_user_id" ON "ai_artifacts"("user_id");

-- CreateIndex
CREATE INDEX "idx_ai_messages_provider_created" ON "ai_messages"("provider", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_ai_messages_request_id" ON "ai_messages"("request_id");

-- CreateIndex
CREATE INDEX "idx_ai_messages_session_status_created" ON "ai_messages"("session_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_ai_messages_status_created" ON "ai_messages"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ix_ai_messages_session_created_at" ON "ai_messages"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_ai_messages_user_created_at" ON "ai_messages"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_sessions_share_token_key" ON "ai_sessions"("share_token");

-- CreateIndex
CREATE INDEX "idx_ai_sessions_user_archived_updated" ON "ai_sessions"("user_id", "archived", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ai_llm_models_identifier_key" ON "ai_llm_models"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "notes_public_id_key" ON "ai_prompts"("public_prompt_id");

-- CreateIndex
CREATE INDEX "idx_notes_id_revision" ON "ai_prompts"("id", "revision");

-- CreateIndex
CREATE INDEX "idx_notes_workspace" ON "ai_prompts"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_notes_tags_uuids" ON "ai_prompts" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "idx_notes_user" ON "ai_prompts"("user_id");

-- CreateIndex
CREATE INDEX "ai_prompts_embedding_idx" ON "ai_prompts"("embedding");

-- CreateIndex
CREATE INDEX "idx_workflows_workspace" ON "workflows"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_workflows_user" ON "workflows"("user_id");

-- CreateIndex
CREATE INDEX "idx_executions_workflow_started" ON "workflow_executions"("workflow_id", "started_at");

-- CreateIndex
CREATE INDEX "idx_executions_status" ON "workflow_executions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "webhooks_path_key" ON "webhooks"("path");

-- CreateIndex
CREATE INDEX "idx_webhooks_path" ON "webhooks"("path");

-- CreateIndex
CREATE INDEX "idx_plan_limit_overrides_lookup" ON "plan_limit_overrides"("plan_id", "subscriber_type", "subscriber_id", "is_active", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_plan_usage_history_workspace" ON "plan_usage_history"("workspace_id", "period_end" DESC);

-- CreateIndex
CREATE INDEX "idx_plan_usage_history_user" ON "plan_usage_history"("user_id", "period_end" DESC);

-- CreateIndex
CREATE INDEX "idx_plan_usages_workspace_id" ON "plan_usages"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_plan_usages_plan_id" ON "plan_usages"("plan_id");

-- CreateIndex
CREATE INDEX "idx_plan_usages_user_id" ON "plan_usages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_usages_subscriber_type_subscriber_id_key" ON "plan_usages"("subscriber_type", "subscriber_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE INDEX "idx_plans_active" ON "plans"("is_active", "deleted");

-- CreateIndex
CREATE INDEX "idx_subscriptions_lookup" ON "subscriptions"("subscriber_type", "subscriber_id", "status", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_subscriptions_subscriber" ON "subscriptions"("subscriber_type", "subscriber_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_events_event_id_key" ON "usage_events"("event_id");

-- CreateIndex
CREATE INDEX "idx_usage_events_usage_id" ON "usage_events"("plan_usage_id", "processed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_spans_workspace_id" ON "spans"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_spans_parent_span_id" ON "spans"("parent_span_id");

-- CreateIndex
CREATE INDEX "idx_spans_trace_id" ON "spans"("trace_id");

-- CreateIndex
CREATE INDEX "idx_traces_created_at" ON "traces"("created_at");

-- CreateIndex
CREATE INDEX "idx_traces_workspace_id" ON "traces"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_ai_evaluations_trace" ON "ai_evaluations"("trace_id");

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_token_usage_logs" ADD CONSTRAINT "fk_api_token_usage_logs_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_token_usage_logs" ADD CONSTRAINT "fk_api_token_usage_logs_token" FOREIGN KEY ("api_token_id") REFERENCES "api_tokens"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_token_usage_logs" ADD CONSTRAINT "fk_api_token_usage_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "fk_workspace_members_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "fk_workspace_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_fk" FOREIGN KEY ("invited_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_removed_by_fk" FOREIGN KEY ("removed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workspace_member_roles" ADD CONSTRAINT "fk_wm_roles_member" FOREIGN KEY ("workspace_member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workspace_member_roles" ADD CONSTRAINT "fk_wm_roles_role" FOREIGN KEY ("role_id") REFERENCES "workspaces_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "fk_workspaces_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("plan_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public_api_request_logs" ADD CONSTRAINT "public_api_request_logs_api_token_id_fkey" FOREIGN KEY ("api_token_id") REFERENCES "api_tokens"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public_api_request_logs" ADD CONSTRAINT "public_api_request_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public_api_request_logs" ADD CONSTRAINT "public_api_request_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workspaces_roles" ADD CONSTRAINT "workspaces_roles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces_roles" ADD CONSTRAINT "workspaces_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces_roles" ADD CONSTRAINT "workspaces_roles_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "fk_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_logs" ADD CONSTRAINT "user_logs_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_oauth_tokens" ADD CONSTRAINT "fk_user_oauth_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "fk_teams_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "fk_teams_parent" FOREIGN KEY ("parent_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_deleted_by_fk" FOREIGN KEY ("deleted_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_updated_by_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "workspaces_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_artifacts" ADD CONSTRAINT "ai_artifacts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_artifacts" ADD CONSTRAINT "ai_artifacts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_artifacts" ADD CONSTRAINT "ai_artifacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_agent_fk" FOREIGN KEY ("agent_id") REFERENCES "ai_user_agent"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_workspace_FK" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_session_fk" FOREIGN KEY ("session_id") REFERENCES "ai_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_team_fk" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_mcp_servers" ADD CONSTRAINT "ai_mcp_servers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_custom_tools" ADD CONSTRAINT "ai_custom_tools_mcp_server_id_fkey" FOREIGN KEY ("mcp_server_id") REFERENCES "ai_mcp_servers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_user_agent" ADD CONSTRAINT "ai_user_agent_llm_config_id_fkey" FOREIGN KEY ("llm_config_id") REFERENCES "ai_llms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_user_agent" ADD CONSTRAINT "ai_user_agent_team_fk" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_user_agent" ADD CONSTRAINT "ai_user_agent_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_prompts" ADD CONSTRAINT "fk_notes_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_prompts" ADD CONSTRAINT "fk_notes_parent" FOREIGN KEY ("parent_id") REFERENCES "ai_prompts"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_prompts" ADD CONSTRAINT "fk_notes_team" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_prompts" ADD CONSTRAINT "fk_notes_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_collaborators" ADD CONSTRAINT "fk_workflow_collaborators_workflow" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_collaborators" ADD CONSTRAINT "fk_note_collaborators_removed_by" FOREIGN KEY ("removed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_collaborators" ADD CONSTRAINT "fk_note_collaborators_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_collaborators" ADD CONSTRAINT "workflow_collaborators_ai_promptsId_fkey" FOREIGN KEY ("ai_promptsId") REFERENCES "ai_prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_comments" ADD CONSTRAINT "fk_workflow_comments_workflow" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_comments" ADD CONSTRAINT "fk_notes_comments_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_comments" ADD CONSTRAINT "fk_notes_comments_parent" FOREIGN KEY ("parent_id") REFERENCES "workflow_comments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_comments" ADD CONSTRAINT "fk_notes_comments_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_comments" ADD CONSTRAINT "workflow_comments_ai_promptsId_fkey" FOREIGN KEY ("ai_promptsId") REFERENCES "ai_prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_limit_overrides" ADD CONSTRAINT "plan_limit_overrides_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("plan_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "plan_usage_history" ADD CONSTRAINT "plan_usage_history_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("plan_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "plan_usage_history" ADD CONSTRAINT "plan_usage_history_plan_usage_id_fkey" FOREIGN KEY ("plan_usage_id") REFERENCES "plan_usages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "plan_usages" ADD CONSTRAINT "plan_usages_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("plan_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("plan_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_plan_usage_id_fkey" FOREIGN KEY ("plan_usage_id") REFERENCES "plan_usages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "spans" ADD CONSTRAINT "spans_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "spans" ADD CONSTRAINT "spans_parent_span_id_fkey" FOREIGN KEY ("parent_span_id") REFERENCES "spans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "spans" ADD CONSTRAINT "spans_trace_id_fkey" FOREIGN KEY ("trace_id") REFERENCES "traces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "traces" ADD CONSTRAINT "fk_traces_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "traces" ADD CONSTRAINT "fk_traces_team" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "traces" ADD CONSTRAINT "traces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_evaluations" ADD CONSTRAINT "ai_evaluations_trace_id_fkey" FOREIGN KEY ("trace_id") REFERENCES "traces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ai_evaluations" ADD CONSTRAINT "ai_evaluations_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "spans"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "fk_tags_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "fk_tags_team" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "fk_tags_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;
