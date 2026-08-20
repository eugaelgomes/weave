const Redis = require("ioredis");
const { randomUUID } = require("crypto");
const { resolveNoteIdToUuid } = require("@/modules/notes/utils/note-id-lookup.util");

/**
 * Shared ioredis options for connections that run blocking commands (BLPOP).
 * Do not set commandTimeout — it breaks long BLPOP waits.
 *
 * @returns {import("ioredis").CommonRedisOptions}
 */
function getBlockingRedisOptions() {
  const options = {
    // Force IPv4 to prevent Node 18+ ETIMEDOUT on IPv6 resolution
    connectTimeout: 5000,
    enableOfflineQueue: true,
    enableReadyCheck: true,
    family: 4,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      return Math.min(5000, 200 * times);
    },
  };

  // Add TLS options if the URL uses rediss://
  if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://")) {
    options.tls = { rejectUnauthorized: false };
  }

  return options;
}

/**
 * Shared ioredis client for Valkey/Redis (queues, cache). Prefer `./queue-controller` for list jobs.
 * @type {import("ioredis").default}
 */
const redisOptions = {
  commandTimeout: 2000,

  connectTimeout: 2000,

  enableOfflineQueue: false,
  // Force IPv4 to prevent Node 18+ ETIMEDOUT on IPv6 resolution
  // Fail fast when Redis is unavailable: API requests must not hang.
  enableReadyCheck: true,
  family: 4,
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => {
    // 1st reconnect attempt after 200ms, then stop retrying.
    if (times <= 1) return 200;
    return null;
  },
};

// Add TLS options if the URL uses rediss://
if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://")) {
  redisOptions.tls = { rejectUnauthorized: false };
}

const redis = new Redis(process.env.REDIS_URL, redisOptions);

redis.on("error", (error) => {
  console.error("[Redis] Config error:", error);
});

/**
 * Dedicated Redis client for long-running consumers (BLPOP loops).
 * Unlike the producer client, this should keep trying to reconnect and may queue commands
 * because consumers are background processes and must be resilient to transient outages.
 *
 * @type {import("ioredis").default}
 */
const redisConsumer = new Redis(process.env.REDIS_URL, getBlockingRedisOptions());

redisConsumer.on("error", (error) => {
  console.error("[RedisConsumer] Error:", error);
});

/**
 * Dedicated Redis client for server→engine chat RPC (LPUSH + BLPOP on response keys).
 * Must not use the producer client ({@link ./connection.js}), which sets commandTimeout.
 *
 * @type {import("ioredis").default}
 */
const engineRpcRedis = new Redis(process.env.REDIS_URL, getBlockingRedisOptions());

engineRpcRedis.on("error", (error) => {
  console.error("[RedisEngineRpc] Error:", error);
});

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
async function enqueueDomainVerificationJob({ domainId, requestedByUserId = undefined }) {
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
async function enqueuePlanUsageJob({ operation, payload = {}, usageId, eventId = randomUUID() }) {
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
    console.warn("[QueueController] Skipping embedding job for unresolved noteId:", noteId);
    return { queued: false, success: false };
  }

  await enqueueRedisListJob(getNoteEmbeddingsQueueRedisKey(), {
    noteId: internalId,
    queuedAt: new Date().toISOString(),
  });
  return { queued: true, success: true };
}

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
  engineRpcRedis,
  enqueueBackupExportJob,
  enqueueDomainVerificationJob,
  enqueueEmailJob,
  enqueueNoteEmbeddingJob,
  enqueuePlanUsageJob,
  enqueueRedisListJob,
  getAiReportDeliveryQueueRedisKey,
  getBackupExportQueueRedisKey,
  getBlockingRedisOptions,
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
  redis,
  REDIS_QUEUE_KEYS,
  redisConsumer,
};
