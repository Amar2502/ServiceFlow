import Redis, { RedisOptions } from "ioredis";
import { config } from "./config";

export const redisOptions: RedisOptions = {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) {
      return 30000;
    }
    return Math.min(times * 1000, 3000);
  },
  enableReadyCheck: true,
  lazyConnect: true,
};

export const redis = new Redis(config.REDIS_URL, redisOptions);

let redisReady = false;

redis.on("connect", () => {
  console.log("[Redis] Connected to Redis instance");
});

redis.on("ready", () => {
  redisReady = true;
  console.log("[Redis] Connection is ready to accept commands");
});

redis.on("error", (err) => {
  redisReady = false;
  console.warn(`[Redis Warning] Redis connection issue: ${err.message}`);
});

redis.on("close", () => {
  redisReady = false;
});

export function isRedisAvailable(): boolean {
  return redisReady && redis.status === "ready";
}

export async function closeRedis(): Promise<void> {
  if (redis.status !== "end") {
    try {
      await redis.quit();
      console.log("[Redis] Disconnected cleanly.");
    } catch {
      redis.disconnect();
    }
  }
}


