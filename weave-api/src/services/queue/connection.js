const Redis = require("ioredis");

/**
 * Shared ioredis client for Valkey/Redis (queues, cache). Prefer `./queue-controller` for list jobs.
 * @type {import("ioredis").default}
 */
const redisOptions = {
  family: 4, // Force IPv4 to prevent Node 18+ ETIMEDOUT on IPv6 resolution
  // Fail fast when Redis is unavailable: API requests must not hang.
  enableReadyCheck: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  connectTimeout: 2000,
  commandTimeout: 2000,
  retryStrategy: (times) => {
    // 1st reconnect attempt after 200ms, then stop retrying.
    if (times <= 1) return 200;
    return null;
  },
};

// Add TLS options if the URL uses rediss://
if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://")) {
  redisOptions.tls = { rejectUnauthorized: false };
}

const redis = new Redis(process.env.REDIS_URL, redisOptions);

redis.on("error", (error) => {
  console.error("[Redis] Config error:", error);
});

module.exports = redis;
