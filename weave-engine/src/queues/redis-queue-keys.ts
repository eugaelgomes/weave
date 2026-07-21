export const DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY = "weave:engine:llm:requests";
export const DEFAULT_ENGINE_SUBAGENT_REQUEST_QUEUE_KEY =
  "weave:engine:subagents:requests";
export const DEFAULT_ENGINE_LLM_RESPONSE_PREFIX = "weave:engine:llm:responses";
export const DEFAULT_ENGINE_PROACTIVE_TASK_QUEUE_KEY = "queue:engine-proactive-tasks";
export const DEFAULT_ENGINE_PROACTIVE_RESPONSE_QUEUE_KEY =
  "queue:engine-proactive-responses";
export const DEFAULT_EMAIL_QUEUE_KEY = "weave:emails:queue";

/**
 * Queue key where server pushes LLM requests.
 *
 * @returns {string}
 */
export function getEngineLlmRequestQueueRedisKey(): string {
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
export function getEngineSubagentRequestQueueRedisKey(): string {
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
export function getEngineLlmResponsePrefixRedisKey(): string {
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
export function getEngineProactiveTaskQueueRedisKey(): string {
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
export function getEngineProactiveResponseQueueRedisKey(): string {
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
export function getEmailQueueRedisKey(): string {
  return process.env.REDIS_EMAIL_QUEUE_KEY || DEFAULT_EMAIL_QUEUE_KEY;
}
