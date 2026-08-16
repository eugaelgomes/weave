const Redis = require("ioredis");
const { getBlockingRedisOptions } = require("./blocking-redis-options");

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

module.exports = redisConsumer;
