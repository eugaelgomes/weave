const redis = require("../config/redis");
const { executeQuery } = require("../database/connection");
const { logger } = require("../lib");

class EmbeddingProcessor {
  constructor() {
    this.isRunning = false;
    this.queueName = "queue:note-embeddings";
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info("Embedding processor started", {
      queue: this.queueName,
    });

    while (this.isRunning) {
      try {
        // logger.debug("Polling queue", { queue: this.queueName });
        const result = await redis.blpop(this.queueName, 5);
        if (!result) continue;

        logger.info("Job received from queue", { queue: this.queueName, result });
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
   * @returns {{ status: number | null, code: string | null, type: string | null }}
   */
  parseOpenAiError(errText) {
    const statusMatch = errText.match(/OpenAI API error: (\d+)/);
    const status = statusMatch ? Number(statusMatch[1]) : null;
    try {
      const jsonStart = errText.indexOf("{");
      if (jsonStart === -1) return { code: null, status, type: null };
      const body = JSON.parse(errText.slice(jsonStart));
      return {
        code: body?.error?.code ?? null,
        status,
        type: body?.error?.type ?? null,
      };
    } catch {
      return { code: null, status, type: null };
    }
  }

  async processJob(job) {
    const noteId = job?.noteId;

    if (!noteId) {
      logger.warn("Skipping embedding job without noteId");
      return;
    }

    // #region agent log
    fetch("http://127.0.0.1:7701/ingest/2f9d05dd-4fb3-4892-84ba-05df7854fb8b", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "be6aa6" },
      body: JSON.stringify({
        sessionId: "be6aa6",
        runId: "pre-fix",
        hypothesisId: "D",
        location: "embedding.processor.js:processJob:entry",
        message: "Embedding job started",
        data: {
          noteId,
          queuedAt: job?.queuedAt ?? null,
          hasApiKey: Boolean(process.env.OPENAI_API_KEY),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    try {
      const note = await this.findNoteById(noteId);
      if (!note) {
        logger.warn("Note not found for embedding job", { noteId });
        return;
      }

      // Format text for embedding
      const documentText = this.extractTextFromDocument(note.document);
      const textToEmbed = `Title: ${note.title || ""}\nDescription: ${note.description || ""}\nContent: ${documentText}`;

      if (textToEmbed.trim().length === 0) {
        logger.debug("Note is empty, skipping embedding", { noteId });
        return;
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not defined in environment variables");
      }

      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: textToEmbed,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        const parsed = this.parseOpenAiError(
          `OpenAI API error: ${response.status} - ${errText}`,
        );
        // #region agent log
        fetch("http://127.0.0.1:7701/ingest/2f9d05dd-4fb3-4892-84ba-05df7854fb8b", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "be6aa6" },
          body: JSON.stringify({
            sessionId: "be6aa6",
            runId: "pre-fix",
            hypothesisId: "A",
            location: "embedding.processor.js:processJob:openai-response",
            message: "OpenAI embeddings API non-OK",
            data: {
              noteId,
              httpStatus: response.status,
              errorCode: parsed.code,
              errorType: parsed.type,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const embeddingArray = data.data[0].embedding;

      await this.saveEmbedding(noteId, embeddingArray);
      
      logger.info("Generated and saved embedding", { noteId });
      // #region agent log
      fetch("http://127.0.0.1:7701/ingest/2f9d05dd-4fb3-4892-84ba-05df7854fb8b", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "be6aa6" },
        body: JSON.stringify({
          sessionId: "be6aa6",
          runId: "pre-fix",
          hypothesisId: "A",
          location: "embedding.processor.js:processJob:success",
          message: "Embedding saved",
          data: { noteId },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

    } catch (error) {
      const parsed = this.parseOpenAiError(error.message);
      // #region agent log
      fetch("http://127.0.0.1:7701/ingest/2f9d05dd-4fb3-4892-84ba-05df7854fb8b", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "be6aa6" },
        body: JSON.stringify({
          sessionId: "be6aa6",
          runId: "pre-fix",
          hypothesisId: "C",
          location: "embedding.processor.js:processJob:catch",
          message: "Embedding job failed",
          data: {
            noteId,
            httpStatus: parsed.status,
            errorCode: parsed.code,
            errorType: parsed.type,
            willRequeue: false,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      logger.error("Failed to process embedding job", {
        noteId,
        error: error.message,
      });
      // Em um cenário real de produção, adicionaríamos a uma fila de DLQ (Dead Letter Queue) ou Retry
    }
  }

  extractTextFromDocument(document) {
    if (!document || !Array.isArray(document.blocks)) return "";
    return document.blocks
      .filter((b) => b && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n")
      .slice(0, 8000); // Evitar estourar limite de tokens da OpenAI em notas massivas
  }

  async findNoteById(noteId) {
    const query = `
      SELECT id, title, description, document
      FROM notes
      WHERE id = $1 AND deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [noteId]);
    return results[0] || null;
  }

  async saveEmbedding(noteId, embeddingArray) {
    const query = `
      UPDATE notes
      SET embedding = $1::vector
      WHERE id = $2;
    `;
    await executeQuery(query, [JSON.stringify(embeddingArray), noteId]);
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new EmbeddingProcessor();
