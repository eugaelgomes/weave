const Redis = require("ioredis");

/**
 * Shared ioredis client for Valkey/Redis (queues, cache). Prefer `./queue-controller` for list jobs.
 * @type {import("ioredis").default}
 */
const redis = new Redis(process.env.REDIS_URL, {
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

redis.on("error", (error) => {
  console.error("[Redis] Config error:", error);
});

module.exports = redis;
