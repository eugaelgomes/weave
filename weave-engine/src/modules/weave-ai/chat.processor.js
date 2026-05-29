/* eslint-disable sort-keys */
const redis = require("../../services/redis.client");
const {
  getEngineLlmRequestQueueRedisKey,
} = require("../../services/redis-queue-keys");
const { logger } = require("../../logger");
const { buildSystemMessage } = require("../core/prompts/agent-prompts");
const { buildEntityContext } = require("../core/context/entity-context.loader");
const {
  executeAgenticTask,
  generateSmartResponse,
  processThinkingPhase,
} = require("../core/orchestration/reasoning.engine");
const { callAIProvider } = require("../core/providers/llm-provider.client");
const {
  isEngineComposeSurface,
  buildEngineComposePromptOverlay,
} = require("./compose-prompt");

const RESPONSE_TTL_SECONDS = 60;
const CHAT_HISTORY_MAX_MESSAGES = Number.parseInt(
  process.env.WEAVE_CHAT_CONTEXT_MAX_MESSAGES || "20",
  10
);
const CHAT_HISTORY_MAX_MESSAGE_CHARS = Number.parseInt(
  process.env.WEAVE_CHAT_CONTEXT_MAX_MESSAGE_CHARS || "1500",
  10
);
const CHAT_HISTORY_MAX_TOTAL_CHARS = Number.parseInt(
  process.env.WEAVE_CHAT_CONTEXT_MAX_TOTAL_CHARS || "12000",
  10
);
const ENGINE_CHAT_TASK_TIMEOUT_MS = Number.parseInt(
  process.env.WEAVE_ENGINE_CHAT_TASK_TIMEOUT_MS || "65000",
  10
);
const ENGINE_JOB_MAX_RETRIES = Number.parseInt(
  process.env.WEAVE_ENGINE_JOB_MAX_RETRIES || "2",
  10
);
const ENGINE_DEAD_LETTER_QUEUE_KEY =
  process.env.REDIS_ENGINE_LLM_DEAD_LETTER_QUEUE_KEY ||
  "weave:engine:llm:dead-letter";

function resolveOrganizationId(payload = {}, context = {}) {
  return (
    payload.organizationId ||
    payload.organization_id ||
    payload.orgId ||
    payload.orgWideOrganizationId ||
    context.organizationId ||
    context.organization_id ||
    context.orgId ||
    context.orgWideOrganizationId ||
    null
  );
}

class LlmQueueProcessor {
  constructor() {
    this.isRunning = false;
    this.queueName = getEngineLlmRequestQueueRedisKey();
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info("Engine LLM processor started", { queueName: this.queueName });

    while (this.isRunning) {
      try {
        const result = await redis.blpop(this.queueName, 5);

        if (!result) {
          continue;
        }

        const [, rawPayload] = result;
        const parsedJob = this.parseRawJob(rawPayload);
        if (!parsedJob) {
          continue;
        }
        await this.processJob(parsedJob);
      } catch (error) {
        logger.error("Engine LLM processor loop failed", {
          error: error.message,
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * @param {string} rawPayload
   * @returns {object|null}
   */
  parseRawJob(rawPayload) {
    let parsedJob;
    try {
      parsedJob = JSON.parse(rawPayload);
    } catch (error) {
      logger.error("Engine LLM job parse failed", {
        error: error.message,
      });
      this.pushDeadLetter({
        errorCode: "ENGINE_JOB_PARSE_FAILED",
        errorMessage: error.message,
        rawPayload,
      }).catch(() => {});
      return null;
    }

    if (!this.isValidJobEnvelope(parsedJob)) {
      logger.warn("Engine LLM job discarded: invalid envelope");
      this.pushDeadLetter({
        errorCode: "ENGINE_JOB_INVALID_ENVELOPE",
        errorMessage: "Invalid job envelope",
        job: parsedJob,
      }).catch(() => {});
      return null;
    }

    return {
      ...parsedJob,
      attempts:
        Number.isInteger(parsedJob.attempts) && parsedJob.attempts >= 0
          ? parsedJob.attempts
          : 0,
      createdAt:
        typeof parsedJob.createdAt === "string"
          ? parsedJob.createdAt
          : new Date().toISOString(),
      requestId:
        typeof parsedJob.requestId === "string" &&
        parsedJob.requestId.trim().length > 0
          ? parsedJob.requestId.trim()
          : null,
      taskType:
        typeof parsedJob.taskType === "string" &&
        parsedJob.taskType.trim().length > 0
          ? parsedJob.taskType
          : "provider_call",
    };
  }

  /**
   * @param {object} job
   * @returns {boolean}
   */
  isValidJobEnvelope(job) {
    if (!job || typeof job !== "object") {
      return false;
    }

    if (
      typeof job.responseQueueKey !== "string" ||
      !job.responseQueueKey.trim()
    ) {
      return false;
    }

    if (
      !job.payload ||
      typeof job.payload !== "object" ||
      Array.isArray(job.payload)
    ) {
      return false;
    }

    return true;
  }

  /**
   * @param {object} job
   * @param {object} [job.payload]
   * @param {string} job.responseQueueKey
   * @param {string} [job.taskType]
   * @returns {Promise<void>}
   */
  async processJob(job) {
    const {
      payload = {},
      responseQueueKey,
      taskType = "provider_call",
      requestId = null,
      attempts = 0,
      createdAt = null,
    } = job;

    if (!responseQueueKey) {
      logger.warn("Engine LLM job discarded: missing response queue key");
      return;
    }

    let responsePayload;
    const startedAt = Date.now();
    const queueLatencyMs = createdAt
      ? Date.now() - new Date(createdAt).getTime()
      : null;

    try {
      const data = await this.executeTask(taskType, payload);
      responsePayload = JSON.stringify({
        data,
        requestId,
        success: true,
      });
      logger.info("Engine LLM task succeeded", {
        attempts,
        queueLatencyMs,
        requestId,
        taskLatencyMs: Date.now() - startedAt,
        taskType,
      });
    } catch (error) {
      const normalizedError = this.normalizeTaskError(error, taskType);
      logger.error("Engine LLM task failed", {
        attempts,
        code: normalizedError.code,
        message: normalizedError.message,
        requestId,
        taskType,
      });

      if (attempts < ENGINE_JOB_MAX_RETRIES) {
        const retriedJob = {
          ...job,
          attempts: attempts + 1,
          createdAt,
          requestId,
        };
        await redis.rpush(this.queueName, JSON.stringify(retriedJob));
        return;
      }

      responsePayload = JSON.stringify({
        error: normalizedError,
        requestId,
        success: false,
      });
      await this.pushDeadLetter({
        errorCode: normalizedError.code,
        errorMessage: normalizedError.message,
        job: {
          attempts,
          payload,
          requestId,
          responseQueueKey,
          taskType,
        },
      });
    }

    await redis.lpush(responseQueueKey, responsePayload);
    await redis.expire(responseQueueKey, RESPONSE_TTL_SECONDS);
  }

  /**
   * @param {unknown} error
   * @param {string} taskType
   * @returns {{ code: string, message: string, taskType: string }}
   */
  normalizeTaskError(error, taskType) {
    return {
      code:
        typeof error?.code === "string" && error.code
          ? error.code
          : "ENGINE_TASK_FAILED",
      message:
        typeof error?.message === "string" && error.message
          ? error.message
          : "Engine task failed",
      taskType,
    };
  }

  /**
   * @param {object} deadLetterPayload
   * @returns {Promise<void>}
   */
  async pushDeadLetter(deadLetterPayload) {
    await redis.rpush(
      ENGINE_DEAD_LETTER_QUEUE_KEY,
      JSON.stringify({
        ...deadLetterPayload,
        createdAt: new Date().toISOString(),
      })
    );
  }

  /**
   * @param {string} taskType
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async executeTask(taskType, payload) {
    switch (taskType) {
      case "build_system_message": {
        const additionalContext = payload.additionalContext || {};
        const organizationId = resolveOrganizationId(
          payload,
          additionalContext
        );
        const entityContext = await buildEntityContext({
          noteIds: payload.noteIds || additionalContext.noteIds,
          projectIds: payload.projectIds || additionalContext.projectIds,
          userId: payload.userId || additionalContext.userId,
          organizationId,
        });

        return {
          systemMessage: buildSystemMessage({
            ...additionalContext,
            indexedNotes: entityContext.indexedNotes,
            indexedProjects: entityContext.indexedProjects,
            userLanguage:
              payload.userLanguage || additionalContext.userLanguage,
          }),
        };
      }

      case "generate_smart_response":
        return {
          smartResponse: await generateSmartResponse(payload),
        };

      case "get_few_shot_examples":
        return {
          examples: [],
        };

      case "process_thinking_phase":
        return {
          generatedContent: await processThinkingPhase(payload),
        };

      case "provider_call":
      default: {
        const { data, provider: providerUsed } = await callAIProvider(payload);
        return {
          ...data,
          providerUsed,
        };
      }

      case "chat_v2_process": {
        const systemMessage = await this.buildChatV2SystemMessage(payload);
        const conversationHistory = this.normalizeConversationHistory(
          payload.conversationHistory
        );

        const { data, providerUsed, executedActions = [] } = await Promise.race([
          executeAgenticTask({
            allowEdit: Boolean(payload.allowEdit),
            allowWebSearch: Boolean(payload.allowWebSearch),
            files: Array.isArray(payload.files) ? payload.files : [],
            functions: Array.isArray(payload.functions)
              ? payload.functions
              : [],
            message: payload.message || "",
            model: payload.model || null,
            systemMessage,
            conversationHistory,
            executionContext: {
              userId: payload.userId || null,
              organizationId:
                payload.organizationId ||
                payload.context?.organizationId ||
                payload.context?.organization_id ||
                null,
            },
          }),
          new Promise((_, reject) => {
            setTimeout(() => {
              const timeoutError = new Error("Engine chat task timeout");
              timeoutError.code = "ENGINE_CHAT_TASK_TIMEOUT";
              reject(timeoutError);
            }, ENGINE_CHAT_TASK_TIMEOUT_MS);
          }),
        ]);

        const functions =
          data?.type === "function_call" && data?.functionCall
            ? [data.functionCall]
            : [];

        return {
          data: {
            citations: data?.citations || [],
            content: data?.content || null,
            response: data?.text || data?.content || null,
            text: data?.text || null,
            executedActions,
          },
          functions,
          providerUsed,
        };
      }
    }
  }

  /**
   * Build chat-v2 system prompt using request metadata.
   *
   * @param {object} payload
   * @returns {Promise<string>}
   */
  async buildChatV2SystemMessage(payload = {}) {
    const noteIds = Array.isArray(payload.noteIds) ? payload.noteIds : [];
    const projectIds = Array.isArray(payload.projectIds)
      ? payload.projectIds
      : [];
    const files = Array.isArray(payload.files) ? payload.files : [];
    const organizationId = resolveOrganizationId(
      payload,
      payload.context || {}
    );
    const entityContext = await buildEntityContext({
      noteIds,
      projectIds,
      userId: payload.userId,
      organizationId,
    });

    const baseMessage = buildSystemMessage({
      ...payload.context,
      projectIds,
      noteIds,
      indexedNotes: entityContext.indexedNotes,
      indexedProjects: entityContext.indexedProjects,
      userLanguage: payload.userLanguage || payload.context?.userLanguage,
    });
    const agentInstructions = this.extractAgentInstructions(payload.agent);
    const noteDocumentContract = payload?.context?.noteDocumentContract || null;
    const conversationHistory = this.normalizeConversationHistory(
      payload.conversationHistory
    );

    const composeOverlay =
      isEngineComposeSurface(payload.context) ||
      payload.useCase === "engine_compose" ||
      payload.context?.useCase === "engine_compose"
        ? `\n\n${buildEngineComposePromptOverlay(payload.context || {})}`
        : "";

    const fileSummary =
      files.length === 0
        ? "No files attached."
        : files
            .map(
              (file, index) =>
                `${index + 1}. ${file.name || "file"} (${file.mimeType || "application/octet-stream"}, ${file.sizeBytes || 0} bytes)`
            )
            .join("\n");

    return `${baseMessage}${composeOverlay}

## Context received from Server (v2)
- userId: ${payload.userId || "unknown"}
- sessionId: ${payload.sessionId || "unknown"}
- noteIds: ${noteIds.length > 0 ? noteIds.join(", ") : "none"}
- projectIds: ${projectIds.length > 0 ? projectIds.join(", ") : "none"}
- organizationId: ${organizationId || "unknown"}
- userLanguage: ${payload.userLanguage || payload.context?.userLanguage || "unknown"}
- allowEdit: ${payload.allowEdit ? "true" : "false"}

## Temporary files
${fileSummary}

${
  noteDocumentContract
    ? `## Note document contract for update_note_content
- When updating note body, prefer returning "document" (full payload) or "blocks" (array) in function arguments.
- Allowed document node types: ${Array.isArray(noteDocumentContract.allowedNodeTypes) ? noteDocumentContract.allowedNodeTypes.join(", ") : "unknown"}
- Allowed mark types: ${Array.isArray(noteDocumentContract.allowedMarkTypes) ? noteDocumentContract.allowedMarkTypes.join(", ") : "unknown"}
- Avoid unsupported node/mark types outside this contract.
- Prefer structured output by intent:
  - sections/titles -> heading + paragraph
  - enumerations/checklists -> bulletList, orderedList, taskList/taskItem
  - emphasis/callout -> blockquote
  - snippets/technical commands -> codeBlock
  - plain prose only when user asks for short/simple text
- Never return empty content for update_note_content. Ensure at least one text node with meaningful text.

`
    : ""
}Respond to the user clearly. If database action is needed, return a structured function call.${agentInstructions ? `\n\n## Selected agent\n${agentInstructions}` : ""}`;
  }

  /**
   * Extracts agent personality instructions for prompt composition.
   *
   * @param {object|null|undefined} agent
   * @returns {string}
   */
  extractAgentInstructions(agent) {
    if (!agent || typeof agent !== "object") {
      return "";
    }

    const personality = agent.personality || {};
    const persona = personality.persona || {};
    const metadata = personality.metadata || {};
    const behavior = personality.behavior || {};
    const systemInstructions = behavior.system_instructions || {};
    const contextText = systemInstructions.context || "";
    const rules = Array.isArray(systemInstructions.rules)
      ? systemInstructions.rules.filter(Boolean).join(" | ")
      : "";

    const lines = [
      `agentId: ${agent.id || "unknown"}`,
      metadata.name ? `name: ${metadata.name}` : "",
      persona.role ? `role: ${persona.role}` : "",
      persona.tone ? `tone: ${persona.tone}` : "",
      persona.language ? `language: ${persona.language}` : "",
      contextText ? `instructions: ${contextText}` : "",
      rules ? `rules: ${rules}` : "",
    ].filter(Boolean);

    return lines.join("\n");
  }

  /**
   * Normalizes raw conversation history sent by server.
   *
   * @param {unknown} rawHistory
   * @returns {Array<{role: "user"|"assistant", content: string}>}
   */
  normalizeConversationHistory(rawHistory) {
    if (!Array.isArray(rawHistory) || rawHistory.length === 0) {
      return [];
    }

    return rawHistory
      .slice(-CHAT_HISTORY_MAX_MESSAGES)
      .map((entry) => {
        const role = entry?.role === "assistant" ? "assistant" : "user";
        const rawContent =
          typeof entry?.content === "string" ? entry.content.trim() : "";
        if (!rawContent) {
          return null;
        }

        const content =
          rawContent.length > CHAT_HISTORY_MAX_MESSAGE_CHARS
            ? `${rawContent.slice(0, CHAT_HISTORY_MAX_MESSAGE_CHARS)}...`
            : rawContent;

        return {
          content,
          model: typeof entry?.model === "string" ? entry.model : null,
          role,
        };
      })
      .filter(Boolean);
  }

  /**
   * Converts normalized history to a bounded prompt block.
   *
   * @param {Array<{role: "user"|"assistant", content: string}>} history
   * @returns {string}
   */
  serializeConversationHistory(history = []) {
    if (!Array.isArray(history) || history.length === 0) {
      return "No prior messages in this session.";
    }

    let totalChars = 0;
    const lines = [];

    for (const [index, entry] of history.entries()) {
      const label = entry.role === "assistant" ? "ASSISTANT" : "USER";
      const line = `${index + 1}. ${label}: ${entry.content}`;
      totalChars += line.length;

      if (totalChars > CHAT_HISTORY_MAX_TOTAL_CHARS) {
        lines.push("... (older messages truncated due to context size)");
        break;
      }

      lines.push(line);
    }

    return lines.length > 0
      ? lines.join("\n")
      : "No prior messages in this session.";
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new LlmQueueProcessor();
