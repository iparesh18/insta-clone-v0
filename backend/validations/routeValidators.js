const { body, param, query, oneOf } = require("express-validator");

const usernameRegex = /^[a-zA-Z0-9._]+$/;
const reelCursorRegex = /^\d+_[a-f\d]{24}$/i;

const mongoIdParam = (name) =>
  param(name).isMongoId().withMessage(`${name} must be a valid MongoDB ObjectId`);

const cursorQuery = () =>
  query("cursor")
    .optional()
    .isMongoId()
    .withMessage("cursor must be a valid MongoDB ObjectId");

const limitQuery = (max = 50) =>
  query("limit")
    .optional()
    .isInt({ min: 1, max })
    .withMessage(`limit must be an integer between 1 and ${max}`)
    .toInt();

const authValidators = {
  register: [
    body("username")
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("username must be 3-30 characters")
      .matches(usernameRegex)
      .withMessage("username can only contain letters, numbers, dots, and underscores"),
    body("email").trim().isEmail().withMessage("valid email is required").normalizeEmail(),
    body("password")
      .isString()
      .withMessage("password must be a string")
      .isLength({ min: 6, max: 128 })
      .withMessage("password must be between 6 and 128 characters"),
    body("fullName")
      .optional({ nullable: true })
      .trim()
      .isLength({ min: 1, max: 60 })
      .withMessage("fullName must be 1-60 characters"),
  ],
  login: [
    body("email").trim().isEmail().withMessage("valid email is required").normalizeEmail(),
    body("password").isString().withMessage("password is required").notEmpty().withMessage("password is required"),
  ],
};

const userValidators = {
  searchUsers: [
    query("q").trim().notEmpty().withMessage("q is required"),
    limitQuery(50),
  ],
  getSuggestions: [limitQuery(20)],
  getProfile: [
    param("username")
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("username must be 3-30 characters")
      .matches(usernameRegex)
      .withMessage("username format is invalid"),
  ],
  updateProfile: [
    body("fullName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 60 })
      .withMessage("fullName must be 1-60 characters"),
    body("bio")
      .optional()
      .trim()
      .isLength({ max: 150 })
      .withMessage("bio cannot exceed 150 characters"),
    body("website")
      .optional({ checkFalsy: true })
      .isURL({ require_protocol: true, protocols: ["http", "https"] })
      .withMessage("website must be a valid URL with http/https"),
    body("isPrivate")
      .optional()
      .isBoolean()
      .withMessage("isPrivate must be a boolean")
      .toBoolean(),
  ],
  idParam: [mongoIdParam("id")],
  followRequestIdParam: [mongoIdParam("id")],
  followersFollowing: [mongoIdParam("id"), cursorQuery(), limitQuery(50)],
  pushSubscription: [
    body("subscription").isObject().withMessage("subscription object is required"),
    body("subscription.endpoint")
      .isURL({ require_protocol: true })
      .withMessage("subscription.endpoint must be a valid URL"),
    body("subscription.keys").isObject().withMessage("subscription.keys is required"),
    body("subscription.keys.p256dh")
      .isString()
      .notEmpty()
      .withMessage("subscription.keys.p256dh is required"),
    body("subscription.keys.auth")
      .isString()
      .notEmpty()
      .withMessage("subscription.keys.auth is required"),
  ],
};

const postValidators = {
  feed: [cursorQuery(), limitQuery(50)],
  userPosts: [mongoIdParam("userId")],
  createPost: [
    body("caption")
      .optional({ nullable: true })
      .isLength({ max: 2200 })
      .withMessage("caption cannot exceed 2200 characters"),
    body("location")
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage("location cannot exceed 100 characters"),
  ],
  generateCaption: [
    body("prompt")
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 400 })
      .withMessage("prompt cannot exceed 400 characters"),
    body("location")
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 100 })
      .withMessage("location cannot exceed 100 characters"),
    body("mediaType")
      .optional({ nullable: true })
      .isIn(["image", "video", "carousel"])
      .withMessage("mediaType must be image, video, or carousel"),
    body("base64ImageFile")
      .optional({ nullable: true })
      .isString()
      .withMessage("base64ImageFile must be a base64 string"),
    body("mimeType")
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 100 })
      .withMessage("mimeType is invalid"),
  ],
  postId: [mongoIdParam("id")],
  likesComments: [mongoIdParam("id"), cursorQuery(), limitQuery(50)],
  addComment: [
    mongoIdParam("id"),
    body("text")
      .trim()
      .notEmpty()
      .withMessage("text is required")
      .isLength({ max: 2200 })
      .withMessage("text cannot exceed 2200 characters"),
  ],
  deleteComment: [mongoIdParam("id"), mongoIdParam("commentId")],
};

const reelValidators = {
  feed: [
    query("cursor")
      .optional()
      .matches(reelCursorRegex)
      .withMessage("cursor must be in score_objectId format"),
    limitQuery(20),
  ],
  userReels: [mongoIdParam("userId")],
  createReel: [
    body("caption")
      .optional({ nullable: true })
      .isLength({ max: 2200 })
      .withMessage("caption cannot exceed 2200 characters"),
  ],
  reelId: [mongoIdParam("id")],
  comments: [mongoIdParam("id"), cursorQuery(), limitQuery(50)],
  addComment: [
    mongoIdParam("id"),
    body("text")
      .trim()
      .notEmpty()
      .withMessage("text is required")
      .isLength({ max: 2200 })
      .withMessage("text cannot exceed 2200 characters"),
  ],
  deleteComment: [mongoIdParam("id"), mongoIdParam("commentId")],
};

const storyValidators = {
  createStory: [
    body("caption")
      .optional({ nullable: true })
      .isLength({ max: 2200 })
      .withMessage("caption cannot exceed 2200 characters"),
  ],
  storyId: [mongoIdParam("id")],
};

const chatValidators = {
  userIdParam: [mongoIdParam("userId")],
  messageIdParam: [mongoIdParam("messageId")],
  getMessages: [mongoIdParam("userId"), cursorQuery(), limitQuery(100)],
  sendMessage: [
    mongoIdParam("userId"),
    oneOf(
      [
        body("text").trim().notEmpty(),
        body("mediaUrl").isURL({ require_protocol: true }),
        body("sharedContent").isObject(),
      ],
      "Message must include text, mediaUrl, or sharedContent"
    ),
    body("sharedContent.type")
      .optional()
      .isIn(["post", "reel"])
      .withMessage("sharedContent.type must be post or reel"),
    body("sharedContent.contentId")
      .optional()
      .isMongoId()
      .withMessage("sharedContent.contentId must be a valid ObjectId"),
    body("sharedContent.message")
      .optional()
      .isLength({ max: 500 })
      .withMessage("sharedContent.message cannot exceed 500 characters"),
  ],
};

const shareValidators = {
  followers: [cursorQuery(), limitQuery(100)],
  sharePost: [
    mongoIdParam("postId"),
    body("recipientIds")
      .isArray({ min: 1, max: 100 })
      .withMessage("recipientIds must contain between 1 and 100 users"),
    body("recipientIds.*")
      .isMongoId()
      .withMessage("each recipientId must be a valid ObjectId"),
    body("message")
      .optional({ nullable: true })
      .isLength({ max: 500 })
      .withMessage("message cannot exceed 500 characters"),
  ],
  shareReel: [
    mongoIdParam("reelId"),
    body("recipientIds")
      .isArray({ min: 1, max: 100 })
      .withMessage("recipientIds must contain between 1 and 100 users"),
    body("recipientIds.*")
      .isMongoId()
      .withMessage("each recipientId must be a valid ObjectId"),
    body("message")
      .optional({ nullable: true })
      .isLength({ max: 500 })
      .withMessage("message cannot exceed 500 characters"),
  ],
  sharedList: [cursorQuery(), limitQuery(50)],
  shareId: [mongoIdParam("shareId")],
};

const searchValidators = {
  globalSearch: [
    query("q")
      .trim()
      .notEmpty()
      .withMessage("q is required")
      .isLength({ max: 100 })
      .withMessage("q cannot exceed 100 characters"),
  ],
};

const notificationValidators = {
  list: [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("limit must be an integer between 1 and 50")
      .toInt(),
    query("skip")
      .optional()
      .isInt({ min: 0 })
      .withMessage("skip must be a non-negative integer")
      .toInt(),
  ],
  notificationId: [mongoIdParam("notificationId")],
};

const verificationValidators = {
  verifyEmail: [
    param("token")
      .isHexadecimal()
      .withMessage("token must be hexadecimal")
      .isLength({ min: 32, max: 128 })
      .withMessage("token length is invalid"),
  ],
  resendVerification: [
    body("email").trim().isEmail().withMessage("valid email is required").normalizeEmail(),
  ],
};

const analyticsValidators = {
  dashboard: [
    query("days")
      .optional()
      .isInt({ min: 7, max: 90 })
      .withMessage("days must be an integer between 7 and 90")
      .toInt(),
  ],
};

module.exports = {
  authValidators,
  userValidators,
  postValidators,
  reelValidators,
  storyValidators,
  chatValidators,
  shareValidators,
  searchValidators,
  notificationValidators,
  verificationValidators,
  analyticsValidators,
};
