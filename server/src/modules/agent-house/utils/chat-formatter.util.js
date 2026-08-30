/**
 * @module agent-house/utils/chat-formatter.util
 * @description Utility for formatting and normalizing inputs/outputs of Weave AI endpoints,
 * as well as preparing payload shapes compatible with the Weave Engine LLM.
 *
 * Dependencies:
 * - `@/modules/notes/block-normalizer`: To provide valid block schema contracts.
 * - `@/errors`: For normalizing unhandled errors into standard API shapes.
 * - `./agent-house-i18n.util`: For localized internal fallback messages.
 *
 * Used by:
 * - `agent-house/controllers/chat.controller.js`: For normalizing API errors and parsing history.
 * - `agent-house/services/chat-orchestrator.service.js`: For truncating history, extracting engine tokens, and payload mapping.
 * - `agent-house/services/chat-engine.service.js`: To format payloads for the LLM engine request.
 */

const { fromUnknown } = require("@/errors");
const { getI18n } = require("./agent-house-i18n.util");

const CHAT_CONTEXT_MAX_MESSAGE_CHARS = Number.parseInt(
  process.env.WEAVE_CHAT_CONTEXT_MAX_MESSAGE_CHARS || "35000",
  10
);

/**
 * Utility for formatting and normalizing inputs/outputs of Weave AI endpoints,
 * as well as preparing payload shapes compatible with the Weave Engine LLM.
 */
class ChatFormatterUtil {
  /**
   * Converts uploaded files to serializable metadata to return in HTTP responses.
   *
   * @param {Array<import("multer").File>} files - Uploaded files array.
   * @returns {Array<Record<string, unknown>>} Metadata array.
   */
  buildFilesMetadata(files) {
    if (!Array.isArray(files) || files.length === 0) {
      return [];
    }

    return files.map((file) => ({
      mimeType: file.mimetype,
      originalName: file.originalname,
      size: file.size,
    }));
  }

  /**
   * Converts uploaded files to payload accepted by engine chat-v2 processor.
   * Encodes binary file buffers to base64 encoding strings.
   *
   * @param {Array<import("multer").File>} files - Uploaded files array.
   * @returns {Array<{name: string, mimeType: string, sizeBytes: number, base64Data: string}>} Engine files payload.
   */
  buildEngineFilesPayload(files) {
    if (!Array.isArray(files) || files.length === 0) {
      return [];
    }

    return files.map((file) => ({
      base64Data: Buffer.isBuffer(file.buffer) ? file.buffer.toString("base64") : "",
      mimeType: file.mimetype || "application/octet-stream",
      name: file.originalname || "file",
      sizeBytes: Number(file.size || 0),
    }));
  }

  /**
   * Normalizes persisted messages into compact conversation history.
   * Truncates extremely large message bodies to safeguard LLM tokens window usage.
   *
   * @param {Array<{role?: string, content?: string, model?: string, created_at?: string}>} messages - Raw messages from database.
   * @returns {Array<{role: "user"|"assistant", content: string, model: string|null, createdAt: string|null}>} Normalized history.
   */
  normalizeConversationHistory(messages = []) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return [];
    }

    return messages
      .map((message) => {
        const role = message?.role === "assistant" ? "assistant" : "user";
        const rawContent = typeof message?.content === "string" ? message.content.trim() : "";
        if (!rawContent) {
          return null;
        }

        // Hard truncation to avoid blowing context windows with long notes or transcripts.
        const content =
          rawContent.length > CHAT_CONTEXT_MAX_MESSAGE_CHARS
            ? `${rawContent.slice(0, CHAT_CONTEXT_MAX_MESSAGE_CHARS)}...`
            : rawContent;

        return {
          content,
          createdAt: message?.created_at || null,
          model: typeof message?.model === "string" ? message.model : null,
          role,
        };
      })
      .filter(Boolean);
  }

  /**
   * Resolves model string expected by engine provider client.
   * Defaults to version details if defined, otherwise name.
   *
   * @param {{name: string, version: string}} model - Model name and version payload.
   * @returns {string} Model name or version.
   */
  resolveModelForEngine(model) {
    if (model.name && model.name.trim()) {
      return model.name.trim();
    }
    if (model.version && model.version.trim()) {
      return model.version.trim();
    }
    return "gemini-3.5-flash"; // default fallback in case everything is broken
  }

  /**
   * Builds a short session title from the first user message (fits ai_chat_sessions.title).
   * Takes the first non-empty text line and collapses whitespace.
   *
   * @param {string} message - The first user message content.
   * @returns {string} Session title.
   */
  deriveSessionTitleFromMessage(message) {
    if (typeof message !== "string") {
      return "";
    }
    const trimmed = message.trim();
    if (!trimmed) {
      return "";
    }
    const lines = trimmed.split(/\r?\n/);
    const firstLine =
      lines.find((line) => typeof line === "string" && line.trim().length > 0)?.trim() || trimmed;
    const collapsed = firstLine.replace(/\s+/g, " ").trim();
    if (!collapsed) {
      return "";
    }
    return collapsed.length > 255 ? collapsed.slice(0, 255) : collapsed;
  }

  /**
   * Extracts error payload details from a raw Engine error object or string.
   * Maps unhandled exceptions to standardized codes/messages.
   *
   * @param {unknown} rawError - The raw error returned by the engine.
   * @param {string} [lang="pt"] - The language code for error translation.
   * @returns {{ code: string, message: string }} Normalized error payload.
   */
  extractEngineErrorPayload(rawError, lang = "pt") {
    const t = getI18n(lang);
    if (rawError && typeof rawError === "object") {
      return {
        code:
          typeof rawError.code === "string" && rawError.code ? rawError.code : "ENGINE_TASK_FAILED",
        message:
          typeof rawError.message === "string" && rawError.message
            ? rawError.message
            : t.engineTaskFailed,
      };
    }

    if (typeof rawError === "string" && rawError.trim()) {
      return {
        code: "ENGINE_TASK_FAILED",
        message: rawError,
      };
    }

    return {
      code: "ENGINE_TASK_FAILED",
      message: t.engineTaskFailed,
    };
  }

  /**
   * Normalizes an internal error into a standard API error response format.
   * Hides stack-traces or low-level PG constraints in production environments.
   *
   * @param {unknown} error - The error instance to normalize.
   * @param {{ code: string, message: string, statusCode?: number }} fallback - Fallback values if error lacks metadata.
   * @returns {{ code: string, message: string, statusCode: number }} Normalized API error.
   */
  normalizeApiError(error, fallback) {
    const mapped = fromUnknown(error, fallback.code);
    // Enforce safety: do not leak raw programming exception messages.
    if (!mapped.isOperational || mapped.statusCode >= 500) {
      return {
        code: fallback.code,
        message: fallback.message,
        statusCode: fallback.statusCode || 500,
      };
    }

    return {
      code: mapped.code || fallback.code,
      message: mapped.message || fallback.message,
      statusCode: mapped.statusCode || fallback.statusCode || 500,
    };
  }

  /**
   * Extracts token consumption statistics from Engine response payload.
   * Normalizes different naming variations (prompt/completion/input/output).
   *
   * @param {object} enginePayload - Raw payload response from the Engine.
   * @returns {{ inputTokens: number|null, outputTokens: number|null, totalTokens: number|null }} Token usage structure.
   */
  extractTokenUsage(enginePayload = {}) {
    const usage = enginePayload?.data?.usage || enginePayload?.usage || {};
    const inputTokens =
      usage.inputTokens || usage.input_tokens || usage.promptTokens || usage.prompt_tokens || null;
    const outputTokens =
      usage.outputTokens ||
      usage.output_tokens ||
      usage.completionTokens ||
      usage.completion_tokens ||
      null;
    const totalTokens = usage.totalTokens || usage.total_tokens || null;

    return {
      inputTokens: Number.isFinite(Number(inputTokens)) ? Number(inputTokens) : null,
      outputTokens: Number.isFinite(Number(outputTokens)) ? Number(outputTokens) : null,
      totalTokens: Number.isFinite(Number(totalTokens)) ? Number(totalTokens) : null,
    };
  }

  /**
   * Traverses blocks tree structure to determine if it contains non-empty text values.
   * Implemented using a stack-based Depth-First Search (DFS) for performance.
   *
   * @param {unknown[]} blocksTree - The blocks tree list structure to inspect.
   * @returns {boolean} True if any block contains non-empty textual content, false otherwise.
   */
  blocksTreeHasMeaningfulText(blocksTree) {
    if (!Array.isArray(blocksTree)) return false;
    const stack = [...blocksTree];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;

      const props = node.properties && typeof node.properties === "object" ? node.properties : {};
      const t =
        typeof node.text === "string"
          ? node.text
          : typeof props.text === "string"
            ? props.text
            : "";

      if (t.trim().length > 0) return true;

      // Push sub-children if existing.
      if (Array.isArray(node.children) && node.children.length > 0) {
        stack.push(...node.children);
      }
    }
    return false;
  }

  /**
   * Safely retrieves a deeply nested property value from an object using a dot-notated string path.
   * Prevents "Cannot read properties of undefined" errors.
   *
   * @param {Record<string, any>|null|undefined} source - The source object to search within.
   * @param {string} path - Dot-separated path representing the object keys traversal structure.
   * @returns {unknown} The nested value if found, or null if any path part evaluates to non-object/undefined.
   */
  getNestedValue(source, path) {
    if (!source || typeof source !== "object" || !path) {
      return null;
    }

    return path.split(".").reduce((acc, key) => {
      if (!acc || typeof acc !== "object") {
        return null;
      }
      return acc[key];
    }, source);
  }
}

module.exports = new ChatFormatterUtil();
