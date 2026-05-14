/**
 * Shared ioredis options for connections that run blocking commands (BLPOP).
 * Do not set commandTimeout — it breaks long BLPOP waits.
 *
 * @returns {import("ioredis").CommonRedisOptions}
 */
function getBlockingRedisOptions() {
  return {
    connectTimeout: 5000,
    enableOfflineQueue: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      return Math.min(5000, 200 * times);
    },
  };
}

module.exports = { getBlockingRedisOptions };
