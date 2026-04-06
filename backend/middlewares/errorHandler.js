/**
 * middlewares/errorHandler.js
 * Centralised error handling — catches all errors passed via next(err).
 */

const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  logger.error(err);

  // Multer upload errors (size, file count, etc.)
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Please upload a smaller file.",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || "Upload failed",
    });
  }

  // Custom upload errors from fileFilter
  if (typeof err.message === "string" && err.message.startsWith("Unsupported file type:")) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(", ") });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Internal server error"
      : err.message || "Internal server error";

  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
