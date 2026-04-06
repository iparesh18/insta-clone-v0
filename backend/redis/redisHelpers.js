/**
 * redis/redisHelpers.js
 * High-level helpers wrapping raw Redis commands.
 */

const getRedisClient = require("./redisClient");

const FEED_PREFIX = "feed:";
const ONLINE_PREFIX = "online:";

// ─── Feed Cache ──────────────────────────────────────────────────────────────

/**
 * Cache a user's home feed for 2 minutes.
 * Invalidated when the user follows/unfollows someone.
 */
const cacheFeed = async (userId, page, data) => {
  const client = getRedisClient();
  await client.setex(`${FEED_PREFIX}${userId}:${page}`, 120, JSON.stringify(data));
};

const getCachedFeed = async (userId, page) => {
  const client = getRedisClient();
  const raw = await client.get(`${FEED_PREFIX}${userId}:${page}`);
  return raw ? JSON.parse(raw) : null;
};

const invalidateFeedCache = async (userId) => {
  const client = getRedisClient();
  const keys = await client.keys(`${FEED_PREFIX}${userId}:*`);
  if (keys.length) await client.del(...keys);
};

// ─── Online Presence ─────────────────────────────────────────────────────────

const setUserOnline = async (userId) => {
  const client = getRedisClient();
  await client.setex(`${ONLINE_PREFIX}${userId}`, 60, "1");
};

const isUserOnline = async (userId) => {
  const client = getRedisClient();
  const val = await client.get(`${ONLINE_PREFIX}${userId}`);
  return val === "1";
};

module.exports = {
  cacheFeed,
  getCachedFeed,
  invalidateFeedCache,
  setUserOnline,
  isUserOnline,
};
