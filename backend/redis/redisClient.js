/**
 * redis/redisClient.js
 * Singleton ioredis client shared across the application.
 */

const Redis = require("ioredis");
const logger = require("../utils/logger");

let redisClient = null;

const getRedisClient = () => {
  if (redisClient) return redisClient;

  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error("Redis: max retries reached");
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redisClient.on("connect", () => logger.info("Redis connected"));
  redisClient.on("error", (err) => logger.error("Redis error:", err.message));

  return redisClient;
};

module.exports = getRedisClient;
