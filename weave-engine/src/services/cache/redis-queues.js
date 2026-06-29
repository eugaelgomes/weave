/**
 * @module weave-engine/services/cache/redis-queues
 * @description Centralized registry of Redis queues used by Weave Engine.
 */

const {
  getEngineLlmRequestQueueRedisKey,
  getEngineLlmResponsePrefixRedisKey,
  getEngineProactiveTaskQueueRedisKey,
  getEngineProactiveResponseQueueRedisKey,
  getEmailQueueRedisKey,
} = require("./redis-queue-keys");

const REDIS_QUEUES = {
  ENGINE_LLM_REQUESTS: {
    name: "engine-llm-requests",
    key: getEngineLlmRequestQueueRedisKey(),
    description: "Queue for processing real-time LLM chat requests",
  },
  ENGINE_LLM_RESPONSES: {
    name: "engine-llm-responses",
    key: getEngineLlmResponsePrefixRedisKey(),
    description: "Prefix for storing LLM response payloads",
  },
  ENGINE_PROACTIVE_TASKS: {
    name: "engine-proactive-tasks",
    key: getEngineProactiveTaskQueueRedisKey(),
    description: "Queue for processing background proactive AI jobs",
  },
  ENGINE_PROACTIVE_RESPONSES: {
    name: "engine-proactive-responses",
    key: getEngineProactiveResponseQueueRedisKey(),
    description: "Queue for publishing completed proactive responses",
  },
  EMAIL: {
    name: "email",
    key: getEmailQueueRedisKey(),
    description: "Queue for sending emails via Weave Worker",
  },
  ENGINE_DEAD_LETTER: {
    name: "engine-dead-letter",
    key: process.env.REDIS_ENGINE_LLM_DEAD_LETTER_QUEUE_KEY || "weave:engine:llm:dead-letter",
    description: "Dead letter queue for permanently failed engine jobs",
  },
};

const queuesList = Object.values(REDIS_QUEUES);

module.exports = {
  REDIS_QUEUES,
  queuesList,
};
