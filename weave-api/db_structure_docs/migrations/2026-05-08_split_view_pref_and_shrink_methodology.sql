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
