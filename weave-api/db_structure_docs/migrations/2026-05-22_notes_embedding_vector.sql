-- pgvector embeddings for semantic note search (text-embedding-3-small, 1536 dims).

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_notes_embedding_ivfflat
  ON public.notes
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE deleted = false AND embedding IS NOT NULL;

COMMIT;
