/**
 * routes/search.routes.js
 * Global search across users, posts, reels, hashtags
 */

const router = require("express").Router();
const { globalSearch } = require("../controllers/search.controller");
const { protect } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { searchValidators } = require("../validations/routeValidators");

// GET /search?q=keyword
router.get("/", protect, searchValidators.globalSearch, validate, globalSearch);

module.exports = router;
