/**
 * config/db.js
 * MongoDB connection with Mongoose.
 * Uses connection pooling for production scale.
 */

const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, options);
    logger.info(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected — attempting reconnect");
    });

    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB error:", err);
    });
  } catch (err) {
    logger.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
