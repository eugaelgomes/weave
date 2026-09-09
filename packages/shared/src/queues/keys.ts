/**
 * Default fallback keys for system queues.
 */
export const DEFAULT_EMAIL_QUEUE_KEY = "weave:emails:queue";
export const DEFAULT_BACKUP_EXPORT_QUEUE_KEY = "weave:backups:export:queue";
export const DEFAULT_DOMAIN_VERIFY_QUEUE_KEY = "weave:domains:verify:queue";
export const DEFAULT_PLAN_USAGE_QUEUE_KEY = "weave:plans:usage:queue";
export const DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY = "weave:engine:llm:requests";
export const DEFAULT_ENGINE_LLM_RESPONSE_PREFIX = "weave:engine:llm:responses";
export const DEFAULT_NOTE_EMBEDDINGS_QUEUE_KEY = "queue:note-embeddings";
export const DEFAULT_AI_REPORT_DELIVERY_QUEUE_KEY = "weave:ai-reports:delivery";
export const DEFAULT_REASONING_TRIGGER_QUEUE_KEY = "queue:reasoning:triggers";
export const DEFAULT_ENGINE_PROACTIVE_TASK_QUEUE_KEY = "queue:engine-proactive-tasks";
export const DEFAULT_ENGINE_PROACTIVE_RESPONSE_QUEUE_KEY = "queue:engine-proactive-responses";
export const DEFAULT_TRACING_EVENTS_QUEUE_KEY = "weave:tracing:events:queue";

export function getEmailQueueRedisKey(): string {
  return process.env.REDIS_EMAIL_QUEUE_KEY || DEFAULT_EMAIL_QUEUE_KEY;
}

export function getBackupExportQueueRedisKey(): string {
  return process.env.REDIS_BACKUP_EXPORT_QUEUE_KEY || DEFAULT_BACKUP_EXPORT_QUEUE_KEY;
}

export function getDomainVerifyQueueRedisKey(): string {
  return process.env.REDIS_DOMAIN_VERIFY_QUEUE_KEY || DEFAULT_DOMAIN_VERIFY_QUEUE_KEY;
}

export function getPlanUsageQueueRedisKey(): string {
  return process.env.REDIS_PLAN_USAGE_QUEUE_KEY || DEFAULT_PLAN_USAGE_QUEUE_KEY;
}

export function getEngineLlmRequestQueueRedisKey(): string {
  return process.env.REDIS_ENGINE_LLM_REQUEST_QUEUE_KEY || DEFAULT_ENGINE_LLM_REQUEST_QUEUE_KEY;
}

export function getEngineLlmResponsePrefixRedisKey(): string {
  return process.env.REDIS_ENGINE_LLM_RESPONSE_PREFIX || DEFAULT_ENGINE_LLM_RESPONSE_PREFIX;
}

export function getNoteEmbeddingsQueueRedisKey(): string {
  return process.env.REDIS_NOTE_EMBEDDINGS_QUEUE_KEY || DEFAULT_NOTE_EMBEDDINGS_QUEUE_KEY;
}

export function getAiReportDeliveryQueueRedisKey(): string {
  return process.env.REDIS_AI_REPORT_DELIVERY_QUEUE_KEY || DEFAULT_AI_REPORT_DELIVERY_QUEUE_KEY;
}

export function getReasoningTriggerQueueRedisKey(): string {
  return process.env.REDIS_REASONING_TRIGGER_QUEUE_KEY || DEFAULT_REASONING_TRIGGER_QUEUE_KEY;
}

export function getEngineProactiveTaskQueueRedisKey(): string {
  return process.env.REDIS_ENGINE_PROACTIVE_TASK_QUEUE_KEY || DEFAULT_ENGINE_PROACTIVE_TASK_QUEUE_KEY;
}

export function getEngineProactiveResponseQueueRedisKey(): string {
  return process.env.REDIS_ENGINE_PROACTIVE_RESPONSE_QUEUE_KEY || DEFAULT_ENGINE_PROACTIVE_RESPONSE_QUEUE_KEY;
}

export function getTracingEventsQueueRedisKey(): string {
  return process.env.REDIS_TRACING_EVENTS_QUEUE_KEY || DEFAULT_TRACING_EVENTS_QUEUE_KEY;
}

export const REDIS_QUEUE_KEYS = Object.freeze({
  get AI_REPORT_DELIVERY() { return getAiReportDeliveryQueueRedisKey(); },
  get BACKUP_EXPORT() { return getBackupExportQueueRedisKey(); },
  get DOMAIN_VERIFY() { return getDomainVerifyQueueRedisKey(); },
  get EMAIL() { return getEmailQueueRedisKey(); },
  get ENGINE_LLM_REQUEST() { return getEngineLlmRequestQueueRedisKey(); },
  get ENGINE_LLM_RESPONSE_PREFIX() { return getEngineLlmResponsePrefixRedisKey(); },
  get ENGINE_PROACTIVE_RESPONSE() { return getEngineProactiveResponseQueueRedisKey(); },
  get ENGINE_PROACTIVE_TASK() { return getEngineProactiveTaskQueueRedisKey(); },
  get NOTE_EMBEDDINGS() { return getNoteEmbeddingsQueueRedisKey(); },
  get PLAN_USAGE() { return getPlanUsageQueueRedisKey(); },
  get REASONING_TRIGGER() { return getReasoningTriggerQueueRedisKey(); },
  get TRACING_EVENTS() { return getTracingEventsQueueRedisKey(); },
});

export const CUSTOM_QUEUES_REGISTRY_KEY = "weave:queues:custom:registry";

export const SYSTEM_QUEUES = Object.freeze([
  { description: "Outbound email delivery queue", isDeletable: false, isSystem: true, key: getEmailQueueRedisKey(), name: "Email Queue" },
  { description: "LLM request jobs for Weave Engine", isDeletable: false, isSystem: true, key: getEngineLlmRequestQueueRedisKey(), name: "LLM Request Queue" },
  { description: "Vector embedding jobs for notes", isDeletable: false, isSystem: true, key: getNoteEmbeddingsQueueRedisKey(), name: "Note Embeddings Queue" },
  { description: "Domain DNS verification jobs", isDeletable: false, isSystem: true, key: getDomainVerifyQueueRedisKey(), name: "Domain Verification Queue" },
  { description: "Backup export tasks", isDeletable: false, isSystem: true, key: getBackupExportQueueRedisKey(), name: "Backup Export Queue" },
  { description: "Plan usage tracking events", isDeletable: false, isSystem: true, key: getPlanUsageQueueRedisKey(), name: "Plan Usage Queue" },
  { description: "AI report delivery jobs", isDeletable: false, isSystem: true, key: getAiReportDeliveryQueueRedisKey(), name: "AI Report Delivery Queue" },
  { description: "Proactive tasks for Weave Engine", isDeletable: false, isSystem: true, key: getEngineProactiveTaskQueueRedisKey(), name: "Engine Proactive Task Queue" },
  { description: "Tracing & telemetry events", isDeletable: false, isSystem: true, key: getTracingEventsQueueRedisKey(), name: "Tracing Events Queue" },
]);

export function isSystemQueue(queueKey: string): boolean {
  if (!queueKey) return false;
  return SYSTEM_QUEUES.some((sq) => sq.key === queueKey || sq.key === queueKey.trim());
}
