import { randomUUID } from "crypto";
import { redis } from "./client";
import {
  getEmailQueueRedisKey,
  getDomainVerifyQueueRedisKey,
  getPlanUsageQueueRedisKey,
  getBackupExportQueueRedisKey,
  getNoteEmbeddingsQueueRedisKey,
} from "./keys";

export async function enqueueRedisListJob(listKey: string, jobBody: Record<string, any>) {
  try {
    return await redis.lpush(listKey, JSON.stringify(jobBody));
  } catch (err: any) {
    console.error("[QueueController] Failed to enqueue job:", {
      err: err?.message || String(err),
      listKey,
    });
    return 0;
  }
}

export async function enqueueEmailJob(resendPayload: any) {
  await enqueueRedisListJob(getEmailQueueRedisKey(), {
    payload: resendPayload,
    queuedAt: new Date().toISOString(),
  });
  return { queued: true, success: true };
}

export async function enqueueDomainVerificationJob({ domainId, requestedByUserId }: { domainId: string; requestedByUserId?: string }) {
  await enqueueRedisListJob(getDomainVerifyQueueRedisKey(), {
    domainId,
    queuedAt: new Date().toISOString(),
    requestedByUserId,
    retryCount: 0,
  });
  return { queued: true, success: true };
}

export async function enqueuePlanUsageJob({
  operation,
  payload = {},
  usageId,
  eventId = randomUUID(),
}: {
  operation: string;
  payload?: any;
  usageId: string;
  eventId?: string;
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

export async function enqueueBackupExportJob({ jobId, userId }: { jobId: string; userId: string }) {
  await enqueueRedisListJob(getBackupExportQueueRedisKey(), {
    jobId,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
    userId,
  });
  return { queued: true, success: true };
}

export async function enqueueNoteEmbeddingJob(internalNoteId: string) {
  await enqueueRedisListJob(getNoteEmbeddingsQueueRedisKey(), {
    noteId: internalNoteId,
    queuedAt: new Date().toISOString(),
  });
  return { queued: true, success: true };
}
