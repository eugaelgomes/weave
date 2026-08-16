/**
 * Queue key names are configured via environment variables (managed in Doppler).
 * No default values are provided — the env vars are required.
 * Must stay aligned with server `server/src/services/redis/queue-keys.js`
 * (same env names).
 */

const DOMAIN_VERIFY_RETRY_INTERVAL_MS = 30 * 60 * 1000;
const PLAN_USAGE_RETRY_INTERVAL_MS = 5 * 60 * 1000;

/**
 * @param {string} name - Environment variable name
 * @returns {string}
 */
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * @returns {string}
 */
function getEmailQueueRedisKey() {
  return requireEnv("REDIS_EMAIL_QUEUE_KEY");
}

/**
 * @returns {string}
 */
function getBackupExportQueueRedisKey() {
  return requireEnv("REDIS_BACKUP_EXPORT_QUEUE_KEY");
}

/**
 * @returns {string}
 */
function getDomainVerifyQueueRedisKey() {
  return requireEnv("REDIS_DOMAIN_VERIFY_QUEUE_KEY");
}

/**
 * @returns {string}
 */
function getDomainVerifyDelayedQueueRedisKey() {
  return requireEnv("REDIS_DOMAIN_VERIFY_DELAYED_QUEUE_KEY");
}

/**
 * @returns {string}
 */
function getPlanUsageQueueRedisKey() {
  return requireEnv("REDIS_PLAN_USAGE_QUEUE_KEY");
}

/**
 * @returns {string}
 */
function getPlanUsageDelayedQueueRedisKey() {
  return requireEnv("REDIS_PLAN_USAGE_DELAYED_QUEUE_KEY");
}

/**
 * @returns {string}
 */
function getAiReportDeliveryQueueRedisKey() {
  return requireEnv("REDIS_AI_REPORT_DELIVERY_QUEUE_KEY");
}

/**
 * List key for note embedding jobs (must match weave-api queue-keys.js).
 * @returns {string}
 */
function getNoteEmbeddingsQueueRedisKey() {
  return requireEnv("REDIS_NOTE_EMBEDDINGS_QUEUE_KEY");
}

/**
 * List key for tracing events sent by engine to API.
 * @returns {string}
 */
function getTracingEventsQueueRedisKey() {
  return process.env.REDIS_TRACING_EVENTS_QUEUE_KEY || "weave:tracing:events:queue";
}

module.exports = {
  DOMAIN_VERIFY_RETRY_INTERVAL_MS,
  getAiReportDeliveryQueueRedisKey,
  getBackupExportQueueRedisKey,
  getDomainVerifyDelayedQueueRedisKey,
  getDomainVerifyQueueRedisKey,
  getEmailQueueRedisKey,
  getNoteEmbeddingsQueueRedisKey,
  getPlanUsageDelayedQueueRedisKey,
  getPlanUsageQueueRedisKey,
  getTracingEventsQueueRedisKey,
  PLAN_USAGE_RETRY_INTERVAL_MS,
};
