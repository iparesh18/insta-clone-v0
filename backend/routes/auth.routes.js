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
const { validate } = require("../middlewares/validate");
const { authValidators } = require("../validations/routeValidators");

router.post("/register", authLimiter, authValidators.register, validate, register);
router.post("/login", authLimiter, authValidators.login, validate, login);
router.post("/logout", protectedLimiter, protect, logout);
router.get("/me", protectedLimiter, protect, getMe);

module.exports = router;
