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
        const result = await redis.blpop(this.queueName, 5);
        if (!result) continue;

        const [, payload] = result;
        const job = JSON.parse(payload);
        await this.processJob(job);
      } catch (error) {
        logger.error("Embedding processor loop failed", {
          error: error.message,
        });
      }
    }
  }

  async processJob(job) {
    const noteId = job?.noteId;

    if (!noteId) {
      logger.warn("Skipping embedding job without noteId");
      return;
    }

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
        throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const embeddingArray = data.data[0].embedding;

      await this.saveEmbedding(noteId, embeddingArray);
      
      logger.info("Generated and saved embedding", { noteId });

    } catch (error) {
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
