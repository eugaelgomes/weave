-- Add optimistic concurrency token for notes.
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;

-- Ensure null legacy rows are normalized (safety for manual schema drift).
UPDATE public.notes
SET revision = 1
WHERE revision IS NULL;

-- Optional helper index for conflict-heavy update paths.
CREATE INDEX IF NOT EXISTS idx_notes_id_revision ON public.notes (id, revision);
