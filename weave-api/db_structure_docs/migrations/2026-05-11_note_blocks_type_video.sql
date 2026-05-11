-- Allow `video` blocks in note_blocks (TipTap / document sync).

BEGIN;

SET search_path TO public;

ALTER TABLE public.note_blocks DROP CONSTRAINT IF EXISTS note_blocks_type_check;

ALTER TABLE public.note_blocks ADD CONSTRAINT note_blocks_type_check CHECK (type IN (
  'paragraph', 'heading', 'quote', 'code', 'divider',
  'image', 'video', 'list', 'todo', 'table', 'page'
));

COMMIT;
