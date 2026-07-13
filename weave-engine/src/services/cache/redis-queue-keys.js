const DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY = "weave:engine:llm:requests";
const DEFAULT_ENGINE_SUBAGENT_REQUEST_QUEUE_KEY =
  "weave:engine:subagents:requests";
const DEFAULT_ENGINE_LLM_RESPONSE_PREFIX = "weave:engine:llm:responses";
const DEFAULT_ENGINE_PROACTIVE_TASK_QUEUE_KEY = "queue:engine-proactive-tasks";
const DEFAULT_ENGINE_PROACTIVE_RESPONSE_QUEUE_KEY =
  "queue:engine-proactive-responses";
const DEFAULT_EMAIL_QUEUE_KEY = "weave:emails:queue";

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
 * Queue key where engine pushes subagent task requests.
 *
 * @returns {string}
 */
function getEngineSubagentRequestQueueRedisKey() {
  return (
    process.env.REDIS_ENGINE_SUBAGENT_REQUEST_QUEUE_KEY ||
    DEFAULT_ENGINE_SUBAGENT_REQUEST_QUEUE_KEY
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

/**
 * Queue key where API pushes proactive generation tasks.
 *
 * @returns {string}
 */
function getEngineProactiveTaskQueueRedisKey() {
  return (
    process.env.REDIS_ENGINE_PROACTIVE_TASK_QUEUE_KEY ||
    DEFAULT_ENGINE_PROACTIVE_TASK_QUEUE_KEY
  );
}

/**
 * Queue key where engine writes proactive responses consumed by API.
 *
 * @returns {string}
 */
function getEngineProactiveResponseQueueRedisKey() {
  return (
    process.env.REDIS_ENGINE_PROACTIVE_RESPONSE_QUEUE_KEY ||
    DEFAULT_ENGINE_PROACTIVE_RESPONSE_QUEUE_KEY
  );
}

/**
 * Queue key for emails.
 *
 * @returns {string}
 */
function getEmailQueueRedisKey() {
  return process.env.REDIS_EMAIL_QUEUE_KEY || DEFAULT_EMAIL_QUEUE_KEY;
}

module.exports = {
  DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY,
  DEFAULT_ENGINE_LLM_RESPONSE_PREFIX,
  DEFAULT_ENGINE_PROACTIVE_RESPONSE_QUEUE_KEY,
  DEFAULT_ENGINE_PROACTIVE_TASK_QUEUE_KEY,
  DEFAULT_ENGINE_SUBAGENT_REQUEST_QUEUE_KEY,
  getEmailQueueRedisKey,
  getEngineLlmRequestQueueRedisKey,
  getEngineLlmResponsePrefixRedisKey,
  getEngineProactiveResponseQueueRedisKey,
  getEngineProactiveTaskQueueRedisKey,
  getEngineSubagentRequestQueueRedisKey,
};
