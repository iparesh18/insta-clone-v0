/**
 * utils/uploadToImageKit.js
 *
 * Uploads a file buffer (from Multer) to ImageKit and returns the
 * public URL + fileId. The fileId is persisted in MongoDB so we can
 * call imagekit.deleteFile(fileId) when a user deletes a post/reel.
 */

const imagekit = require("../config/imagekit");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

/**
 * @param {Buffer|string} fileInput - File buffer from multer memoryStorage OR temp file path
 * @param {string} folder     - ImageKit destination folder (e.g. "posts", "reels")
 * @param {string} [mimetype] - MIME type for extension inference
 * @returns {{ url: string, fileId: string, thumbnailUrl?: string }}
 */
const uploadToImageKit = async (fileInput, folder, mimetype = "image/jpeg") => {
  const ext = mimetype.split("/")[1]?.split("+")[0] || "jpg";
  const fileName = `${uuidv4()}.${ext}`;

  let uploadFile = fileInput;
  if (typeof fileInput === "string") {
    uploadFile = await fs.promises.readFile(fileInput);
  }

  const result = await imagekit.upload({
    file: uploadFile,
    fileName,
    folder: `/${folder}`,
    useUniqueFileName: false, // we already generate a UUID name
    tags: [folder],
  });

  return {
    url: result.url,
    fileId: result.fileId,
    thumbnailUrl: result.thumbnailUrl || "",
    width: result.width,
    height: result.height,
  };
};

/**
 * Delete a file from ImageKit by its fileId.
 */
const deleteFromImageKit = async (fileId) => {
  if (!fileId) return;
  try {
    await imagekit.deleteFile(fileId);
  } catch (err) {
    // Log but don't throw — storage cleanup failure shouldn't break the API
    console.warn(`ImageKit delete failed for fileId ${fileId}:`, err.message);
  }
};

module.exports = { uploadToImageKit, deleteFromImageKit };
