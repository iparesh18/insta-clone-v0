/**
 * jobs/worker.js
 *
 * Standalone worker process. Run with: node jobs/worker.js
 * Separating workers from the API process allows independent scaling
 * and prevents heavy background jobs from blocking request handling.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { Worker } = require("bullmq");
const getRedisClient = require("../redis/redisClient");
const connectDB = require("../config/db");
const logger = require("../utils/logger");

// Job handler imports
const { processReelView } = require("./handlers/reelViewHandler");
const { processNotification } = require("./handlers/notificationHandler");

const connection = getRedisClient();

const startWorkers = async () => {
  await connectDB();

  // ─── Reel View Worker ──────────────────────────────────────────────────────
  const reelViewWorker = new Worker("reelViewQueue", processReelView, {
    connection,
    concurrency: 20, // high throughput for view events
  });

  reelViewWorker.on("completed", (job) =>
    logger.info(`[reelViewQueue] Job ${job.id} completed`)
  );
  reelViewWorker.on("failed", (job, err) =>
    logger.error(`[reelViewQueue] Job ${job.id} failed: ${err.message}`)
  );

  // ─── Notification Worker ────────────────────────────────────────────────────
  const notificationWorker = new Worker(
    "notificationQueue",
    processNotification,
    { connection, concurrency: 10 }
  );

  notificationWorker.on("completed", (job) =>
    logger.info(`[notificationQueue] Job ${job.id} completed`)
  );
  notificationWorker.on("failed", (job, err) =>
    logger.error(`[notificationQueue] Job ${job.id} failed: ${err.message}`)
  );

  logger.info("✅ All BullMQ workers started");

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down workers…");
    await Promise.all([
      reelViewWorker.close(),
      notificationWorker.close(),
    ]);
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

startWorkers().catch((err) => {
  logger.error("Worker startup failed:", err);
  process.exit(1);
});
