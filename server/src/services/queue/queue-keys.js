/**
 * Redis list keys for background jobs (Valkey-compatible).
 * Producers (server) and consumers (worker) must resolve the same key;
 * use `get*RedisKey` helpers or env vars to override.
 */

const DEFAULT_EMAIL_QUEUE_KEY = "weave:emails:queue";
const DEFAULT_BACKUP_EXPORT_QUEUE_KEY = "weave:backups:export:queue";
const DEFAULT_DOMAIN_VERIFY_QUEUE_KEY = "weave:domains:verify:queue";
const DEFAULT_PLAN_USAGE_QUEUE_KEY = "weave:plans:usage:queue";

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
  get PLAN_USAGE() {
    return getPlanUsageQueueRedisKey();
  },
});

module.exports = {
  DEFAULT_BACKUP_EXPORT_QUEUE_KEY,
  DEFAULT_DOMAIN_VERIFY_QUEUE_KEY,
  DEFAULT_EMAIL_QUEUE_KEY,
  DEFAULT_PLAN_USAGE_QUEUE_KEY,
  getBackupExportQueueRedisKey,
  getDomainVerifyQueueRedisKey,
  getEmailQueueRedisKey,
  getPlanUsageQueueRedisKey,
  REDIS_QUEUE_KEYS,
};
