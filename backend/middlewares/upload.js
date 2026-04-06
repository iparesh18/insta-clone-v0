/**
 * middlewares/upload.js
 * Multer with memory storage — buffers are passed to ImageKit upload.
 * Image uploads are compressed to reduce file size and bandwidth.
 */

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { compressImages } = require("./imageCompression");

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/ogg",
  "video/x-m4v",
  "video/3gpp",
];

const createUpload = (allowedTypes, maxSizeMB = 50) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
      }
    },
  });

const tempUploadDir = path.join(process.cwd(), "tmp", "uploads");
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const createDiskUpload = (allowedTypes, maxSizeMB = 100) =>
  multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, tempUploadDir),
      filename: (req, file, cb) => {
        const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname.replace(/\s+/g, "_")}`;
        cb(null, safeName);
      },
    }),
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
      }
    },
  });

const imageUpload = createUpload(ALLOWED_IMAGE_TYPES, 10);
// Disk storage prevents process crashes from large in-memory video buffers.
const videoUpload = createDiskUpload(
  [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES],
  120
);
const avatarUpload = createUpload(ALLOWED_IMAGE_TYPES, 5);

// Middleware chain: upload → compress (for disk uploads)
const uploadWithCompression = (allowedTypes, maxSizeMB = 100) => [
  createDiskUpload(allowedTypes, maxSizeMB).array("media", 10),
  compressImages,
];

const uploadSingleWithCompression = (allowedTypes, maxSizeMB = 5) => [
  createDiskUpload(allowedTypes, maxSizeMB).single("file"),
  compressImages,
];

// For reels with video + thumbnail
const createReelUpload = (maxSizeMB = 120) =>
  multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, tempUploadDir),
      filename: (req, file, cb) => {
        const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname.replace(/\s+/g, "_")}`;
        cb(null, safeName);
      },
    }),
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
      }
    },
  });

const reelUpload = [
  createReelUpload(120).fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  compressImages,
];

module.exports = {
  imageUpload,
  videoUpload,
  avatarUpload,
  uploadWithCompression,
  uploadSingleWithCompression,
  reelUpload,
};
