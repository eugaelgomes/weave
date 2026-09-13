const { redisConsumer: redis } = require("@theweave/database");
const { prisma } = require("@theweave/shared");
const { getTracingEventsQueueRedisKey } = require("../../queues/queue-queue-keys");
const { logger } = require("@theweave/database");

class TracingEventsProcessor {
  constructor() {
    this.isRunning = false;
    this.queueName = getTracingEventsQueueRedisKey();
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info("Tracing events processor started", {
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
        logger.error("Tracing events processor loop failed", {
          error: error.message,
          stack: error.stack,
        });
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  stop() {
    this.isRunning = false;
  }

  async processJob(job) {
    try {
      if (job.event === "trace_start" || job.event === "trace_end") {
        await this.upsertTrace(job.payload);
      } else if (job.event === "span_start" || job.event === "span_end") {
        await this.upsertSpan(job.payload);
      } else {
        logger.warn("Unknown tracing event type received", { event: job.event });
      }
    } catch (error) {
      logger.error(`Failed to process tracing event: ${job.event}`, {
        error: error.message,
        payload: job.payload,
      });
      // Em sistemas avançados, poderíamos empurrar para uma DLQ (Dead Letter Queue)
    }
  }

  async upsertTrace(traceData) {
    await prisma.traces.upsert({
      create: {
        end_time: traceData.endTime ? new Date(traceData.endTime) : null,
        id: traceData.id,
        metadata: traceData.metadata || {},
        name: traceData.name,
        workspace_id: traceData.workspaceId,
        project_id: traceData.projectId || null,
        session_id: traceData.sessionId || null,
        start_time: traceData.startTime ? new Date(traceData.startTime) : new Date(),
        status: traceData.status || "running",
        total_cost: traceData.totalCost || 0.0,
        total_tokens: traceData.totalTokens || 0,
        user_id: traceData.userId || null,
      },
      update: {
        end_time: traceData.endTime ? new Date(traceData.endTime) : null,
        metadata: traceData.metadata || {},
        status: traceData.status || "running",
        total_cost: traceData.totalCost || 0.0,
        total_tokens: traceData.totalTokens || 0,
      },
      where: { id: traceData.id },
    });
  }

  async upsertSpan(spanData) {
    await prisma.spans.upsert({
      create: {
        completion_tokens: spanData.completionTokens || 0,
        end_time: spanData.endTime ? new Date(spanData.endTime) : null,
        error_message: spanData.errorMessage || null,
        id: spanData.id,
        input: spanData.input || {},
        metadata: spanData.metadata || {},
        model: spanData.model || null,
        name: spanData.name,
        workspace_id: spanData.workspaceId,
        output: spanData.output || {},
        parent_span_id: spanData.parentSpanId || null,
        prompt_tokens: spanData.promptTokens || 0,
        span_type: spanData.spanType,
        start_time: spanData.startTime ? new Date(spanData.startTime) : new Date(),
        status: spanData.status || "running",
        trace_id: spanData.traceId,
      },
      update: {
        completion_tokens: spanData.completionTokens || 0,
        end_time: spanData.endTime ? new Date(spanData.endTime) : null,
        error_message: spanData.errorMessage || null,
        metadata: spanData.metadata || {},
        model: spanData.model || null,
        output: spanData.output || {},
        prompt_tokens: spanData.promptTokens || 0,
        status: spanData.status || "running",
      },
      where: { id: spanData.id },
    });
  }
}

module.exports = new TracingEventsProcessor();
