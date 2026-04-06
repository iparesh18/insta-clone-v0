/**
 * server.js — Entry Point
 * Bootstraps the HTTP server, attaches Socket.io,
 * and connects to MongoDB before accepting traffic.
 */

const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { initSocket } = require("./socket/socketManager");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);
    initSocket(server);

    // Increase timeout for large file uploads (5 minutes)
    server.requestTimeout = 300000;
    server.headersTimeout = 305000;

    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();
