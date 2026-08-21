import Redis, { RedisOptions } from "ioredis";

export function getBlockingRedisOptions(): RedisOptions {
  const options: RedisOptions = {
    connectTimeout: 5000,
    enableOfflineQueue: true,
    enableReadyCheck: true,
    family: 4,
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => {
      return Math.min(5000, 200 * times);
    },
  };

  if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://")) {
    options.tls = { rejectUnauthorized: false };
  }

  return options;
}

const defaultOptions: RedisOptions = {
  commandTimeout: 2000,
  connectTimeout: 2000,
  enableOfflineQueue: false,
  enableReadyCheck: true,
  family: 4,
  maxRetriesPerRequest: null, // Keep null for resilience
  retryStrategy: (times: number) => {
    // Retry gracefully every 5 seconds without crashing
    return Math.min(times * 1000, 5000);
  },
};

if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://")) {
  defaultOptions.tls = { rejectUnauthorized: false };
}

let isLoggedError = false;

// Default producer client
export const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", defaultOptions);

redis.on("error", (error: Error) => {
  if (!isLoggedError) {
    console.warn(`[Redis] Connection unavailable (${error.message}). Running in offline/no-redis mode. Retry loop active.`);
    isLoggedError = true;
  }
});

redis.on("connect", () => {
  if (isLoggedError) {
    console.info("[Redis] Connected successfully.");
    isLoggedError = false;
  }
});

// Dedicated client for consumers (BLPOP)
export const redisConsumer = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", getBlockingRedisOptions());

redisConsumer.on("error", (error: Error) => {
  // Suppress spammy errors for consumers
});

// Dedicated RPC client
export const engineRpcRedis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", getBlockingRedisOptions());

engineRpcRedis.on("error", (error: Error) => {
  // Suppress spammy errors for RPC
});
