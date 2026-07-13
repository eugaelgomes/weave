/**
 * @module weave-engine/services/cache/redis-queues
 * @description Centralized registry of Redis queues used by Weave Engine.
 */

const {
  getEngineLlmRequestQueueRedisKey,
  getEngineSubagentRequestQueueRedisKey,
  getEngineLlmResponsePrefixRedisKey,
  getEngineProactiveTaskQueueRedisKey,
  getEngineProactiveResponseQueueRedisKey,
  getEmailQueueRedisKey,
} = require("./redis-queue-keys");

const REDIS_QUEUES = {
  EMAIL: {
    description: "Queue for sending emails via Weave Worker",
    key: getEmailQueueRedisKey(),
    name: "email",
  },
  ENGINE_DEAD_LETTER: {
    description: "Dead letter queue for permanently failed engine jobs",
    key:
      process.env.REDIS_ENGINE_LLM_DEAD_LETTER_QUEUE_KEY ||
      "weave:engine:llm:dead-letter",
    name: "engine-dead-letter",
  },
  ENGINE_LLM_REQUESTS: {
    description: "Queue for processing real-time LLM chat requests",
    key: getEngineLlmRequestQueueRedisKey(),
    name: "engine-llm-requests",
  },
  ENGINE_LLM_RESPONSES: {
    description: "Prefix for storing LLM response payloads",
    key: getEngineLlmResponsePrefixRedisKey(),
    name: "engine-llm-responses",
  },
  ENGINE_PROACTIVE_RESPONSES: {
    description: "Queue for publishing completed proactive responses",
    key: getEngineProactiveResponseQueueRedisKey(),
    name: "engine-proactive-responses",
  },
  ENGINE_PROACTIVE_TASKS: {
    description: "Queue for processing background proactive AI jobs",
    key: getEngineProactiveTaskQueueRedisKey(),
    name: "engine-proactive-tasks",
  },
  ENGINE_SUBAGENT_REQUESTS: {
    description: "Queue for processing recursive sub-agent requests",
    key: getEngineSubagentRequestQueueRedisKey(),
    name: "engine-subagent-requests",
  },
};

const queuesList = Object.values(REDIS_QUEUES);

module.exports = {
  queuesList,
  REDIS_QUEUES,
};
