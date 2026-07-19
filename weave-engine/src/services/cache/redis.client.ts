import Redis from "ioredis";
import { logger } from "../logger";

const redis = new Redis(process.env.REDIS_URL || "", {
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

redis.on("error", (error: Error) => {
  logger.error("Engine Redis config error", { error: error.message });
});

export default redis;
