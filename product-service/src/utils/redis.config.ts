import { Redis } from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
});

redis.on("connect", () => console.log("[REDIS CONNECTION]: Redis connected"));
redis.on("error", (err: any) => console.error("[REDIS ERROR]:", err));

// VERY IMPORTANT: Call this function whenever a product is created, updated, or deleted to ensure cache consistency
export const invalidateProductCache = async (productId: string) => {
  // Delete the specific product cache
  await redis.del(`products:id:${productId}`);
  
  // Delete all paginated list caches — use pattern delete
  const listKeys = await redis.keys("products:list:*");
  if (listKeys.length > 0) {
    await redis.del(...listKeys);
  }

  console.log(`Cache invalidated for product: ${productId}`);
};

export default redis;