export const DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY = "weave:engine:llm:requests";
export const DEFAULT_ENGINE_LLM_RESPONSE_PREFIX = "weave:engine:llm:responses";
export const DEFAULT_EMAIL_QUEUE_KEY = "weave:emails:queue";

/**
 * Queue key where weave-api pushes LLM requests.
 *
 * @returns {string}
 */
export function getEngineLlmRequestQueueRedisKey(): string {
  return process.env.REDIS_ENGINE_LLM_REQUEST_QUEUE_KEY || DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY;
}

/**
 * Key prefix where the engine writes response payloads.
 * Full key is `${prefix}:${requestId}`.
 *
 * @returns {string}
 */
export function getEngineLlmResponsePrefixRedisKey(): string {
  return process.env.REDIS_ENGINE_LLM_RESPONSE_PREFIX || DEFAULT_ENGINE_LLM_RESPONSE_PREFIX;
}

/**
 * Queue key for emails.
 *
 * @returns {string}
 */
export function getEmailQueueRedisKey(): string {
  return process.env.REDIS_EMAIL_QUEUE_KEY || DEFAULT_EMAIL_QUEUE_KEY;
}
