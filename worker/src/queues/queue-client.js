const Redis = require("ioredis");
const { logger } = require("../config/logger");

const redis = new Redis(process.env.REDIS_URL, {
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

redis.on("error", (error) => {
  logger.error("[Redis] Config error", { error });
});

module.exports = redis;
