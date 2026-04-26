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

