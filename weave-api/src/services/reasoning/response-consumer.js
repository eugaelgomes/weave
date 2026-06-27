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

    console.log(
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
          success,
          projectId: reasoning?.projectId,
        }
      );
      return;
    }

    console.log(
      `[Reasoning Consumer] Persisting reasoning for project: ${reasoning.projectId}`
    );

    try {
      const created = await reasoningsRepository.create({
        projectId: reasoning.projectId,
        sprintId: reasoning.sprintId,
        triggeredBy: reasoning.triggeredBy,
        reasoningType: reasoning.reasoningType,
        title: reasoning.title,
        content: {
          outputMarkdown: content.outputMarkdown,
          outputRaw: content.outputRaw,
          outputMetadata: content.outputMetadata,
          inputContext: content.inputContext,
          inputPrompt: content.inputPrompt,
          inputSystemMessage: content.inputSystemMessage,
          actionItems: content.actionItems || [],
        },
        options: {
          reportConfigId: reasoning.reportConfigId,
          organizationId: reasoning.organizationId,
          providerUsed: reasoning.providerUsed,
          modelUsed: reasoning.modelUsed,
          safetyLabel: safety.label,
          safetyReason: safety.reason,
          safetyBlocked: safety.blocked,
          processingTimeMs: reasoning.processingTimeMs,
          recipientScope: reasoning.recipientScope,
          customRecipients: reasoning.customRecipients,
          expiresAt: reasoning.expiresAt,
        },
      });

      console.log(
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
      type: "ai_report_delivery",
      payload: {
        reasoningId: reasoning.id,
        projectId: reasoning.project_id,
        sprintId: reasoning.sprint_id,
        reasoningType: reasoning.reasoning_type,
        title: reasoning.title,
        outputMarkdown: content.outputMarkdown,
        recipientScope: reasoning.recipient_scope,
        customRecipients: reasoning.custom_recipients,
      },
    };

    await redis.rpush(queueKey, JSON.stringify(emailJob));
    console.log(
      `[Reasoning Consumer] AI report delivery job dispatched for reasoning: ${reasoning.id}`
    );
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new ReasoningResponseConsumer();
