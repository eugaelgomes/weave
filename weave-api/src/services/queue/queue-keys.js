/**
 * Redis list keys for background jobs (Valkey-compatible).
 * Producers (server) and consumers (worker) must resolve the same key;
 * use `get*RedisKey` helpers or env vars to override.
 */

const DEFAULT_EMAIL_QUEUE_KEY = "weave:emails:queue";
const DEFAULT_BACKUP_EXPORT_QUEUE_KEY = "weave:backups:export:queue";
const DEFAULT_DOMAIN_VERIFY_QUEUE_KEY = "weave:domains:verify:queue";
const DEFAULT_PLAN_USAGE_QUEUE_KEY = "weave:plans:usage:queue";
const DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY = "weave:engine:llm:requests";
const DEFAULT_ENGINE_LLM_RESPONSE_PREFIX = "weave:engine:llm:responses";
const DEFAULT_NOTE_EMBEDDINGS_QUEUE_KEY = "queue:note-embeddings";
const DEFAULT_AI_REPORT_DELIVERY_QUEUE_KEY = "weave:ai-reports:delivery";
const DEFAULT_REASONING_TRIGGER_QUEUE_KEY = "queue:reasoning:triggers";
const DEFAULT_ENGINE_PROACTIVE_TASK_QUEUE_KEY = "queue:engine-proactive-tasks";
const DEFAULT_ENGINE_PROACTIVE_RESPONSE_QUEUE_KEY = "queue:engine-proactive-responses";
const DEFAULT_TRACING_EVENTS_QUEUE_KEY = "weave:tracing:events:queue";

/**
 * List key for email jobs consumed by the worker email processor.
 * @returns {string}
 */
function getEmailQueueRedisKey() {
  return process.env.REDIS_EMAIL_QUEUE_KEY || DEFAULT_EMAIL_QUEUE_KEY;
}

/**
 * List key for backup export jobs consumed by worker.
 * @returns {string}
 */
function getBackupExportQueueRedisKey() {
  return process.env.REDIS_BACKUP_EXPORT_QUEUE_KEY || DEFAULT_BACKUP_EXPORT_QUEUE_KEY;
}

/**
 * List key for domain DNS verification jobs consumed by worker.
 * @returns {string}
 */
function getDomainVerifyQueueRedisKey() {
  return process.env.REDIS_DOMAIN_VERIFY_QUEUE_KEY || DEFAULT_DOMAIN_VERIFY_QUEUE_KEY;
}

/**
 * List key for plan usage jobs consumed by worker.
 * @returns {string}
 */
function getPlanUsageQueueRedisKey() {
  return process.env.REDIS_PLAN_USAGE_QUEUE_KEY || DEFAULT_PLAN_USAGE_QUEUE_KEY;
}

/**
 * List key for LLM jobs consumed by the engine service.
 * @returns {string}
 */
function getEngineLlmRequestQueueRedisKey() {
  return process.env.REDIS_ENGINE_LLM_REQUEST_QUEUE_KEY || DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY;
}

/**
 * Redis key prefix where engine responses are written.
 * The full key is `${prefix}:${requestId}`.
 *
 * @returns {string}
 */
function getEngineLlmResponsePrefixRedisKey() {
  return process.env.REDIS_ENGINE_LLM_RESPONSE_PREFIX || DEFAULT_ENGINE_LLM_RESPONSE_PREFIX;
}

/**
 * List key for note embeddings jobs consumed by worker.
 * @returns {string}
 */
function getNoteEmbeddingsQueueRedisKey() {
  return process.env.REDIS_NOTE_EMBEDDINGS_QUEUE_KEY || DEFAULT_NOTE_EMBEDDINGS_QUEUE_KEY;
}

/**
 * List key for AI report delivery jobs consumed by worker.
 * @returns {string}
 */
function getAiReportDeliveryQueueRedisKey() {
  return process.env.REDIS_AI_REPORT_DELIVERY_QUEUE_KEY || DEFAULT_AI_REPORT_DELIVERY_QUEUE_KEY;
}

/**
 * List key for reasoning triggers sent by worker to API.
 * @returns {string}
 */
function getReasoningTriggerQueueRedisKey() {
  return process.env.REDIS_REASONING_TRIGGER_QUEUE_KEY || DEFAULT_REASONING_TRIGGER_QUEUE_KEY;
}

/**
 * List key for proactive jobs consumed by the engine proactive processor.
 * @returns {string}
 */
function getEngineProactiveTaskQueueRedisKey() {
  return (
    process.env.REDIS_ENGINE_PROACTIVE_TASK_QUEUE_KEY || DEFAULT_ENGINE_PROACTIVE_TASK_QUEUE_KEY
  );
}

/**
 * List key for proactive responses consumed by the API reasoning response consumer.
 * @returns {string}
 */
function getEngineProactiveResponseQueueRedisKey() {
  return (
    process.env.REDIS_ENGINE_PROACTIVE_RESPONSE_QUEUE_KEY ||
    DEFAULT_ENGINE_PROACTIVE_RESPONSE_QUEUE_KEY
  );
}

/**
 * List key for tracing events sent by engine to API.
 * @returns {string}
 */
function getTracingEventsQueueRedisKey() {
  return process.env.REDIS_TRACING_EVENTS_QUEUE_KEY || DEFAULT_TRACING_EVENTS_QUEUE_KEY;
}

/**
 * Resolved queue list keys (env-aware).
 * @readonly
 */
const REDIS_QUEUE_KEYS = Object.freeze({
  get AI_REPORT_DELIVERY() {
    return getAiReportDeliveryQueueRedisKey();
  },
  get BACKUP_EXPORT() {
    return getBackupExportQueueRedisKey();
  },
  get DOMAIN_VERIFY() {
    return getDomainVerifyQueueRedisKey();
  },
  get EMAIL() {
    return getEmailQueueRedisKey();
  },
  get ENGINE_LLM_REQUEST() {
    return getEngineLlmRequestQueueRedisKey();
  },
  get ENGINE_LLM_RESPONSE_PREFIX() {
    return getEngineLlmResponsePrefixRedisKey();
  },
  get ENGINE_PROACTIVE_RESPONSE() {
    return getEngineProactiveResponseQueueRedisKey();
  },
  get ENGINE_PROACTIVE_TASK() {
    return getEngineProactiveTaskQueueRedisKey();
  },
  get NOTE_EMBEDDINGS() {
    return getNoteEmbeddingsQueueRedisKey();
  },
  get PLAN_USAGE() {
    return getPlanUsageQueueRedisKey();
  },
  get REASONING_TRIGGER() {
    return getReasoningTriggerQueueRedisKey();
  },
  get TRACING_EVENTS() {
    return getTracingEventsQueueRedisKey();
  },
});

module.exports = {
  DEFAULT_AI_REPORT_DELIVERY_QUEUE_KEY,
  DEFAULT_BACKUP_EXPORT_QUEUE_KEY,
  DEFAULT_DOMAIN_VERIFY_QUEUE_KEY,
  DEFAULT_EMAIL_QUEUE_KEY,
  DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY,
  DEFAULT_ENGINE_LLM_RESPONSE_PREFIX,
  DEFAULT_ENGINE_PROACTIVE_RESPONSE_QUEUE_KEY,
  DEFAULT_ENGINE_PROACTIVE_TASK_QUEUE_KEY,
  DEFAULT_NOTE_EMBEDDINGS_QUEUE_KEY,
  DEFAULT_PLAN_USAGE_QUEUE_KEY,
  DEFAULT_REASONING_TRIGGER_QUEUE_KEY,
  getAiReportDeliveryQueueRedisKey,
  getBackupExportQueueRedisKey,
  getDomainVerifyQueueRedisKey,
  getEmailQueueRedisKey,
  getEngineLlmRequestQueueRedisKey,
  getEngineLlmResponsePrefixRedisKey,
  getEngineProactiveResponseQueueRedisKey,
  getEngineProactiveTaskQueueRedisKey,
  getNoteEmbeddingsQueueRedisKey,
  getPlanUsageQueueRedisKey,
  getReasoningTriggerQueueRedisKey,
  getTracingEventsQueueRedisKey,
  REDIS_QUEUE_KEYS,
};
