/**
 * @module weave-engine/modules/weave-engine/proactive.processor
 * @description Redis background queue processor for handling proactive AI jobs.
 * Executes background tasks asynchronously, such as generating summaries or insights,
 * with a mandatory secondary safety evaluation pass.
 */

import { z } from "zod";
import redis from "@/queues/redis.client";
import { logger } from "@/config/logger";
import { callAIProvider } from "@/llm-conectors/llm-provider.client";
import safetyEngine from "./engines/safety.engine";
import { extractText } from "./utils/parsers";
import { REDIS_QUEUES } from "@/queues/redis-queues";

import { createInitialState } from "./agents/proactive.state";
import { proactiveGraph } from "./agents/proactive.graph";

const RESPONSE_TTL_SECONDS = 60;

const proactiveJobSchema = z
  .object({
    customRecipients: z.array(z.string()).optional(),
    expiresAt: z.string().optional(),
    inputContext: z.object({}).passthrough().optional(),
    model: z.string().optional(),
    options: z.object({}).passthrough().optional(),
    organizationId: z.string().optional(),
    payload: z.union([z.string(), z.object({}).passthrough()]).optional(),
    projectId: z.string().optional(),
    prompt: z.string().optional(),
    reasoningType: z.string().optional(),
    recipientScope: z.string().optional(),
    reportConfigId: z.string().optional(),
    responseQueueKey: z.string().optional(),
    sprintId: z.string().optional(),
    systemMessage: z.string().optional(),
    title: z.string().optional(),
    triggeredBy: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

class ProactiveQueueProcessor {
  isRunning: boolean;
  queueName: string;

  constructor() {
    this.isRunning = false;
    this.queueName = REDIS_QUEUES.ENGINE_PROACTIVE_TASKS.key;
  }

  parseRawJob(rawPayload: string): z.infer<typeof proactiveJobSchema> {
    let parsedJob: unknown;
    try {
      parsedJob = JSON.parse(rawPayload);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid JSON payload: ${msg}`);
    }

    const validation = proactiveJobSchema.safeParse(parsedJob);
    if (!validation.success) {
      throw new Error(
        `Invalid envelope schema: ${JSON.stringify(validation.error.issues)}`
      );
    }

    return validation.data;
  }

  async processJob(job: z.infer<typeof proactiveJobSchema> = {}): Promise<void> {
    const jobType = job.type || job.reasoningType || "unknown";
    const startTime = Date.now();
    logger.info("Received proactive job", { jobType });

    let finalPayload: Record<string, unknown>;

    try {
      const initialState = createInitialState(job);
      const finalState = (await proactiveGraph.run(
        initialState as unknown as Record<string, unknown>,
        {
          maxIterations: 7,
        }
      )) as any;

      const initialResult = {
        content:
          finalState.finalOutput ||
          finalState.analysisResult ||
          "No output generated.",
        providerUsed: finalState.providerUsed || null,
        raw: finalState,
      };

      const safetyCheck = await safetyEngine.runSafetyRecheck(
        job,
        initialResult
      );
      const safePolicyResult = safetyEngine.applySafetyPolicy(
        initialResult,
        safetyCheck
      );

      const processingTimeMs = Date.now() - startTime;

      finalPayload = {
        ...safePolicyResult,
        content: {
          actionItems: [],
          inputContext: job.inputContext || {},
          inputPrompt: job.prompt || null,
          inputSystemMessage: job.systemMessage || null,
          outputMarkdown: safePolicyResult.data.content,
          outputMetadata: {},
          outputRaw: initialResult.raw,
        },
        reasoning: {
          customRecipients: job.customRecipients || [],
          expiresAt: job.expiresAt || null,
          modelUsed: job.model || null,
          organizationId: job.organizationId || null,
          processingTimeMs,
          projectId: job.projectId || null,
          providerUsed: initialResult.providerUsed,
          reasoningType: job.reasoningType || jobType,
          recipientScope: job.recipientScope || "all_members",
          reportConfigId: job.reportConfigId || null,
          sprintId: job.sprintId || null,
          title: job.title || `${jobType} reasoning`,
          triggeredBy: job.triggeredBy || null,
        },
      };

      logger.info("Proactive job finished with safety re-check", {
        blocked: (finalPayload as any).safety?.blocked,
        jobType,
        processingTimeMs,
        safetyLabel: (finalPayload as any).safety?.label,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const processingTimeMs = Date.now() - startTime;
      logger.error("Proactive job failed", {
        error: msg,
        jobType,
        processingTimeMs,
      });

      finalPayload = {
        content: {
          actionItems: [],
          inputContext: job.inputContext || {},
          inputPrompt: job.prompt || null,
          inputSystemMessage: job.systemMessage || null,
          outputMarkdown: "",
          outputMetadata: {},
          outputRaw: null,
        },
        data: { content: null, providerUsed: null },
        reasoning: {
          customRecipients: job.customRecipients || [],
          errorMessage: msg,
          expiresAt: job.expiresAt || null,
          modelUsed: job.model || null,
          organizationId: job.organizationId || null,
          processingTimeMs,
          projectId: job.projectId || null,
          providerUsed: null,
          reasoningType: job.reasoningType || jobType,
          recipientScope: job.recipientScope || "all_members",
          reportConfigId: job.reportConfigId || null,
          sprintId: job.sprintId || null,
          status: "failed",
          title: job.title || `${jobType} reasoning`,
          triggeredBy: job.triggeredBy || null,
        },
        safety: {
          blocked: false,
          checked: false,
          label: "review",
          reason: "Job failed",
        },
        success: false,
      };
    }

    if (job.responseQueueKey) {
      await redis.lpush(job.responseQueueKey, JSON.stringify(finalPayload));
      await redis.expire(job.responseQueueKey, RESPONSE_TTL_SECONDS);
    }

    if (!finalPayload.success && job.triggeredBy) {
      logger.warn("Job failed for user. Email notification omitted due to DB decoupling.", {
        userId: job.triggeredBy
      });
    }
  }

  async runPrimaryPass(job: z.infer<typeof proactiveJobSchema> = {}): Promise<Record<string, unknown>> {
    if (typeof job.payload === "string" && job.payload.trim()) {
      return {
        content: job.payload.trim(),
        providerUsed: null,
        raw: job.payload,
      };
    }

    if (job.payload && typeof job.payload === "object" && (job.payload as Record<string, unknown>).content) {
      return {
        content: String((job.payload as Record<string, unknown>).content).trim(),
        providerUsed: null,
        raw: job.payload,
      };
    }

    if (!job.prompt || !job.systemMessage) {
      throw new Error(
        "Invalid proactive job: prompt and systemMessage are required when payload content is not provided"
      );
    }

    const { data, provider } = await callAIProvider({
      model: job.model || null,
      options: job.options || {},
      prompt: job.prompt,
      systemMessage: job.systemMessage,
    });

    return {
      content: extractText(data),
      providerUsed: provider || null,
      raw: data,
    };
  }

  stop(): void {
    this.isRunning = false;
  }
}

const proactiveProcessor = new ProactiveQueueProcessor();
export default proactiveProcessor;
