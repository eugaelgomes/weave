-- Migration: Add reasoning_instructions to project_ai_report_configs
-- Date: 2026-05-20
-- Description: Stores per-project custom append instructions for proactive Weave Engine reports.

ALTER TABLE public.project_ai_report_configs
  ADD COLUMN IF NOT EXISTS reasoning_instructions jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.project_ai_report_configs.reasoning_instructions IS
  'Custom append instructions: { global: { systemAppend, promptAppend }, byType: { [type]: { systemAppend, promptAppend } } }';
