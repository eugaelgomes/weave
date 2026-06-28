/**
 * @module weave-engine/modules/weave-ai/chat.processor
 * @description Redis background queue processor for handling user chat interactions.
 * Processes requests from weave-api, manages conversational context, and coordinates with reasoning engines.
 *
 * Dependencies:
 * - `../../services/redis.client`: For queue interactions (blpop, lpush, rpush).
 * - `../core/orchestration/reasoning.engine`: Core agentic loop logic.
 * - `../core/providers/llm-provider.client`: Fallback basic LLM calls.
 *
 * Used by:
 * - `weave-engine/src/index.js`: Instantiated at startup to begin background processing.
 */
/* eslint-disable sort-keys */
const { z } = require("zod");
const redis = require("../../infrastructure/cache/redis.client");
const {
  getEngineLlmRequestQueueRedisKey,
} = require("../../infrastructure/cache/redis-queue-keys");
const { logger } = require("../../infrastructure/logger");
const {
  buildChatSystemMessage,
} = require("../../ai-core/prompts/agent-prompts");
const {
  buildEntityContext,
} = require("../../ai-core/context/entity-context.loader");
const {
  executeAgenticTask,
  generateSmartResponse,
  processThinkingPhase,
} = require("../../ai-core/orchestration/reasoning.engine");
const {
  callAIProvider,
} = require("../../ai-core/providers/llm-provider.client");
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
  process.env.WEAVE_CHAT_CONTEXT_MAX_MESSAGE_CHARS || "35000",
  10
);
const CHAT_HISTORY_MAX_TOTAL_CHARS = Number.parseInt(
  process.env.WEAVE_CHAT_CONTEXT_MAX_TOTAL_CHARS || "150000",
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

const jobEnvelopeSchema = z
  .object({
    responseQueueKey: z.string().trim().min(1),
    payload: z.object({}).passthrough(),
    attempts: z.number().int().nonnegative().catch(0).default(0),
    createdAt: z
      .string()
      .catch(() => new Date().toISOString())
      .default(() => new Date().toISOString()),
    requestId: z
      .string()
      .trim()
      .catch(null)
      .default(null)
      .transform((v) => (v === "" ? null : v)),
    taskType: z
      .string()
      .trim()
      .catch("provider_call")
      .default("provider_call")
      .transform((v) => (v === "" ? "provider_call" : v)),
  })
  .passthrough();

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

/**
 * Background worker class that continuously polls the Redis queue for new LLM requests.
 * Parses jobs, validates envelopes, and executes the requested AI task type.
 */
class LlmQueueProcessor {
  constructor() {
    this.isRunning = false;
    this.queueName = getEngineLlmRequestQueueRedisKey();
  }

  /**
   * Starts the continuous Redis blocking pop loop to fetch and process jobs.
   * Runs indefinitely until stopped.
   *
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info("Engine LLM processor started", { queueName: this.queueName });

    while (this.isRunning) {
      try {
        // Block for 5 seconds waiting for a new job.
        // This prevents CPU spin-waiting while keeping response latency low.
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
   * Parses the raw JSON job payload and normalizes required fields like attempts and taskType.
   * Pushes to dead-letter queue if parsing fails.
   *
   * @param {string} rawPayload - Stringified JSON from the Redis queue.
   * @returns {object|null} The parsed job object or null if invalid.
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

    const validation = jobEnvelopeSchema.safeParse(parsedJob);
    if (!validation.success) {
      logger.warn("Engine LLM job discarded: invalid envelope", {
        issues: validation.error.issues,
      });
      this.pushDeadLetter({
        errorCode: "ENGINE_JOB_INVALID_ENVELOPE",
        errorMessage: "Invalid job envelope",
        job: parsedJob,
      }).catch(() => {});
      return null;
    }

    return validation.data;
  }

  /**
   * Executes the core logic for a single job. Routes the task type, tracks latency,
   * handles retries, and pushes the final success/failure result back to the response queue.
   *
   * @param {object} job - The validated job envelope.
   * @param {object} [job.payload] - The task-specific arguments.
   * @param {string} job.responseQueueKey - Redis key to publish the result to.
   * @param {string} [job.taskType] - The specific AI task (e.g. 'chat_v2_process').
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
      const data = await this.executeTask(taskType, payload, requestId);
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
   * Normalizes generic error objects into a standard shape for API consumption.
   *
   * @param {unknown} error - The caught exception.
   * @param {string} taskType - The task that threw the error.
   * @returns {{ code: string, message: string, taskType: string }} Normalized error payload.
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
   * Persists permanently failed or malformed jobs to a dead-letter queue for later inspection.
   *
   * @param {object} deadLetterPayload - The failure details and original job data.
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
   * Routes the job to the appropriate domain logic based on its `taskType`.
   *
   * @param {string} taskType - The action to perform (e.g., 'build_system_message', 'chat_v2_process').
   * @param {object} payload - The domain-specific parameters for the task.
   * @param {string} requestId - The ID of the request for streaming.
   * @returns {Promise<object>} The resulting data from the execution.
   */
  async executeTask(taskType, payload, requestId) {
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
          systemMessage: buildChatSystemMessage({
            ...additionalContext,
            indexedNotes: entityContext.indexedNotes,
            indexedProjects: entityContext.indexedProjects,
            organizationMembers: entityContext.organizationMembers,
            organizationInfo: entityContext.organizationInfo,
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

        const {
          data,
          providerUsed,
          executedActions = [],
        } = await Promise.race([
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
              language:
                payload.userLanguage ||
                payload.context?.userLanguage ||
                "en-US",
              onChunk: (chunk) => {
                if (requestId && redis) {
                  redis
                    .publish(`stream:${requestId}`, JSON.stringify({ chunk }))
                    .catch(() => {});
                }
              },
            },
          }),
          new Promise((_, reject) => {
            // Safety timeout to prevent permanently stalled agent loops from hanging the queue worker
            setTimeout(() => {
              const timeoutError = new Error("Engine chat task timeout");
              timeoutError.code = "ENGINE_CHAT_TASK_TIMEOUT";
              reject(timeoutError);
            }, ENGINE_CHAT_TASK_TIMEOUT_MS + 2000); // Give the inner agentic loop time to exit gracefully
          }),
        ]);

        const functions =
          data?.type === "function_call"
            ? data.toolCalls || (data.functionCall ? [data.functionCall] : [])
            : [];

        return {
          data: {
            citations: data?.citations || [],
            content: data?.content || null,
            response: data?.text || data?.content || null,
            text: data?.text || null,
            executedActions: executedActions || [],
            usage: data?.usage || null,
          },
          executedActions: executedActions || [],
          functions,
          providerUsed,
        };
      }
    }
  }

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

    const baseMessage = buildChatSystemMessage({
      ...payload.context,
      projectIds,
      noteIds,
      indexedNotes: entityContext.indexedNotes,
      indexedProjects: entityContext.indexedProjects,
      organizationMembers: entityContext.organizationMembers,
      organizationInfo: entityContext.organizationInfo,
      userLanguage: payload.userLanguage || payload.context?.userLanguage,
    });
    const agentInstructions = this.extractAgentInstructions(payload.agent);
    const noteDocumentContract = payload?.context?.noteDocumentContract || null;
    const composeOverlay =
      isEngineComposeSurface(payload.context) ||
      payload.useCase === "engine_compose" ||
      payload.context?.useCase === "engine_compose"
        ? `\n\n${buildEngineComposePromptOverlay(payload.context || {})}`
        : "";

    const fileSummary =
      files.length === 0
        ? "none"
        : files
            .map(
              (file, index) =>
                `${index + 1}. ${file.name || "file"} (${file.mimeType || "bin"}, ${file.sizeBytes || 0}B)`
            )
            .join("\n  ");

    let orchestratorPrompt = "";
    if (!payload.isSubAgent && !payload.context?.isSubAgent) {
      const fallbackSystemAgents = [
        {
          id: "sys_researcher",
          name: "Researcher",
          description:
            "Expert in researching facts, summarizing articles, and deep data analysis.",
        },
        {
          id: "sys_writer",
          name: "Writer",
          description:
            "Expert in technical writing, document formatting, and proofreading.",
        },
      ];

      const agentsToList =
        payload.availableAgents?.length > 0
          ? payload.availableAgents
          : fallbackSystemAgents;

      const agentsList = agentsToList
        .map((a) => `- ${a.name} (ID: ${a.id}): ${a.description || ""}`)
        .join("\n");

      orchestratorPrompt = `\n\n[Multi-Agent Orchestrator]\nYou act as a Multi-Agent Orchestrator. If the user's task is complex and could benefit from specialized agents, use the 'delegate_to_agent' tool.\nAvailable agents:\n${agentsList}`;
    }

    return `${baseMessage}${composeOverlay}

[Context (v2)]
- userId: ${payload.userId || "unknown"}
- sessionId: ${payload.sessionId || "unknown"}
- noteIds: ${noteIds.length > 0 ? noteIds.join(",") : "none"}
- projectIds: ${projectIds.length > 0 ? projectIds.join(",") : "none"}
- orgId: ${organizationId || "unknown"}
- lang: ${payload.userLanguage || payload.context?.userLanguage || "unknown"}
- allowEdit: ${payload.allowEdit ? "true" : "false"}
- files: ${files.length === 0 ? "none" : `\n  ${fileSummary}`}
${
  noteDocumentContract
    ? `
[Note Blocks Contract]
- Allowed block types: ${Array.isArray(noteDocumentContract.allowedBlockTypes) ? noteDocumentContract.allowedBlockTypes.join(", ") : "unknown"}
- IMPORTANT: To read exact task blocks, use the read_note_content tool.
- IMPORTANT: Use the 'blocks' parameter in create_note/update_note_content tools when editing.
- Each block: { type, properties: { text, attrs? } }
- DO NOT use raw markdown in content strings. Structure content as blocks.
- Never return empty. Must use structured function call if db action needed.`
    : ""
}
Respond clearly.${agentInstructions ? `\n\n[Agent]: ${agentInstructions}` : ""}${orchestratorPrompt}`;
  }

  /**
   * Extracts agent personality instructions and metadata to append to system prompts.
   *
   * @param {object|null|undefined} agent - The custom AI agent database record.
   * @returns {string} Formatted instructions string.
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
   * Intelligently truncates content to avoid breaking markdown code blocks or cutting words in half.
   *
   * @param {string} content - The content to truncate.
   * @param {number} maxLength - The maximum character length.
   * @returns {string} The safely truncated content.
   */
  intelligentTruncate(content, maxLength) {
    if (!content || content.length <= maxLength) {
      return content;
    }

    let truncated = content.slice(0, maxLength);

    // Try not to cut a word in half by backtracking to the last space,
    // as long as we don't lose more than 20% of our budget.
    const lastSpaceIndex = truncated.lastIndexOf(" ");
    if (lastSpaceIndex > maxLength * 0.8) {
      truncated = truncated.slice(0, lastSpaceIndex);
    }

    // Count markdown code blocks to ensure we don't leave one unclosed.
    const codeBlockMatches = truncated.match(/```/g);
    const codeBlockCount = codeBlockMatches ? codeBlockMatches.length : 0;

    let result = truncated + "\n\n...[TRUNCATED DUE TO SIZE LIMITS]";

    // If there is an odd number of ``` markers, the block is open, so close it.
    if (codeBlockCount % 2 !== 0) {
      result += "\n```";
    }

    return result;
  }

  /**
   * Normalizes raw conversation history sent by the server into a standard OpenAI-like format.
   * Implements strict character truncation to prevent context window overflows.
   *
   * @param {unknown} rawHistory - Array of previous chat messages.
   * @returns {Array<{role: "user"|"assistant", content: string}>} The sanitized context window.
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

        const content = this.intelligentTruncate(
          rawContent,
          CHAT_HISTORY_MAX_MESSAGE_CHARS
        );

        return {
          content,
          model: typeof entry?.model === "string" ? entry.model : null,
          role,
        };
      })
      .filter(Boolean);
  }

  /**
   * Converts a normalized array of history messages into a single bounded prompt block string.
   * Used for models that do not natively support message arrays.
   *
   * @param {Array<{role: "user"|"assistant", content: string}>} history - Normalized history.
   * @returns {string} The serialized prompt string.
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
