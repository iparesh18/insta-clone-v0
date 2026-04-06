/**
 * middlewares/imageCompression.js
 * Image compression middleware for post, story and profile uploads
 * Compresses images to reduce file size and optimize storage
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs").promises;
const logger = require("../utils/logger");

/**
 * Compress image files in a multer request
 * Reduces file size by up to 70% while maintaining quality
 * Supports: jpg, jpeg, png, webp
 */
const compressImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const compressedFiles = await Promise.all(
      req.files
        .filter((file) => isImageFile(file.mimetype))
        .map((file) => compressImage(file))
    );

    // Replace original files with compressed versions
    req.files = req.files.map((file) => {
      const compressed = compressedFiles.find(
        (cf) => cf.originalName === file.originalname
      );
      return compressed || file;
    });

    next();
  } catch (err) {
    logger.error("Image compression error:", err);
    // Continue with original files if compression fails
    next();
  }
};

/**
 * Compress a single image file
 */
const compressImage = async (file) => {
  try {
    const extension = getImageExtension(file.mimetype);
    const compressedPath = path.join(
      path.dirname(file.path),
      `${path.parse(file.filename).name}_compressed.${extension}`
    );

    // Determine compression settings based on file size
    const isLargeFile = file.size > 2000000; // > 2MB
    const quality = isLargeFile ? 70 : 80; // Lower quality for large files
    const maxWidth = isLargeFile ? 1920 : 2560;
    const maxHeight = isLargeFile ? 1080 : 1440;

    // Compress and optimize
    await sharp(file.path)
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toFormat(extension, { quality, progressive: true })
      .toFile(compressedPath);

    // Get file stats
    const stats = await fs.stat(compressedPath);
    const originalSize = file.size;
    const compressedSize = stats.size;
    const savedPercentage = (
      ((originalSize - compressedSize) / originalSize) *
      100
    ).toFixed(2);

    logger.info(
      `Image compressed: ${file.originalname} | Original: ${(originalSize / 1024).toFixed(2)}KB → Compressed: ${(compressedSize / 1024).toFixed(2)}KB (${savedPercentage}% saved)`
    );

    // Delete original file
    await fs.unlink(file.path);

    return {
      ...file,
      path: compressedPath,
      filename: path.basename(compressedPath),
      originalName: file.originalname,
      size: compressedSize,
      originalSize,
      compressionRatio: savedPercentage,
    };
  } catch (err) {
    logger.warn(`Could not compress image ${file.originalname}:`, err.message);
    return file; // Return original if compression fails
  }
};

/**
 * Check if file is an image
 */
const isImageFile = (mimetype) => {
  const imageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  return imageTypes.includes(mimetype.toLowerCase());
};

/**
 * Get optimized image extension
 */
const getImageExtension = (mimetype) => {
  const mimeToExt = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return mimeToExt[mimetype.toLowerCase()] || "jpg";
};

module.exports = {
  compressImages,
};
