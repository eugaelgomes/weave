const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on("error", (error) => {
  console.error("[Redis] Config error:", error);
});

module.exports = redis;
