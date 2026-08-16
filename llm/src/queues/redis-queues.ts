/**
 * @module weave-engine/services/cache/redis-queues
 * @description Centralized registry of Redis queues used by Weave Engine.
 */

import {
  getEmailQueueRedisKey,
  getEngineLlmRequestQueueRedisKey,
  getEngineLlmResponsePrefixRedisKey,
} from "@/queues/redis-queue-keys";

export interface RedisQueueConfig {
  description: string;
  key: string;
  name: string;
}

export const REDIS_QUEUES = {
  EMAIL: {
    description: "Queue for sending emails via Weave Worker",
    key: getEmailQueueRedisKey(),
    name: "email",
  } as RedisQueueConfig,
  ENGINE_DEAD_LETTER: {
    description: "Dead letter queue for permanently failed engine jobs",
    key: process.env.REDIS_ENGINE_LLM_DEAD_LETTER_QUEUE_KEY || "weave:engine:llm:dead-letter",
    name: "engine-dead-letter",
  } as RedisQueueConfig,
  ENGINE_LLM_REQUESTS: {
    description: "Queue for processing LLM requests",
    key: getEngineLlmRequestQueueRedisKey(),
    name: "engine-llm-requests",
  } as RedisQueueConfig,
  ENGINE_LLM_RESPONSES: {
    description: "Prefix for storing LLM response payloads",
    key: getEngineLlmResponsePrefixRedisKey(),
    name: "engine-llm-responses",
  } as RedisQueueConfig,
};

export const queuesList: RedisQueueConfig[] = Object.values(REDIS_QUEUES);
