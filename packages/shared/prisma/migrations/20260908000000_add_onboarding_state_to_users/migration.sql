-- Persist the onboarding progress read by the authenticated profile endpoints.
ALTER TABLE "users"
  ADD COLUMN "onboarding_state" JSONB NOT NULL
  DEFAULT '{"step":"REGISTERED","completed_steps":[],"metadata":{}}';
