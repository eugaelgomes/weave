const redis = require("../../queues/queue-client");
const { executeQuery } = require("../../database/connection");
const { getNoteEmbeddingsQueueRedisKey } = require("../../queues/queue-queue-keys");
const { extractPlainTextFromBlockRows } = require("./note-blocks-text");
const { resolveNoteIdToUuid } = require("../../utils/note-id-lookup");
const { logger } = require("@theweave/database");

const MAX_RETRIES = 3;
const EMBEDDING_MODEL = "text-embedding-3-small";

class EmbeddingProcessor {
  constructor() {
    this.isRunning = false;
    this.queueName = getNoteEmbeddingsQueueRedisKey();
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info("Embedding processor started", {
      hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
      queue: this.queueName,
    });

    while (this.isRunning) {
      try {
        const result = await redis.blpop(this.queueName, 5);
        if (!result) continue;

        const [, payload] = result;
        const job = JSON.parse(payload);
        await this.processJob(job);
      } catch (error) {
        logger.error("Embedding processor loop failed", {
          error: error.message,
          stack: error.stack,
        });
      }
    }
  }

  /**
   * @param {string} errText
   * @returns {{ status: number | null, code: string | null, type: string | null, pgCode: string | null }}
   */
  parseError(errText) {
    const statusMatch = String(errText).match(/OpenAI API error: (\d+)/);
    const status = statusMatch ? Number(statusMatch[1]) : null;
    const pgCodeMatch = String(errText).match(/code: (\d{5})/);
    const pgCode = pgCodeMatch ? pgCodeMatch[1] : null;

    try {
      const jsonStart = String(errText).indexOf("{");
      if (jsonStart === -1) return { code: null, pgCode, status, type: null };
      const body = JSON.parse(String(errText).slice(jsonStart));
      return {
        code: body?.error?.code ?? null,
        pgCode,
        status,
        type: body?.error?.type ?? null,
      };
    } catch {
      return { code: null, pgCode, status, type: null };
    }
  }

  /**
   * @param {number | null} httpStatus
   * @param {string} message
   * @returns {boolean}
   */
  isRetryableFailure(httpStatus, message) {
    if (httpStatus === 429 || (httpStatus !== null && httpStatus >= 500)) {
      return true;
    }
    const lower = message.toLowerCase();
    if (lower.includes("timeout") || lower.includes("econnreset") || lower.includes("connection")) {
      return true;
    }
    return false;
  }

  /**
   * @param {object} job
   * @returns {Promise<void>}
   */
  async scheduleRetry(job) {
    const retryCount = Number(job.retryCount || 0);
    if (retryCount >= MAX_RETRIES) {
      logger.error("Embedding job dropped after max retries", {
        noteId: job.noteId,
        retryCount,
      });
      return;
    }

    const nextJob = {
      ...job,
      lastFailedAt: new Date().toISOString(),
      retryCount: retryCount + 1,
    };

    await redis.rpush(this.queueName, JSON.stringify(nextJob));
    logger.warn("Embedding job requeued", {
      noteId: job.noteId,
      retryCount: nextJob.retryCount,
    });
  }

  /**
   * @param {object} job
   * @returns {Promise<void>}
   */
  async processJob(job) {
    const rawNoteId = job?.noteId;

    if (!rawNoteId) {
      logger.warn("Skipping embedding job without noteId");
      return;
    }

    const noteId = (await resolveNoteIdToUuid(rawNoteId)) || rawNoteId;

    try {
      const note = await this.findNoteById(noteId);
      if (!note) {
        logger.warn("Note not found for embedding job", { noteId });
        return;
      }

      const blockRows = await this.findBlockRowsByNoteId(noteId);
      const blocksText = extractPlainTextFromBlockRows(blockRows);
      const textToEmbed = [
        `Title: ${note.title || ""}`,
        `Description: ${note.description || ""}`,
        blocksText ? `Content: ${blocksText}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      if (textToEmbed.trim().length === 0) {
        logger.debug("Note is empty, skipping embedding", { noteId });
        return;
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not defined in environment variables");
      }

      const response = await fetch("https://api.openai.com/v1/embeddings", {
        body: JSON.stringify({
          input: textToEmbed,
          model: EMBEDDING_MODEL,
        }),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const embeddingArray = data?.data?.[0]?.embedding;
      if (!Array.isArray(embeddingArray) || embeddingArray.length === 0) {
        throw new Error("OpenAI embeddings response missing vector data");
      }

      await this.saveEmbedding(noteId, embeddingArray);

      logger.info("Generated and saved embedding", {
        dimensions: embeddingArray.length,
        noteId,
      });
    } catch (error) {
      const parsed = this.parseError(error.message);
      logger.error("Failed to process embedding job", {
        error: error.message,
        errorCode: parsed.code,
        httpStatus: parsed.status,
        noteId,
        pgCode: parsed.pgCode,
      });

      if (this.isRetryableFailure(parsed.status, error.message)) {
        await this.scheduleRetry(job);
      }
    }
  }

  /**
   * @param {string} noteId
   * @returns {Promise<object | null>}
   */
  async findNoteById(noteId) {
    const query = `
      SELECT id, title, description
      FROM notes
      WHERE id = $1::uuid AND deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [noteId]);
    return results[0] || null;
  }

  /**
   * @param {string} noteId
   * @returns {Promise<object[]>}
   */
  async findBlockRowsByNoteId(noteId) {
    const query = `
      SELECT type, properties, position
      FROM note_blocks
      WHERE note_id = $1::uuid AND deleted = false
      ORDER BY parent_id NULLS FIRST, position ASC, created_at ASC;
    `;
    return executeQuery(query, [noteId]);
  }

  /**
   * @param {string} noteId
   * @param {number[]} embeddingArray
   * @returns {Promise<void>}
   */
  async saveEmbedding(noteId, embeddingArray) {
    const query = `
      UPDATE notes
      SET embedding = $1::vector
      WHERE id = $2::uuid;
    `;
    await executeQuery(query, [JSON.stringify(embeddingArray), noteId]);
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new EmbeddingProcessor();
