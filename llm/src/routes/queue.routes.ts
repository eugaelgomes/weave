/**
 * @module weave-engine/modules/weave-ai-chat/chat.processor
 * @description Redis background queue processor for handling LLM requests.
 * Processes jobs from weave-api and routes them to either a direct provider call
 * or the full ReAct agentic loop with MCP tool execution and streaming.
 *
 * The systemMessage is always provided by the caller (weave-api). No system
 * prompts are built or hardcoded inside the engine.
 *
 * Task types:
 *  - `provider_call` (default): Single synchronous LLM call, no tool loop.
 *  - `chat_process`: Full ReAct loop with MCP tool calls and streaming via redis.publish.
 */

import { z } from "zod";
import redis from "@/queues/redis.client";
import { REDIS_QUEUES } from "@/queues/redis-queues";
import { logger } from "@/config/logger";
import { callLLMProvider } from "@/providers/normalizer";
import { executeTask } from "@/processor/executor";
import type { AgenticExecutionContext } from "@/types/engine.types";
import { Tracer } from "@/config/tracing";

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
const ENGINE_JOB_MAX_RETRIES = Number.parseInt(process.env.WEAVE_ENGINE_JOB_MAX_RETRIES || "4", 10);
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

/**
 * Background worker class that polls the Redis queue for new LLM requests.
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
   * Parses the raw JSON job payload and validates the envelope schema.
   *
   * @param {string} rawPayload - Stringified JSON from the Redis queue.
   * @returns {object} The parsed and validated job object.
   * @throws {Error} If parsing or schema validation fails.
   */
  parseRawJob(rawPayload: string) {
    let parsedJob: unknown;
    try {
      parsedJob = JSON.parse(rawPayload);
    } catch (error: unknown) {
      throw new Error(
        `Invalid JSON payload: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const validation = jobEnvelopeSchema.safeParse(parsedJob);
    if (!validation.success) {
      throw new Error(`Invalid envelope schema: ${JSON.stringify(validation.error.issues)}`);
    }

    return validation.data;
  }

  /**
   * Executes the core logic for a single job. Routes the task type, tracks latency,
   * handles retries, and pushes the final success/failure result to the response queue.
   *
   * @param {object} job - The validated job envelope.
   * @returns {Promise<void>}
   */
  async processJob(job: Record<string, unknown>) {
    const payload = (job.payload || {}) as Record<string, unknown>;
    const responseQueueKey = job.responseQueueKey as string;
    const taskType = (job.taskType as string) || "provider_call";
    const requestId = (job.requestId as string) || null;
    const attempts = (job.attempts as number) || 0;
    const createdAt = (job.createdAt as string) || null;

    if (!responseQueueKey) {
      logger.warn("Engine LLM job discarded: missing response queue key");
      return;
    }

    let responsePayload: string;
    const startedAt = Date.now();
    const queueLatencyMs = createdAt ? Date.now() - new Date(createdAt).getTime() : null;

    const organizationId =
      (payload.organizationId as string) ||
      ((payload.context as Record<string, unknown>)?.organizationId as string) ||
      "";

    const traceContext = {
      traceId: requestId || "",
      organizationId,
      userId: (payload.userId as string) || null,
      sessionId: (payload.sessionId as string) || null,
    };

    if (organizationId && requestId) {
      await Tracer.startTrace(traceContext, taskType);
    }

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

      if (organizationId && requestId) {
        await Tracer.endTrace(traceContext.traceId, traceContext, {
          status: "success",
          totalCost: (data as any)?.usage?.totalCost || 0,
          totalTokens: (data as any)?.usage?.totalTokens || 0,
        });
      }
    } catch (error) {
      const normalizedError = this.normalizeTaskError(error, taskType);
      logger.error("Engine LLM task failed", {
        attempts,
        code: normalizedError.code,
        message: normalizedError.message,
        requestId,
        taskType,
      });

      if (organizationId && requestId) {
        await Tracer.endTrace(traceContext.traceId, traceContext, {
          status: "error",
          error: normalizedError.message,
        });
      }

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
   */
  normalizeTaskError(error: unknown, taskType: string) {
    const err = error as Record<string, unknown>;
    return {
      code: typeof err?.code === "string" && err.code ? err.code : "ENGINE_TASK_FAILED",
      message: typeof err?.message === "string" && err.message ? err.message : "Engine task failed",
      taskType,
    };
  }

  /**
   * Persists permanently failed jobs to the dead-letter queue for later inspection.
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
   * Routes the job to the appropriate execution path based on its `taskType`.
   *
   * Supported task types:
   *  - `provider_call` (default): Direct LLM call, no tool loop.
   *  - `chat_process`: Full ReAct loop with MCP tool calls and streaming.
   *
   * @param {string} taskType - The action to perform.
   * @param {object} payload - The domain-specific parameters for the task.
   * @param {string | null} requestId - The request ID used for streaming.
   * @returns {Promise<object>} The resulting data from the execution.
   */
  async executeTask(taskType: string, payload: Record<string, unknown>, requestId: string | null) {
    switch (taskType) {
      case "chat_process": {
        const systemMessage = (payload.systemMessage as string) || "";
        const conversationHistory = this.normalizeConversationHistory(payload.conversationHistory);

        const providerStr = (payload.provider as string) || "openai";
        const resolvedApiKey = (payload.apiKey as string) || "";
        const resolvedBaseURL = (payload.baseURL as string) || undefined;

        const executionContext: AgenticExecutionContext = {
          apiKey: resolvedApiKey,
          baseURL: resolvedBaseURL,
          language:
            (payload.userLanguage as string) ||
            ((payload.context as Record<string, unknown>)?.userLanguage as string) ||
            "en-US",
          maxDurationMs: ENGINE_CHAT_TASK_TIMEOUT_MS,
          onChunk: (chunk: string | Record<string, unknown>) => {
            if (requestId && redis) {
              redis.publish(`stream:${requestId}`, JSON.stringify({ chunk })).catch(() => {});
            }
          },
          organizationId:
            (payload.organizationId as string) ||
            ((payload.context as Record<string, unknown>)?.organizationId as string) ||
            null,
          provider: (payload.provider as string) || "openai",
          thinking: (payload.thinking as AgenticExecutionContext["thinking"]) || undefined,
          userId: (payload.userId as string) || null,
          traceId: requestId || "",
        };

        const result = await Promise.race([
          executeTask({
            allowEdit: Boolean(payload.allowEdit),
            _allowWebSearch: Boolean(payload.allowWebSearch),
            conversationHistory,
            executionContext,
            files: Array.isArray(payload.files) ? payload.files : [],
            tools: Array.isArray(payload.tools) ? payload.tools : [],
            message: (payload.message as string) || "",
            model: (payload.model as string) || "",
            systemMessage,
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              const timeoutError = new Error("Engine chat task timeout") as Error & {
                code?: string;
              };
              timeoutError.code = "ENGINE_CHAT_TASK_TIMEOUT";
              reject(timeoutError);
            }, ENGINE_CHAT_TASK_TIMEOUT_MS + 2000);
          }),
        ]);

        const finalResult = result as Record<string, unknown>;
        const finalMessage =
          (finalResult.data as Record<string, unknown>)?.text ||
          (finalResult.data as Record<string, unknown>)?.content ||
          "";

        return {
          data: {
            citations: [],
            content: finalMessage,
            executedActions: finalResult.executedActions || [],
            response: finalMessage,
            text: finalMessage,
            usage: null,
          },
          executedActions: finalResult.executedActions || [],
          providerUsed: finalResult.providerUsed || null,
          toolCalls: (finalResult.functions as unknown[]) || [],
        };
      }

      case "provider_call":
      default: {
        const providerStr = (payload.provider as string) || "openai";

        const { data, provider: providerUsed } = await callLLMProvider(payload as any);
        return {
          ...data,
          providerUsed,
        };
      }
    }
  }

  /**
   * Intelligently truncates content to avoid breaking markdown code blocks.
   */
  intelligentTruncate(content: string, maxLength: number) {
    if (!content || content.length <= maxLength) {
      return content;
    }

    let truncated = content.slice(0, maxLength);

    const lastSpaceIndex = truncated.lastIndexOf(" ");
    if (lastSpaceIndex > maxLength * 0.8) {
      truncated = truncated.slice(0, lastSpaceIndex);
    }

    const codeBlockMatches = truncated.match(/```/g);
    const codeBlockCount = codeBlockMatches ? codeBlockMatches.length : 0;

    let result = truncated + "\n\n...[TRUNCATED DUE TO SIZE LIMITS]";

    if (codeBlockCount % 2 !== 0) {
      result += "\n```";
    }

    return result;
  }

  /**
   * Normalizes raw conversation history into a standard OpenAI-like format.
   * Implements strict character truncation to prevent context window overflows.
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
          entry?.role === "tool" ? "tool" : entry?.role === "assistant" ? "assistant" : "user";
        const rawContent = typeof entry?.content === "string" ? entry.content.trim() : "";

        const hasTools =
          (entry?.tool_calls !== null && entry?.tool_calls !== undefined) ||
          (entry?.tool_call_id !== null && entry?.tool_call_id !== undefined) ||
          role === "tool";

        if (!rawContent && !hasTools) {
          return null;
        }

        const content = this.intelligentTruncate(rawContent, CHAT_HISTORY_MAX_MESSAGE_CHARS);

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
   * Converts a normalized message array into a single bounded prompt string.
   * Used for models that do not natively support message arrays.
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

    return lines.length > 0 ? lines.join("\n") : "No prior messages in this session.";
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`LlmQueueProcessor started listening on ${this.queueName}`);

    while (this.isRunning) {
      try {
        const result = await redis.brpop(this.queueName, 2);
        if (!result) continue;

        const [, rawPayload] = result;
        if (!rawPayload) continue;

        try {
          const job = this.parseRawJob(rawPayload);
          await this.processJob(job);
        } catch (error: unknown) {
          logger.error("Job parsing or structural validation failed", {
            error: (error as Error).message,
            rawPayload,
          });
        }
      } catch (error: unknown) {
        logger.error("Redis BRPOP failed in LlmQueueProcessor", {
          error: (error as Error).message,
        });
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
    logger.info("LlmQueueProcessor stopped");
  }

  stop() {
    this.isRunning = false;
  }
}

const chatWorker = new LlmQueueProcessor();
export default chatWorker;
