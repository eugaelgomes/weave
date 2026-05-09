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
