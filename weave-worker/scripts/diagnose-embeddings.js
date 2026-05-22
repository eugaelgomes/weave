#!/usr/bin/env node
/**
 * Read-only checks for the note embeddings pipeline (run against prod/staging env).
 *
 * Usage: doppler run --project weave-worker --config prd -- node scripts/diagnose-embeddings.js
 */

require("dotenv").config();

const redis = require("../src/config/redis");
const { executeQuery } = require("../src/database/connection");
const { getNoteEmbeddingsQueueRedisKey } = require("../src/config/redis-queue-keys");

async function main() {
  const queueKey = getNoteEmbeddingsQueueRedisKey();
  const report = {
    queueKey,
    redisUrlConfigured: Boolean(process.env.REDIS_URL),
    openAiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
    queueLength: null,
    pgvectorInstalled: null,
    notesHasEmbeddingColumn: null,
    notesHasDocumentColumn: null,
    notesWithoutEmbedding: null,
    sampleError: null,
  };

  try {
    report.queueLength = await redis.llen(queueKey);
  } catch (err) {
    report.sampleError = `Redis: ${err.message}`;
  }

  try {
    const ext = await executeQuery(
      `SELECT extname FROM pg_extension WHERE extname = 'vector' LIMIT 1`
    );
    report.pgvectorInstalled = ext.length > 0;

    const embCol = await executeQuery(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'notes'
        AND column_name = 'embedding'
    `);
    report.notesHasEmbeddingColumn = embCol.length > 0;

    const docCol = await executeQuery(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'notes'
        AND column_name = 'document'
    `);
    report.notesHasDocumentColumn = docCol.length > 0;

    if (report.notesHasEmbeddingColumn) {
      const missing = await executeQuery(`
        SELECT COUNT(*)::int AS count
        FROM notes
        WHERE deleted = false AND embedding IS NULL
      `);
      report.notesWithoutEmbedding = missing[0]?.count ?? null;
    }
  } catch (err) {
    report.sampleError = report.sampleError
      ? `${report.sampleError}; DB: ${err.message}`
      : `DB: ${err.message}`;
  }

  console.log(JSON.stringify(report, null, 2));

  if (!report.openAiKeyConfigured) {
    console.error("\nWARN: OPENAI_API_KEY is not set on this process.");
  }
  if (report.queueLength > 100) {
    console.error(
      `\nWARN: Queue ${queueKey} has ${report.queueLength} jobs — worker may be down or failing.`
    );
  }
  if (report.notesHasDocumentColumn === false && report.notesHasEmbeddingColumn) {
    console.log(
      "\nOK: notes.document is dropped (note_blocks schema). Worker must read note_blocks."
    );
  }

  await redis.quit();
  process.exit(report.sampleError ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
