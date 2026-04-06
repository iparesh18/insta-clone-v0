/**
 * queues/index.js
 * Defines all BullMQ queues. Queues are shared between the main
 * Express process (producers) and the worker process (consumers).
 */

const { Queue } = require("bullmq");
const getRedisClient = require("../redis/redisClient");

const connection = getRedisClient();

const reelViewQueue = new Queue("reelViewQueue", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "fixed", delay: 2000 },
    removeOnComplete: 200,
    removeOnFail: 200,
  },
});

const notificationQueue = new Queue("notificationQueue", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

module.exports = { reelViewQueue, notificationQueue };
