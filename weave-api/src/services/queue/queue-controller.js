const { randomUUID } = require("crypto");
const redis = require("./connection");
const { resolveNoteIdToUuid } = require("@/utils/note-id-lookup");
const {
  getBackupExportQueueRedisKey,
  getDomainVerifyQueueRedisKey,
  getEmailQueueRedisKey,
  getPlanUsageQueueRedisKey,
  getNoteEmbeddingsQueueRedisKey,
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
  try {
    return await redis.lpush(listKey, JSON.stringify(jobBody));
  } catch (err) {
    // Don't block core API flows if Redis/worker is down.
    // eslint-disable-next-line no-console -- queue infra failure diagnostics
    console.error("[QueueController] Failed to enqueue job:", {
      err: err?.message || String(err),
      listKey,
    });
    return 0;
  }
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
 * @param {string} [params.eventId]
 * @param {object} [params.payload]
 * @returns {Promise<{ success: true, queued: true }>}
 */
async function enqueuePlanUsageJob({
  operation,
  payload = {},
  usageId,
  eventId = randomUUID(),
}) {
  await enqueueRedisListJob(getPlanUsageQueueRedisKey(), {
    eventId,
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

/**
 * Enqueue note embedding job (always stores internal UUID).
 *
 * @param {string} noteId - Internal UUID or public_note_id
 * @returns {Promise<{ success: boolean, queued: boolean }>}
 */
async function enqueueNoteEmbeddingJob(noteId) {
  const internalId = await resolveNoteIdToUuid(noteId);
  if (!internalId) {
    // eslint-disable-next-line no-console -- queue infra failure diagnostics
    console.warn(
      "[QueueController] Skipping embedding job for unresolved noteId:",
      noteId
    );
    return { queued: false, success: false };
  }

  await enqueueRedisListJob(getNoteEmbeddingsQueueRedisKey(), {
    noteId: internalId,
    queuedAt: new Date().toISOString(),
  });
  return { queued: true, success: true };
}

module.exports = {
  enqueueBackupExportJob,
  enqueueDomainVerificationJob,
  enqueueEmailJob,
  enqueueNoteEmbeddingJob,
  enqueuePlanUsageJob,
  enqueueRedisListJob,
};
