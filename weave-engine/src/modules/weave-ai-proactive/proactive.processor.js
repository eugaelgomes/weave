/**
 * @module weave-engine/modules/weave-engine/proactive.processor
 * @description Redis background queue processor for handling proactive AI jobs.
 * Executes background tasks asynchronously, such as generating summaries or insights,
 * with a mandatory secondary safety evaluation pass.
 *
 * Dependencies:
 * - `../../services/redis.client`: For queue interactions.
 * - `../core/providers/llm-provider.client`: To call external LLM models.
 *
 * Used by:
 * - `weave-engine/src/index.js`: Instantiated at startup to begin background processing.
 */
const { z } = require("zod");
const redis = require("../../services/cache/redis.client");
const { logger } = require("../../services/logger");
const {
  callAIProvider,
} = require("../../services/llm/llm-provider.client");
const safetyEngine = require("./engines/safety.engine");
const { extractText } = require("./utils/parsers");
const { REDIS_QUEUES } = require("../../services/cache/redis-queues");
const { pool } = require("../../services/database/postgres.client");

const RESPONSE_TTL_SECONDS = 60;

const proactiveJobSchema = z
  .object({
    type: z.string().optional(),
    prompt: z.string().optional(),
    systemMessage: z.string().optional(),
    model: z.string().optional(),
    options: z.object({}).passthrough().optional(),
    responseQueueKey: z.string().optional(),
    payload: z.union([z.string(), z.object({}).passthrough()]).optional(),
    projectId: z.string().optional(),
    sprintId: z.string().optional(),
    reasoningType: z.string().optional(),
    title: z.string().optional(),
    reportConfigId: z.string().optional(),
    organizationId: z.string().optional(),
    triggeredBy: z.string().optional(),
    recipientScope: z.string().optional(),
    customRecipients: z.array(z.string()).optional(),
    expiresAt: z.string().optional(),
    inputContext: z.object({}).passthrough().optional(),
  })
  .passthrough();

class ProactiveQueueProcessor {
  constructor() {
    this.isRunning = false;
    this.queueName = REDIS_QUEUES.ENGINE_PROACTIVE_TASKS.key;
  }

  /**
   * Parses the raw JSON job payload and normalizes required fields.
   * Throws an error if parsing or validation fails.
   *
   * @param {string} rawPayload - Stringified JSON from the Redis queue.
   * @returns {object} The parsed job object.
   * @throws {Error} If parsing or schema validation fails.
   */
  parseRawJob(rawPayload) {
    let parsedJob;
    try {
      parsedJob = JSON.parse(rawPayload);
    } catch (error) {
      throw new Error(`Invalid JSON payload: ${error.message}`);
    }

    const validation = proactiveJobSchema.safeParse(parsedJob);
    if (!validation.success) {
      throw new Error(`Invalid envelope schema: ${JSON.stringify(validation.error.issues)}`);
    }

    return validation.data;
  }

  /**
   * Process proactive jobs with a mandatory two-pass flow:
   * 1) Main proactive generation
   * 2) Compact safety re-check over the generated output
   *
   * The result includes full reasoning metadata for API persistence.
   *
   * @param {object} job
   * @param {string} [job.type]
   * @param {string} [job.prompt]
   * @param {string} [job.systemMessage]
   * @param {string} [job.model]
   * @param {object} [job.options]
   * @param {string} [job.responseQueueKey]
   * @param {object|string} [job.payload]
   * @param {string} [job.projectId]
   * @param {string} [job.sprintId]
   * @param {string} [job.reasoningType]
   * @param {string} [job.title]
   * @param {string} [job.reportConfigId]
   * @param {string} [job.organizationId]
   * @param {string} [job.triggeredBy]
   * @param {string} [job.recipientScope]
   * @param {string[]} [job.customRecipients]
   * @param {string} [job.expiresAt]
   * @returns {Promise<void>}
   */
  async processJob(job = {}) {
    const jobType = job.type || job.reasoningType || "unknown";
    const startTime = Date.now();
    logger.info("Received proactive job", { jobType });

    let finalPayload;

    try {
      const { createInitialState } = require("./agents/proactive.state");
      const { proactiveGraph } = require("./agents/proactive.graph");

      const initialState = createInitialState(job);
      const finalState = await proactiveGraph.run(initialState, {
        maxIterations: 7,
      });

      const initialResult = {
        content:
          finalState.finalOutput ||
          finalState.analysisResult ||
          "No output generated.",
        providerUsed: finalState.providerUsed || null,
        raw: finalState,
      };

      const safetyCheck = await safetyEngine.runSafetyRecheck(job, initialResult);
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
        blocked: finalPayload.safety.blocked,
        jobType,
        processingTimeMs,
        safetyLabel: finalPayload.safety.label,
      });
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      logger.error("Proactive job failed", {
        error: error.message,
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
          errorMessage: error.message,
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
      try {
        const userRes = await pool.query(
          "SELECT email, deleted_at FROM users WHERE id = $1 LIMIT 1",
          [job.triggeredBy]
        );
        if (userRes.rows.length > 0) {
          const user = userRes.rows[0];
          if (!user.deleted_at) {
            const emailPayload = {
              to: user.email,
              subject: "Proactive Reasoning Job Failed",
              text: `Your background proactive reasoning job '${job.title || jobType}' has failed to process.`,
              html: `<p>Your background proactive reasoning job <b>${job.title || jobType}</b> has failed to process.</p>`,
            };
            await redis.lpush(
              REDIS_QUEUES.EMAIL.key,
              JSON.stringify({
                payload: emailPayload,
                queuedAt: new Date().toISOString(),
              })
            );
            logger.info("Sent failure notification email to user", {
              userId: job.triggeredBy,
            });
          }
        }
      } catch (dbErr) {
        logger.error("Failed to fetch user or send failure email", {
          error: dbErr.message,
        });
      }
    }
  }

  /**
   * Executes the first pass of the proactive logic by calling the main LLM.
   *
   * @param {object} job - The job parameters containing the prompt.
   * @returns {Promise<{ content: string, providerUsed: string|null, raw: unknown }>} The generated text and metadata.
   */
  async runPrimaryPass(job = {}) {
    if (typeof job.payload === "string" && job.payload.trim()) {
      return {
        content: job.payload.trim(),
        providerUsed: null,
        raw: job.payload,
      };
    }

    if (job.payload && typeof job.payload === "object" && job.payload.content) {
      return {
        content: String(job.payload.content).trim(),
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



  stop() {
    this.isRunning = false;
  }
}

module.exports = new ProactiveQueueProcessor();
