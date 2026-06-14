const { randomUUID } = require("crypto");
const PlansRepository = require("@/modules/plans/plans.repository");
const engineRpcRedis = require("@/services/queue/engine-rpc-connection");
const {
  getEngineLlmRequestQueueRedisKey,
  getEngineLlmResponsePrefixRedisKey,
} = require("@/services/queue/queue-keys");
const chatFormatterUtil = require("../utils/chat-formatter.util");
const { getI18n } = require("../utils/weave-ai-i18n.util");

const Redis = require("ioredis");
const { getBlockingRedisOptions } = require("@/services/queue/blocking-redis-options");
const subscriberClient = new Redis(process.env.REDIS_URL, getBlockingRedisOptions());
const streamCallbacks = new Map();

subscriberClient.on("message", (channel, message) => {
  try {
    const callback = streamCallbacks.get(channel);
    if (callback) {
      const parsed = JSON.parse(message);
      if (parsed.chunk) {
        callback(parsed.chunk);
      }
    }
  } catch (e) {}
});

const ENGINE_CHAT_TIMEOUT_SECONDS = Number.parseInt(
  process.env.WEAVE_ENGINE_CHAT_TIMEOUT_SECONDS || "75",
  10
);

class ChatEngineService {
  /**
   * Builds compact plan usage context for Weave Engine prompts.
   *
   * @param {string} userId - Authenticated user's ID.
   * @param {string|null} [organizationId=null] - User's current organization ID.
   * @returns {Promise<Record<string, unknown>|null>} Plan usage context object or null.
   */
  async buildPlanUsageContext(userId, organizationId = null) {
    try {
      const [effectivePlan, usageRecord] = await Promise.all([
        PlansRepository.getEffectivePlanByUserId(userId),
        PlansRepository.getPlanUsage(userId, organizationId),
      ]);

      if (!effectivePlan && !usageRecord) {
        return null;
      }

      const planDetails = effectivePlan?.plan_details || {};
      const usageDetails = usageRecord?.usage_details || {};

      const aiEnabled = Boolean(
        chatFormatterUtil.getNestedValue(planDetails, "weave_ai.enabled")
      );
      const monthlyMessagesLimit = chatFormatterUtil.getNestedValue(
        planDetails,
        "weave_ai.config.monthly_messages"
      );
      const monthlyMessagesUsed = chatFormatterUtil.getNestedValue(
        usageDetails,
        "monthly_cycle.weave_ai.messages_sent"
      );
      const monthlyTokensUsed = chatFormatterUtil.getNestedValue(
        usageDetails,
        "monthly_cycle.weave_ai.tokens_estimated"
      );

      return {
        plan: {
          id: effectivePlan?.plan_id || null,
          name: effectivePlan?.plan_name || null,
          subscriberType: effectivePlan?.subscriber_type || null,
        },
        usage: {
          periodEnd:
            chatFormatterUtil.getNestedValue(
              usageDetails,
              "monthly_cycle.current_period_end"
            ) || null,
          periodStart:
            chatFormatterUtil.getNestedValue(
              usageDetails,
              "monthly_cycle.current_period_start"
            ) || null,
          weaveAi: {
            aiEnabled,
            monthlyMessagesLimit: Number.isFinite(Number(monthlyMessagesLimit))
              ? Number(monthlyMessagesLimit)
              : null,
            monthlyMessagesUsed: Number.isFinite(Number(monthlyMessagesUsed))
              ? Number(monthlyMessagesUsed)
              : null,
            monthlyTokensUsed: Number.isFinite(Number(monthlyTokensUsed))
              ? Number(monthlyTokensUsed)
              : null,
          },
        },
      };
    } catch (error) {
      console.error("[weave-ai/chat] failed to fetch plan usage context", {
        code: error?.code || null,
        message: error?.message || String(error),
      });
      return null;
    }
  }

  /**
   * Sends chat payload to engine queue and awaits response.
   *
   * @param {object} payload - Job payload to send to engine queue.
   * @param {string} [requestId=randomUUID()] - Stable request UUID.
   * @returns {Promise<object>} Parsed engine response data structure.
   */
  async requestEngineChat(payload, requestId = randomUUID(), onChunk) {
    const startedAt = Date.now();
    const requestQueueKey = getEngineLlmRequestQueueRedisKey();
    const responseQueueKey = `${getEngineLlmResponsePrefixRedisKey()}:${requestId}`;
    const lang = payload.userLanguage || "pt";
    const t = getI18n(lang);
    const streamChannel = `stream:${requestId}`;

    if (onChunk) {
      streamCallbacks.set(streamChannel, onChunk);
      await subscriberClient.subscribe(streamChannel);
    }

    const job = {
      attempts: 0,
      createdAt: new Date().toISOString(),
      payload,
      requestId,
      responseQueueKey,
      taskType: "chat_v2_process",
    };

    await engineRpcRedis.lpush(requestQueueKey, JSON.stringify(job));

    try {
      const queueResult = await engineRpcRedis.blpop(
        responseQueueKey,
        ENGINE_CHAT_TIMEOUT_SECONDS
      );
      if (!queueResult) {
        await engineRpcRedis.del(responseQueueKey);
        const timeoutError = new Error(t.engineTimeout);
        timeoutError.code = "ENGINE_TIMEOUT";
        timeoutError.requestId = requestId;
        timeoutError.statusCode = 504;
        throw timeoutError;
      }

      const [, rawResponsePayload] = queueResult;
      await engineRpcRedis.del(responseQueueKey);

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(rawResponsePayload);
      } catch {
        const parseError = new Error(t.engineInvalidResponse);
        parseError.code = "ENGINE_INVALID_RESPONSE";
        parseError.statusCode = 502;
        throw parseError;
      }

      if (!parsedResponse?.success) {
        const engineErrorPayload = chatFormatterUtil.extractEngineErrorPayload(
          parsedResponse?.error,
          lang
        );
        const engineError = new Error(engineErrorPayload.message);
        engineError.code = engineErrorPayload.code;
        engineError.statusCode = 502;
        throw engineError;
      }

      return {
        data: parsedResponse.data || {},
        latencyMs: Date.now() - startedAt,
        requestId,
      };
    } finally {
      if (onChunk) {
        streamCallbacks.delete(streamChannel);
        subscriberClient.unsubscribe(streamChannel).catch(() => {});
      }
    }
  }
}

module.exports = new ChatEngineService();
