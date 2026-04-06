/**
 * middlewares/auth.js
 * Verifies JWT access token on protected routes.
 */

const { verifyAccessToken } = require("../utils/jwt");
const User = require("../models/User");
const { sendError } = require("../utils/apiResponse");

const protect = async (req, res, next) => {
  try {
    let token;

    // Support both cookie and Authorization header
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return sendError(res, "Not authenticated", 401);
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return sendError(res, "User not found", 401);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return sendError(res, "Access token expired", 401);
    }
    return sendError(res, "Invalid token", 401);
  }
};

module.exports = { protect };
