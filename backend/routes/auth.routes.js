/**
 * routes/auth.routes.js
 */

const router = require("express").Router();
const {
  register,
  login,
  logout,
  getMe,
} = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth");
const { authLimiter, protectedLimiter } = require("../middlewares/rateLimiter");

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", protectedLimiter, protect, logout);
router.get("/me", protectedLimiter, protect, getMe);

module.exports = router;
