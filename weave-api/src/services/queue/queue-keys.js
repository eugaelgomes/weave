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
  return (
    process.env.REDIS_BACKUP_EXPORT_QUEUE_KEY || DEFAULT_BACKUP_EXPORT_QUEUE_KEY
  );
}

/**
 * List key for domain DNS verification jobs consumed by worker.
 * @returns {string}
 */
function getDomainVerifyQueueRedisKey() {
  return (
    process.env.REDIS_DOMAIN_VERIFY_QUEUE_KEY || DEFAULT_DOMAIN_VERIFY_QUEUE_KEY
  );
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
  return (
    process.env.REDIS_ENGINE_LLM_REQUEST_QUEUE_KEY ||
    DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY
  );
}

/**
 * Redis key prefix where engine responses are written.
 * The full key is `${prefix}:${requestId}`.
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
 * Resolved queue list keys (env-aware).
 * @readonly
 */
const REDIS_QUEUE_KEYS = Object.freeze({
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
  get NOTE_EMBEDDINGS() {
    return getNoteEmbeddingsQueueRedisKey();
  },
  get PLAN_USAGE() {
    return getPlanUsageQueueRedisKey();
  },
  get AI_REPORT_DELIVERY() {
    return getAiReportDeliveryQueueRedisKey();
  },
  get REASONING_TRIGGER() {
    return getReasoningTriggerQueueRedisKey();
  },
});

module.exports = {
  DEFAULT_BACKUP_EXPORT_QUEUE_KEY,
  DEFAULT_DOMAIN_VERIFY_QUEUE_KEY,
  DEFAULT_EMAIL_QUEUE_KEY,
  DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY,
  DEFAULT_ENGINE_LLM_RESPONSE_PREFIX,
  DEFAULT_NOTE_EMBEDDINGS_QUEUE_KEY,
  DEFAULT_PLAN_USAGE_QUEUE_KEY,
  DEFAULT_AI_REPORT_DELIVERY_QUEUE_KEY,
  DEFAULT_REASONING_TRIGGER_QUEUE_KEY,
  getBackupExportQueueRedisKey,
  getDomainVerifyQueueRedisKey,
  getEmailQueueRedisKey,
  getEngineLlmRequestQueueRedisKey,
  getEngineLlmResponsePrefixRedisKey,
  getNoteEmbeddingsQueueRedisKey,
  getPlanUsageQueueRedisKey,
  getAiReportDeliveryQueueRedisKey,
  getReasoningTriggerQueueRedisKey,
  REDIS_QUEUE_KEYS,
};
