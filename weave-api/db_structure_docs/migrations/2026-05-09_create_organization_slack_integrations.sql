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
