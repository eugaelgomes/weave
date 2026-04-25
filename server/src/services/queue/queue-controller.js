const redis = require("./connection");
const {
  getBackupExportQueueRedisKey,
  getDomainVerifyQueueRedisKey,
  getEmailQueueRedisKey,
  getPlanUsageQueueRedisKey,
} = require("./queue-keys");

/**
 * Push a JSON-serializable job to the head of a Redis list (LPUSH).
 * Workers typically use BLPOP on the same key.
 *
 * @param {string} listKey Redis list key.
 * @param {object} jobBody Value stored as JSON.
 * @returns {Promise<number>} Length of the list after push.
 */
async function enqueueRedisListJob(listKey, jobBody) {
  return redis.lpush(listKey, JSON.stringify(jobBody));
}

/**
 * Enqueue an outbound email for the worker Resend processor.
 *
 * @param {object} resendPayload Fields accepted by Resend (from, to, subject, html, text, etc.).
 * @returns {Promise<{ success: true, queued: true }>}
 */
async function enqueueEmailJob(resendPayload) {
  await enqueueRedisListJob(getEmailQueueRedisKey(), {
    payload: resendPayload,
    queuedAt: new Date().toISOString(),
  });
  return { queued: true, success: true };
}

/**
 * Enqueue a domain DNS verification job.
 *
 * @param {object} params
 * @param {string} params.domainId
 * @param {string} [params.requestedByUserId]
 * @returns {Promise<{ success: true, queued: true }>}
 */
async function enqueueDomainVerificationJob({
  domainId,
  requestedByUserId = undefined,
}) {
  await enqueueRedisListJob(getDomainVerifyQueueRedisKey(), {
    domainId,
    queuedAt: new Date().toISOString(),
    requestedByUserId,
    retryCount: 0,
  });
  return { queued: true, success: true };
}

/**
 * Enqueue plan usage event to be consumed by worker.
 *
 * @param {object} params
 * @param {string} params.usageId
 * @param {"consume_ai_message"|"consume_export"|"consume_note_creation"|"consume_project_creation"|"consume_storage"} params.operation
 * @param {object} [params.payload]
 * @returns {Promise<{ success: true, queued: true }>}
 */
async function enqueuePlanUsageJob({ operation, payload = {}, usageId }) {
  await enqueueRedisListJob(getPlanUsageQueueRedisKey(), {
    operation,
    payload,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
    usageId,
  });
  return { queued: true, success: true };
}

/**
 * Enqueue backup export job for worker processing.
 *
 * @param {object} params
 * @param {string} params.jobId
 * @param {string} params.userId
 * @returns {Promise<{ success: true, queued: true }>}
 */
async function enqueueBackupExportJob({ jobId, userId }) {
  await enqueueRedisListJob(getBackupExportQueueRedisKey(), {
    jobId,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
    userId,
  });
  return { queued: true, success: true };
}

module.exports = {
  enqueueBackupExportJob,
  enqueueDomainVerificationJob,
  enqueueEmailJob,
  enqueuePlanUsageJob,
  enqueueRedisListJob,
};
