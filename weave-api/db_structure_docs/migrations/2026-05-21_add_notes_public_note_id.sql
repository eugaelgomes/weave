-- Public note IDs (same pattern as projects.public_project_id: 12-char alphanumeric).

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS public_note_id varchar(12) NULL;

CREATE OR REPLACE FUNCTION public.generate_public_id_12()
RETURNS varchar(12)
LANGUAGE plpgsql
AS $$
DECLARE
  chars constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
  pick int;
BEGIN
  FOR i IN 1..12 LOOP
    pick := 1 + floor(random() * length(chars))::int;
    result := result || substr(chars, pick, 1);
  END LOOP;
  RETURN result;
END;
$$;

DO $$
DECLARE
  note_row record;
  candidate text;
  attempts int;
BEGIN
  FOR note_row IN
    SELECT id FROM public.notes WHERE public_note_id IS NULL
  LOOP
    attempts := 0;
    LOOP
      candidate := public.generate_public_id_12();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.notes n WHERE n.public_note_id = candidate
      );
      attempts := attempts + 1;
      IF attempts > 50 THEN
        RAISE EXCEPTION 'Could not assign unique public_note_id for note %', note_row.id;
      END IF;
    END LOOP;
    UPDATE public.notes SET public_note_id = candidate WHERE id = note_row.id;
  END LOOP;
END;
$$;

ALTER TABLE public.notes
  ALTER COLUMN public_note_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notes_public_note_id_key
  ON public.notes (public_note_id);
