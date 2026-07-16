const redis = require("@/services/queue/consumer-connection");
const reasoningsRepository = require("@/modules/engine/repositories/reasonings.repository");
const {
  getAiReportDeliveryQueueRedisKey,
  getEngineProactiveResponseQueueRedisKey,
} = require("@/services/queue/queue-keys");

class ReasoningResponseConsumer {
  constructor() {
    this.isRunning = false;
    this.responseQueueKey = getEngineProactiveResponseQueueRedisKey();
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.info(
      `[Reasoning Consumer] Listening for engine responses on: ${this.responseQueueKey}`
    );

    while (this.isRunning) {
      try {
        // Block waiting for a response
        const result = await redis.blpop(this.responseQueueKey, 0);

        if (result) {
          const [, payloadStr] = result;
          await this.processResponse(JSON.parse(payloadStr));
        }
      } catch (error) {
        console.error("[Reasoning Consumer] Error in response loop:", error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  async processResponse(payload) {
    const { success, reasoning, content, safety } = payload;

    if (!success || !reasoning) {
      console.warn(
        "[Reasoning Consumer] Received unsuccessful response or missing reasoning",
        {
          projectId: reasoning?.projectId,
          success,
        }
      );
      return;
    }

    console.info(
      `[Reasoning Consumer] Persisting reasoning for project: ${reasoning.projectId}`
    );

    try {
      const created = await reasoningsRepository.create({
        content: {
          actionItems: content.actionItems || [],
          inputContext: content.inputContext,
          inputPrompt: content.inputPrompt,
          inputSystemMessage: content.inputSystemMessage,
          outputMarkdown: content.outputMarkdown,
          outputMetadata: content.outputMetadata,
          outputRaw: content.outputRaw,
        },
        options: {
          customRecipients: reasoning.customRecipients,
          expiresAt: reasoning.expiresAt,
          modelUsed: reasoning.modelUsed,
          organizationId: reasoning.organizationId,
          processingTimeMs: reasoning.processingTimeMs,
          providerUsed: reasoning.providerUsed,
          recipientScope: reasoning.recipientScope,
          reportConfigId: reasoning.reportConfigId,
          safetyBlocked: safety.blocked,
          safetyLabel: safety.label,
          safetyReason: safety.reason,
        },
        projectId: reasoning.projectId,
        reasoningType: reasoning.reasoningType,
        sprintId: reasoning.sprintId,
        title: reasoning.title,
        triggeredBy: reasoning.triggeredBy,
      });

      console.info(
        `[Reasoning Consumer] Reasoning persisted with ID: ${created.id}`
      );

      const channels = reasoning.channels || [];
      if (channels.includes("email") && created) {
        await this.dispatchEmailJob(created, payload);
      }
    } catch (error) {
      console.error("[Reasoning Consumer] Failed to process response:", error);
    }
  }

  async dispatchEmailJob(reasoning, fullPayload) {
    const { content } = fullPayload;
    const queueKey = getAiReportDeliveryQueueRedisKey();

    const emailJob = {
      payload: {
        customRecipients: reasoning.custom_recipients,
        outputMarkdown: content.outputMarkdown,
        projectId: reasoning.project_id,
        reasoningId: reasoning.id,
        reasoningType: reasoning.reasoning_type,
        recipientScope: reasoning.recipient_scope,
        sprintId: reasoning.sprint_id,
        title: reasoning.title,
      },
      type: "ai_report_delivery",
    };

    await redis.rpush(queueKey, JSON.stringify(emailJob));
    console.info(
      `[Reasoning Consumer] AI report delivery job dispatched for reasoning: ${reasoning.id}`
    );
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new ReasoningResponseConsumer();
