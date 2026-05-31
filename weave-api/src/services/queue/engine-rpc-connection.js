const Redis = require("ioredis");
const { getBlockingRedisOptions } = require("./blocking-redis-options");

/**
 * Dedicated Redis client for server→engine chat RPC (LPUSH + BLPOP on response keys).
 * Must not use the producer client ({@link ./connection.js}), which sets commandTimeout.
 *
 * @type {import("ioredis").default}
 */
const engineRpcRedis = new Redis(
  process.env.REDIS_URL,
  getBlockingRedisOptions()
);

engineRpcRedis.on("error", (error) => {
  // eslint-disable-next-line no-console -- engine RPC infra diagnostics
  console.error("[RedisEngineRpc] Error:", error);
});

module.exports = engineRpcRedis;
