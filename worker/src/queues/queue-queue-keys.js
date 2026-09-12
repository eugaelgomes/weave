/**
 * Queue key names are configured via environment variables (managed in Doppler).
 * Default fallback values are provided for local development stability.
 * Must stay aligned with server `server/src/services/queue/queue-keys.js`.
 */

const DOMAIN_VERIFY_RETRY_INTERVAL_MS = 30 * 60 * 1000;
const PLAN_USAGE_RETRY_INTERVAL_MS = 5 * 60 * 1000;

/**
 * @returns {string}
 */
function getEmailQueueRedisKey() {
  return process.env.REDIS_EMAIL_QUEUE_KEY || "weave:emails:queue";
}

function getTransactionalEmailQueueRedisKey() {
  return process.env.REDIS_TRANSACTIONAL_EMAIL_QUEUE_KEY || "weave:emails:transactional:queue";
}

/**
 * @returns {string}
 */
function getBackupExportQueueRedisKey() {
  return process.env.REDIS_BACKUP_EXPORT_QUEUE_KEY || "weave:backups:export:queue";
}

/**
 * @returns {string}
 */
function getDomainVerifyQueueRedisKey() {
  return process.env.REDIS_DOMAIN_VERIFY_QUEUE_KEY || "weave:domains:verify:queue";
}

/**
 * @returns {string}
 */
function getDomainVerifyDelayedQueueRedisKey() {
  return process.env.REDIS_DOMAIN_VERIFY_DELAYED_QUEUE_KEY || "weave:domains:verify:delayed:queue";
}

/**
 * @returns {string}
 */
function getPlanUsageQueueRedisKey() {
  return process.env.REDIS_PLAN_USAGE_QUEUE_KEY || "weave:plans:usage:queue";
}

/**
 * @returns {string}
 */
function getPlanUsageDelayedQueueRedisKey() {
  return process.env.REDIS_PLAN_USAGE_DELAYED_QUEUE_KEY || "weave:plans:usage:delayed:queue";
}

/**
 * @returns {string}
 */
function getAiReportDeliveryQueueRedisKey() {
  return process.env.REDIS_AI_REPORT_DELIVERY_QUEUE_KEY || "weave:ai-reports:delivery";
}

/**
 * List key for note embedding jobs (must match weave-api queue-keys.js).
 * @returns {string}
 */
function getNoteEmbeddingsQueueRedisKey() {
  return process.env.REDIS_NOTE_EMBEDDINGS_QUEUE_KEY || "queue:note-embeddings";
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
  getTransactionalEmailQueueRedisKey,
  PLAN_USAGE_RETRY_INTERVAL_MS,
};
