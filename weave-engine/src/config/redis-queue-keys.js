const DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY = "weave:engine:llm:requests";
const DEFAULT_ENGINE_LLM_RESPONSE_PREFIX = "weave:engine:llm:responses";

/**
 * Queue key where server pushes LLM requests.
 *
 * @returns {string}
 */
function getEngineLlmRequestQueueRedisKey() {
  return (
    process.env.REDIS_ENGINE_LLM_REQUEST_QUEUE_KEY ||
    DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY
  );
}

/**
 * Key prefix where engine writes response payloads.
 * Full key must be `${prefix}:${requestId}`.
 *
 * @returns {string}
 */
function getEngineLlmResponsePrefixRedisKey() {
  return (
    process.env.REDIS_ENGINE_LLM_RESPONSE_PREFIX ||
    DEFAULT_ENGINE_LLM_RESPONSE_PREFIX
  );
}

module.exports = {
  DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY,
  DEFAULT_ENGINE_LLM_RESPONSE_PREFIX,
  getEngineLlmRequestQueueRedisKey,
  getEngineLlmResponsePrefixRedisKey,
};
