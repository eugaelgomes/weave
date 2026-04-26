const Redis = require("ioredis");
const { logger } = require("../logger");

const redis = new Redis(process.env.REDIS_URL, {
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

redis.on("error", (error) => {
  logger.error("Engine Redis config error", { error: error.message });
});

module.exports = redis;
