/**
 * Must stay aligned with server `server/src/services/redis/queue-keys.js`
 * (same env names and default key names).
 */

const DEFAULT_EMAIL_QUEUE_KEY = "weave:emails:queue";
const DEFAULT_BACKUP_EXPORT_QUEUE_KEY = "weave:backups:export:queue";
const DEFAULT_DOMAIN_VERIFY_QUEUE_KEY = "weave:domains:verify:queue";
const DEFAULT_DOMAIN_VERIFY_DELAYED_QUEUE_KEY = "weave:domains:verify:delayed";
const DEFAULT_PLAN_USAGE_QUEUE_KEY = "weave:plans:usage:queue";
const DEFAULT_PLAN_USAGE_DELAYED_QUEUE_KEY = "weave:plans:usage:delayed";
const DOMAIN_VERIFY_RETRY_INTERVAL_MS = 30 * 60 * 1000;
const PLAN_USAGE_RETRY_INTERVAL_MS = 5 * 60 * 1000;

/**
 * @returns {string}
 */
function getEmailQueueRedisKey() {
  return process.env.REDIS_EMAIL_QUEUE_KEY || DEFAULT_EMAIL_QUEUE_KEY;
}

/**
 * @returns {string}
 */
function getBackupExportQueueRedisKey() {
  return (
    process.env.REDIS_BACKUP_EXPORT_QUEUE_KEY || DEFAULT_BACKUP_EXPORT_QUEUE_KEY
  );
}

/**
 * @returns {string}
 */
function getDomainVerifyQueueRedisKey() {
  return (
    process.env.REDIS_DOMAIN_VERIFY_QUEUE_KEY || DEFAULT_DOMAIN_VERIFY_QUEUE_KEY
  );
}

/**
 * @returns {string}
 */
function getDomainVerifyDelayedQueueRedisKey() {
  return (
    process.env.REDIS_DOMAIN_VERIFY_DELAYED_QUEUE_KEY ||
    DEFAULT_DOMAIN_VERIFY_DELAYED_QUEUE_KEY
  );
}

/**
 * @returns {string}
 */
function getPlanUsageQueueRedisKey() {
  return process.env.REDIS_PLAN_USAGE_QUEUE_KEY || DEFAULT_PLAN_USAGE_QUEUE_KEY;
}

/**
 * @returns {string}
 */
function getPlanUsageDelayedQueueRedisKey() {
  return (
    process.env.REDIS_PLAN_USAGE_DELAYED_QUEUE_KEY ||
    DEFAULT_PLAN_USAGE_DELAYED_QUEUE_KEY
  );
}

module.exports = {
  DEFAULT_DOMAIN_VERIFY_DELAYED_QUEUE_KEY,
  DEFAULT_DOMAIN_VERIFY_QUEUE_KEY,
  DEFAULT_BACKUP_EXPORT_QUEUE_KEY,
  DEFAULT_EMAIL_QUEUE_KEY,
  DEFAULT_PLAN_USAGE_DELAYED_QUEUE_KEY,
  DEFAULT_PLAN_USAGE_QUEUE_KEY,
  DOMAIN_VERIFY_RETRY_INTERVAL_MS,
  PLAN_USAGE_RETRY_INTERVAL_MS,
  getDomainVerifyDelayedQueueRedisKey,
  getDomainVerifyQueueRedisKey,
  getBackupExportQueueRedisKey,
  getEmailQueueRedisKey,
  getPlanUsageDelayedQueueRedisKey,
  getPlanUsageQueueRedisKey,
};
