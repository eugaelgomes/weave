-- Incremental migration: note_blocks table + remove notes.document
-- Requires public.set_row_updated_at / public.set_row_deleted_at (see new_structure_db.sql).

BEGIN;

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.note_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL
    REFERENCES public.notes(id) ON DELETE CASCADE,
  parent_id uuid NULL
    REFERENCES public.note_blocks(id) ON DELETE CASCADE,
  type text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  position int NOT NULL DEFAULT 0,
  version int NOT NULL DEFAULT 1,
  created_by uuid NOT NULL
    REFERENCES public.users(user_id) ON DELETE RESTRICT,
  deleted bool NOT NULL DEFAULT false,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT note_blocks_type_check CHECK (type IN (
    'paragraph', 'heading', 'quote', 'code', 'divider',
    'image', 'list', 'todo', 'table', 'page'
  )),
  CONSTRAINT note_blocks_properties_is_object_check
    CHECK (jsonb_typeof(properties) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_note_blocks_note ON public.note_blocks(note_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_note_blocks_parent ON public.note_blocks(parent_id) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_note_blocks_order
  ON public.note_blocks(note_id, parent_id, position)
  WHERE deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_note_blocks_position
  ON public.note_blocks(
    note_id,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    position
  )
  WHERE deleted = false;

DROP TRIGGER IF EXISTS trg_note_blocks_set_updated_at ON public.note_blocks;
CREATE TRIGGER trg_note_blocks_set_updated_at
BEFORE UPDATE ON public.note_blocks
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS trg_note_blocks_set_deleted_at ON public.note_blocks;
CREATE TRIGGER trg_note_blocks_set_deleted_at
BEFORE UPDATE ON public.note_blocks
FOR EACH ROW
EXECUTE FUNCTION public.set_row_deleted_at();

-- One empty paragraph per note that has no blocks yet (legacy rows with document jsonb).
INSERT INTO public.note_blocks (note_id, parent_id, type, properties, position, created_by)
SELECT n.id, NULL, 'paragraph', '{}'::jsonb, 0, n.user_id
FROM public.notes n
WHERE n.deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM public.note_blocks nb WHERE nb.note_id = n.id AND nb.deleted = false
  );

ALTER TABLE public.notes DROP COLUMN IF EXISTS document;

COMMIT;
