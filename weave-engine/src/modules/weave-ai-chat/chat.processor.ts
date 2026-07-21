/**
 * @module weave-engine/modules/weave-ai/chat.processor
 * @description Redis background queue processor for handling user chat interactions.
 * Processes requests from weave-api, manages conversational context, and coordinates with reasoning engines.
 *
 * Dependencies:
 * - `../../services/redis.client`: For queue interactions (blpop, lpush, rpush).
 * - `./reasoning.engine`: Core agentic loop logic.
 * - `../services/llm/llm-provider.client`: Fallback basic LLM calls.
 *
 * Used by:
 * - `weave-engine/src/index.js`: Instantiated at startup to begin background processing.
 */

import { z } from "zod";
import redis from "@/queues/redis.client";
import { REDIS_QUEUES } from "@/queues/redis-queues";
import { logger } from "@/config/logger";
import { buildChatSystemMessage } from "@/modules/weave-ai-chat/agents/prompts/agent-prompts";
import { buildEntityContext } from "@/utils/entity-context.loader";
import {
  generateSmartResponse,
  processThinkingPhase,
} from "@/modules/weave-ai-chat/engines/reasoning.engine";
import { buildChatGraph } from "@/modules/weave-ai-chat/agents/chat.graph";
import { callAIProvider } from "@/llm-conectors/llm-provider.client";
import {
  isEngineComposeSurface,
  buildEngineComposePromptOverlay,
} from "@/modules/weave-ai-chat/utils/compose-prompt";

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
const MAX_GRAPH_ITERATIONS = Number.parseInt(
  process.env.WEAVE_ENGINE_MAX_REACT_ITERATIONS || "8",
  10
);
const ENGINE_JOB_MAX_RETRIES = Number.parseInt(
  process.env.WEAVE_ENGINE_JOB_MAX_RETRIES || "4",
  10
);
const ENGINE_DEAD_LETTER_QUEUE_KEY = REDIS_QUEUES.ENGINE_DEAD_LETTER.key;

const jobEnvelopeSchema = z
  .object({
    attempts: z.number().int().nonnegative().catch(0).default(0),
    createdAt: z
      .string()
      .catch(() => new Date().toISOString())
      .default(() => new Date().toISOString()),
    payload: z.object({}).passthrough(),
    requestId: z
      .string()
      .trim()
      .catch(null as unknown as string)
      .default(null as unknown as string)
      .transform((v) => (v === "" ? null : v)),
    responseQueueKey: z.string().trim().min(1),
    taskType: z
      .string()
      .trim()
      .catch("provider_call")
      .default("provider_call")
      .transform((v) => (v === "" ? "provider_call" : v)),
  })
  .passthrough();

function resolveOrganizationId(payload: Record<string, unknown> = {}, context: Record<string, unknown> = {}) {
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
  isRunning: boolean;
  queueName: string;

  constructor() {
    this.isRunning = false;
    this.queueName = REDIS_QUEUES.ENGINE_LLM_REQUESTS.key;
  }

  /**
   * Parses the raw JSON job payload and normalizes required fields like attempts and taskType.
   * Throws an error if parsing or validation fails.
   *
   * @param {string} rawPayload - Stringified JSON from the Redis queue.
   * @returns {object} The parsed job object.
   * @throws {Error} If parsing or schema validation fails.
   */
  parseRawJob(rawPayload: string) {
    let parsedJob: unknown;
    try {
      parsedJob = JSON.parse(rawPayload);
    } catch (error: unknown) {
      throw new Error(`Invalid JSON payload: ${error instanceof Error ? error.message : String(error)}`);
    }

    const validation = jobEnvelopeSchema.safeParse(parsedJob);
    if (!validation.success) {
      throw new Error(
        `Invalid envelope schema: ${JSON.stringify(validation.error.issues)}`
      );
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
  async processJob(job: Record<string, unknown>) {
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
  normalizeTaskError(error: unknown, taskType: string) {
    const err = error as Record<string, unknown>;
    return {
      code:
        typeof err?.code === "string" && err.code
          ? err.code
          : "ENGINE_TASK_FAILED",
      message:
        typeof err?.message === "string" && err.message
          ? err.message
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
  async pushDeadLetter(deadLetterPayload: Record<string, unknown>) {
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
  async executeTask(taskType: string, payload: Record<string, unknown>, requestId: string | null) {
    switch (taskType) {
      case "build_system_message": {
        const additionalContext = (payload.additionalContext || {}) as Record<string, unknown>;
        const organizationId = resolveOrganizationId(
          payload,
          additionalContext
        );
        const entityContext = await buildEntityContext({
          noteIds: payload.noteIds || additionalContext.noteIds,
          organizationId,
          projectIds: payload.projectIds || additionalContext.projectIds,
          userId: payload.userId || additionalContext.userId,
        });

        return {
          systemMessage: buildChatSystemMessage({
            ...additionalContext,
            indexedNotes: entityContext.indexedNotes,
            indexedProjects: entityContext.indexedProjects,
            organizationInfo: entityContext.organizationInfo,
            organizationMembers: entityContext.organizationMembers,
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

        const initialState = {
          availableAgents: payload.availableAgents || [],
          executedActions: [],
          executionContext: {
            language:
              payload.userLanguage || payload.context?.userLanguage || "en-US",
            maxDurationMs: ENGINE_CHAT_TASK_TIMEOUT_MS,
            onChunk: (chunk: string) => {
              if (requestId && redis) {
                redis
                  .publish(`stream:${requestId}`, JSON.stringify({ chunk }))
                  .catch(() => {});
              }
            },
            organizationId:
              payload.organizationId ||
              payload.context?.organizationId ||
              payload.context?.organization_id ||
              null,
            userId: payload.userId || null,
          },
          jobContext: {
            model: payload.model || null,
            systemMessage: systemMessage,
          },
          messages: [{ content: payload.message || "", role: "user" }],
          options: {
            allowEdit: Boolean(payload.allowEdit),
            allowWebSearch: Boolean(payload.allowWebSearch),
          },
        };

        if (conversationHistory.length > 0) {
          initialState.messages = [
            ...conversationHistory,
            ...initialState.messages,
          ];
        }

        const graph = buildChatGraph();

        const finalState = await Promise.race([
          graph.run(initialState, { maxIterations: MAX_GRAPH_ITERATIONS }),
          new Promise((_, reject) => {
            // Safety timeout to prevent permanently stalled agent loops from hanging the queue worker
            setTimeout(() => {
              const timeoutError = new Error("Engine chat task timeout") as Error & { code?: string };
              timeoutError.code = "ENGINE_CHAT_TASK_TIMEOUT";
              reject(timeoutError);
            }, ENGINE_CHAT_TASK_TIMEOUT_MS + 2000); // Give the inner loop time to exit gracefully
          }),
        ]);

        const providerUsed = finalState.providerUsed || null;
        const executedActions = finalState.executedActions || [];

        let toolCalls = [];
        if (finalState.externalToolCalls) {
          toolCalls = finalState.externalToolCalls;
        }

        const finalMessage = finalState.finalResponse || "";

        return {
          data: {
            citations: [],
            content: finalMessage,
            executedActions: executedActions,
            response: finalMessage,
            text: finalMessage,
            usage: null,
          },
          executedActions: executedActions,
          providerUsed,
          toolCalls,
        };
      }
    }
  }

  async buildChatV2SystemMessage(payload: Record<string, unknown> = {}) {
    const noteIds = Array.isArray(payload.noteIds) ? payload.noteIds : [];
    const projectIds = Array.isArray(payload.projectIds)
      ? payload.projectIds
      : [];
    const files = Array.isArray(payload.files) ? payload.files : [];
    const organizationId = resolveOrganizationId(
      payload,
      (payload.context as Record<string, unknown>) || {}
    );
    const entityContext = await buildEntityContext({
      noteIds,
      organizationId,
      projectIds,
      userId: payload.userId,
    });

    const baseMessage = buildChatSystemMessage({
      ...(payload.context as object),
      indexedNotes: entityContext.indexedNotes,
      indexedProjects: entityContext.indexedProjects,
      noteIds,
      organizationInfo: entityContext.organizationInfo,
      organizationMembers: entityContext.organizationMembers,
      projectIds,
      userLanguage: payload.userLanguage || (payload.context as Record<string, unknown>)?.userLanguage,
    });
    const agentInstructions = this.extractAgentInstructions(payload.agent);
    const noteDocumentContract = (payload?.context as Record<string, unknown>)?.noteDocumentContract || null;
    const composeOverlay =
      isEngineComposeSurface(payload.context) ||
      payload.useCase === "engine_compose" ||
      (payload.context as Record<string, unknown>)?.useCase === "engine_compose"
        ? `\n\n${buildEngineComposePromptOverlay((payload.context as Record<string, unknown>) || {})}`
        : "";

    const fileSummary =
      files.length === 0
        ? "none"
        : files
            .map(
              (file: Record<string, unknown>, index: number) =>
                `${index + 1}. ${file.name || "file"} (${file.mimeType || "bin"}, ${file.sizeBytes || 0}B)`
            )
            .join("\n  ");

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
Respond clearly.${agentInstructions ? `\n\n[Agent]: ${agentInstructions}` : ""}`;
  }

  /**
   * Extracts agent personality instructions and metadata to append to system prompts.
   *
   * @param {object|null|undefined} agent - The custom AI agent database record.
   * @returns {string} Formatted instructions string.
   */
  extractAgentInstructions(agent: Record<string, unknown> | null | undefined) {
    if (!agent || typeof agent !== "object") {
      return "";
    }

    const personality = (agent.personality as Record<string, unknown>) || {};
    const persona = (personality.persona as Record<string, unknown>) || {};
    const metadata = (personality.metadata as Record<string, unknown>) || {};
    const behavior = (personality.behavior as Record<string, unknown>) || {};
    const systemInstructions = (behavior.system_instructions as Record<string, unknown>) || {};
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
  intelligentTruncate(content: string, maxLength: number) {
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
  normalizeConversationHistory(rawHistory: unknown) {
    if (!Array.isArray(rawHistory) || rawHistory.length === 0) {
      return [];
    }

    return rawHistory
      .slice(-CHAT_HISTORY_MAX_MESSAGES)
      .map((entryRaw: unknown) => {
        const entry = entryRaw as Record<string, unknown>;
        const role =
          entry?.role === "tool"
            ? "tool"
            : entry?.role === "assistant"
              ? "assistant"
              : "user";
        const rawContent =
          typeof entry?.content === "string" ? entry.content.trim() : "";

        const hasTools =
          (entry?.tool_calls !== null && entry?.tool_calls !== undefined) ||
          (entry?.tool_call_id !== null && entry?.tool_call_id !== undefined) ||
          role === "tool";

        if (!rawContent && !hasTools) {
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
          ...(entry?.tool_calls ? { tool_calls: entry.tool_calls } : {}),
          ...(entry?.tool_call_id ? { tool_call_id: entry.tool_call_id } : {}),
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
  serializeConversationHistory(history: Record<string, unknown>[] = []) {
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

const chatProcessor = new LlmQueueProcessor();
export default chatProcessor;
