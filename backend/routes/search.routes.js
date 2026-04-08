/**
 * routes/search.routes.js
 * Global search across users, posts, reels, hashtags
 */

const router = require("express").Router();
const { globalSearch } = require("../controllers/search.controller");
const { protect } = require("../middlewares/auth");

// GET /search?q=keyword
router.get("/", protect, globalSearch);

module.exports = router;
