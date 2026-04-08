import { Redis } from "ioredis";
import logger from "./logger.js";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times) => {
    if(times >= 5) {
      logger.error(`[REDIS RETRY]: Failed to connect after ${times} attempts`);
      return null; // Stop retrying after 5 attempts
    }
    const delay = Math.min(times * 50, 2000);
    logger.warn(`[REDIS RETRY]: Attempt ${times}, retrying in ${delay}ms`);
    return delay;
  }
});

redis.on("connect", () => logger.info("[REDIS CONNECTION]: Redis connected"));
redis.on("error", (err: any) => logger.warn("[REDIS ERROR]:", { error: err }));

// VERY IMPORTANT: Call this function whenever a product is created, updated, or deleted to ensure cache consistency
export const invalidateProductCache = async (productId: string) => {
  // Delete the specific product cache
  await redis.del(`products:id:${productId}`);
  
  // Delete all paginated list caches — use pattern delete
  const listKeys = await redis.keys("products:list:*");
  if (listKeys.length > 0) {
    await redis.del(...listKeys);
  }

  logger.info(`Cache invalidated for product: ${productId}`);
};

export default redis;