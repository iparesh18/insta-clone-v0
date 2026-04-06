/**
 * utils/jwt.js
 * Signs and verifies JWT access tokens.
 */

const jwt = require("jsonwebtoken");

const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || "7d",
  });

const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET);

const generateOTP = () =>
  String(Math.floor(100000 + Math.random() * 900000));

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateOTP,
};
