/**
 * Shared ioredis options for connections that run blocking commands (BLPOP).
 * Do not set commandTimeout — it breaks long BLPOP waits.
 *
 * @returns {import("ioredis").CommonRedisOptions}
 */
function getBlockingRedisOptions() {
  const options = {
    family: 4, // Force IPv4 to prevent Node 18+ ETIMEDOUT on IPv6 resolution
    connectTimeout: 5000,
    enableOfflineQueue: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      return Math.min(5000, 200 * times);
    },
  };

  // Add TLS options if the URL uses rediss://
  if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://")) {
    options.tls = { rejectUnauthorized: false };
  }

  return options;
}

module.exports = { getBlockingRedisOptions };
