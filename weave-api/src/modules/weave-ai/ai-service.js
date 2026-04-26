const { randomUUID } = require("crypto");
const redis = require("@/services/queue/connection");
const {
  getEngineLlmRequestQueueRedisKey,
  getEngineLlmResponsePrefixRedisKey,
} = require("@/services/queue/queue-keys");

const ENGINE_RESPONSE_TIMEOUT_SECONDS = Number(
  process.env.ENGINE_LLM_RESPONSE_TIMEOUT_SECONDS || 45
);

/**
 * Sends an engine task request and waits for response.
 *
 * @param {object} params
 * @param {string} params.taskType
 * @param {object} [params.payload]
 * @returns {Promise<object>}
 */
async function callEngineTask({ taskType, payload = {} }) {
  const requestId = randomUUID();
  const requestQueueKey = getEngineLlmRequestQueueRedisKey();
  const responseQueueKey = `${getEngineLlmResponsePrefixRedisKey()}:${requestId}`;

  const blockingRedis = redis.duplicate();
  if (blockingRedis.status === "wait") {
    await blockingRedis.connect();
  }

  try {
    const requestPayload = {
      createdAt: new Date().toISOString(),
      payload,
      requestId,
      responseQueueKey,
      taskType,
    };

    await redis.lpush(requestQueueKey, JSON.stringify(requestPayload));

    const result = await blockingRedis.blpop(
      responseQueueKey,
      ENGINE_RESPONSE_TIMEOUT_SECONDS
    );

    if (!result) {
      throw new Error("Engine timeout while processing LLM request");
    }

    const [, responsePayload] = result;
    const parsed = JSON.parse(responsePayload);

    if (!parsed.success) {
      throw new Error(parsed.error || "Engine failed to process LLM request");
    }

    return parsed.data;
  } finally {
    await redis.del(responseQueueKey);
    await blockingRedis.quit();
  }
}

/**
 * Sends a direct provider invocation request to the engine.
 *
 * @param {string} provider
 * @param {string} prompt
 * @param {string} systemMessage
 * @param {object} [options]
 * @returns {Promise<object>}
 */
async function callAIProvider(provider, prompt, systemMessage, options = {}) {
  return callEngineTask({
    payload: {
      options: {
        ...options,
      },
      prompt,
      provider,
      systemMessage,
      useCase: options.useCase,
    },
    taskType: "provider_call",
  });
}

/**
 * Builds the system prompt in the engine service.
 *
 * @param {string} useCase
 * @param {object} [additionalContext]
 * @returns {Promise<string>}
 */
async function buildSystemMessage(useCase, additionalContext = {}) {
  const response = await callEngineTask({
    payload: {
      additionalContext,
      useCase,
    },
    taskType: "build_system_message",
  });

  return response.systemMessage;
}

/**
 * Fetches few-shot examples from the engine prompt catalog.
 *
 * @param {string} useCase
 * @returns {Promise<Array<object>>}
 */
async function getFewShotExamples(useCase) {
  const response = await callEngineTask({
    payload: {
      useCase,
    },
    taskType: "get_few_shot_examples",
  });

  return response.examples || [];
}

/**
 * Executes thinking-phase logic in the engine.
 *
 * @param {object} params
 * @returns {Promise<string|null>}
 */
async function processThinkingPhase(params) {
  const response = await callEngineTask({
    payload: params,
    taskType: "process_thinking_phase",
  });

  return response.generatedContent || null;
}

/**
 * Generates a natural-language summary after function execution.
 *
 * @param {object} params
 * @returns {Promise<string>}
 */
async function generateSmartResponse(params) {
  const response = await callEngineTask({
    payload: params,
    taskType: "generate_smart_response",
  });

  return response.smartResponse;
}

/**
 * Sends chat v2 processing request to the engine.
 * Engine is responsible for reasoning and returning `{ data, functions }`.
 *
 * @param {object} payload
 * @returns {Promise<{data: object, functions: Array<object>, providerUsed?: string}>}
 */
async function processChatV2(payload) {
  return callEngineTask({
    payload,
    taskType: "chat_v2_process",
  });
}

module.exports = {
  buildSystemMessage,
  callAIProvider,
  generateSmartResponse,
  getFewShotExamples,
  processChatV2,
  processThinkingPhase,
};
