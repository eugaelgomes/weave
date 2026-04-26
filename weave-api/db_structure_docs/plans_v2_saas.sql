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
