const Redis = require("ioredis");

/**
 * Dedicated Redis client for long-running consumers (BLPOP loops).
 * Unlike the producer client, this should keep trying to reconnect and may queue commands
 * because consumers are background processes and must be resilient to transient outages.
 *
 * @type {import("ioredis").default}
 */
const redisConsumer = new Redis(process.env.REDIS_URL, {
  connectTimeout: 5000,
  enableOfflineQueue: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: null,
  // Don't set commandTimeout for BLPOP(0); let it block.
  retryStrategy: (times) => {
    // Exponential-ish backoff up to 5s.
    return Math.min(5000, 200 * times);
  },
});

redisConsumer.on("error", (error) => {
  // eslint-disable-next-line no-console -- consumer infra diagnostics
  console.error("[RedisConsumer] Error:", error);
});

module.exports = redisConsumer;

