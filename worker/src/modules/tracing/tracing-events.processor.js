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
      where: { id: traceData.id },
      update: {
        end_time: traceData.endTime ? new Date(traceData.endTime) : null,
        status: traceData.status || "running",
        total_tokens: traceData.totalTokens || 0,
        total_cost: traceData.totalCost || 0.0,
        metadata: traceData.metadata || {},
      },
      create: {
        id: traceData.id,
        organization_id: traceData.organizationId,
        user_id: traceData.userId || null,
        project_id: traceData.projectId || null,
        session_id: traceData.sessionId || null,
        name: traceData.name,
        start_time: traceData.startTime ? new Date(traceData.startTime) : new Date(),
        end_time: traceData.endTime ? new Date(traceData.endTime) : null,
        status: traceData.status || "running",
        total_tokens: traceData.totalTokens || 0,
        total_cost: traceData.totalCost || 0.0,
        metadata: traceData.metadata || {},
      },
    });
  }

  async upsertSpan(spanData) {
    await prisma.spans.upsert({
      where: { id: spanData.id },
      update: {
        end_time: spanData.endTime ? new Date(spanData.endTime) : null,
        status: spanData.status || "running",
        output: spanData.output || {},
        error_message: spanData.errorMessage || null,
        prompt_tokens: spanData.promptTokens || 0,
        completion_tokens: spanData.completionTokens || 0,
        model: spanData.model || null,
        metadata: spanData.metadata || {},
      },
      create: {
        id: spanData.id,
        trace_id: spanData.traceId,
        parent_span_id: spanData.parentSpanId || null,
        organization_id: spanData.organizationId,
        name: spanData.name,
        span_type: spanData.spanType,
        start_time: spanData.startTime ? new Date(spanData.startTime) : new Date(),
        end_time: spanData.endTime ? new Date(spanData.endTime) : null,
        status: spanData.status || "running",
        input: spanData.input || {},
        output: spanData.output || {},
        error_message: spanData.errorMessage || null,
        prompt_tokens: spanData.promptTokens || 0,
        completion_tokens: spanData.completionTokens || 0,
        model: spanData.model || null,
        metadata: spanData.metadata || {},
      },
    });
  }
}

module.exports = new TracingEventsProcessor();
