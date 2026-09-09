import { randomUUID } from "crypto";
import { redis } from "./client";
import { getRequestId } from "../context";
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

export async function enqueueEmailJob(emailPayload: any, requestId?: string) {
  const finalRequestId = requestId || getRequestId();
  await enqueueRedisListJob(getEmailQueueRedisKey(), {
    payload: emailPayload,
    queuedAt: new Date().toISOString(),
    requestId: finalRequestId,
  });
  return { queued: true, success: true };
}

export async function enqueueDomainVerificationJob({ domainId, requestedByUserId, requestId }: { domainId: string; requestedByUserId?: string; requestId?: string }) {
  const finalRequestId = requestId || getRequestId();
  await enqueueRedisListJob(getDomainVerifyQueueRedisKey(), {
    domainId,
    queuedAt: new Date().toISOString(),
    requestedByUserId,
    requestId: finalRequestId,
    retryCount: 0,
  });
  return { queued: true, success: true };
}

export async function enqueuePlanUsageJob({
  operation,
  payload = {},
  usageId,
  eventId = randomUUID(),
  requestId,
}: {
  operation: string;
  payload?: any;
  usageId: string;
  eventId?: string;
  requestId?: string;
}) {
  const finalRequestId = requestId || getRequestId();
  await enqueueRedisListJob(getPlanUsageQueueRedisKey(), {
    eventId,
    operation,
    payload,
    queuedAt: new Date().toISOString(),
    requestId: finalRequestId,
    retryCount: 0,
    usageId,
  });
  return { queued: true, success: true };
}

export async function enqueueBackupExportJob({ jobId, userId, requestId }: { jobId: string; userId: string; requestId?: string }) {
  const finalRequestId = requestId || getRequestId();
  await enqueueRedisListJob(getBackupExportQueueRedisKey(), {
    jobId,
    queuedAt: new Date().toISOString(),
    requestId: finalRequestId,
    retryCount: 0,
    userId,
  });
  return { queued: true, success: true };
}

export async function enqueueNoteEmbeddingJob(internalNoteId: string, requestId?: string) {
  const finalRequestId = requestId || getRequestId();
  await enqueueRedisListJob(getNoteEmbeddingsQueueRedisKey(), {
    noteId: internalNoteId,
    queuedAt: new Date().toISOString(),
    requestId: finalRequestId,
  });
  return { queued: true, success: true };
}
