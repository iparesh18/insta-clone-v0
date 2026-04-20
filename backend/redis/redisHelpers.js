/**
 * redis/redisHelpers.js
 * High-level helpers wrapping raw Redis commands.
 */

const getRedisClient = require("./redisClient");

const FEED_PREFIX = "feed:";
const ONLINE_PREFIX = "online:";
const ANALYTICS_PREFIX = "analytics:";

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

// ─── Analytics Cache ─────────────────────────────────────────────────────────

const cacheAnalytics = async (userId, key, data, ttl = 300) => {
  const client = getRedisClient();
  await client.setex(`${ANALYTICS_PREFIX}${userId}:${key}`, ttl, JSON.stringify(data));
};

const getCachedAnalytics = async (userId, key) => {
  const client = getRedisClient();
  const raw = await client.get(`${ANALYTICS_PREFIX}${userId}:${key}`);
  return raw ? JSON.parse(raw) : null;
};

const invalidateAnalyticsCache = async (userId) => {
  const client = getRedisClient();
  const keys = await client.keys(`${ANALYTICS_PREFIX}${userId}:*`);
  if (keys.length) await client.del(...keys);
};

// ─── Online Presence ─────────────────────────────────────────────────────────

/**
 * Set user as online. Uses a long expiration (1 hour) with socket ping keeping it alive.
 * Stores: { onlineAt: timestamp, lastActiveAt: timestamp }
 */
const setUserOnline = async (userId) => {
  const client = getRedisClient();
  const now = Date.now();
  const data = JSON.stringify({
    onlineAt: now,
    lastActiveAt: now,
  });
  // 1-hour expiration; socket ping will keep it refreshed
  await client.setex(`${ONLINE_PREFIX}${userId}`, 3600, data);
};

/**
 * Refresh last active time (prolongs expiration, keeps user online)
 */
const refreshUserActivity = async (userId) => {
  const client = getRedisClient();
  const raw = await client.get(`${ONLINE_PREFIX}${userId}`);
  
  if (raw) {
    const data = JSON.parse(raw);
    data.lastActiveAt = Date.now();
    await client.setex(`${ONLINE_PREFIX}${userId}`, 3600, JSON.stringify(data));
  }
};

/**
 * Check if user is currently online
 */
const isUserOnline = async (userId) => {
  const client = getRedisClient();
  const raw = await client.get(`${ONLINE_PREFIX}${userId}`);
  return raw !== null;
};

/**
 * Get user's online status with last seen timestamp
 * Returns: { online: boolean, lastSeen: timestamp | null }
 */
const getUserOnlineStatus = async (userId) => {
  const client = getRedisClient();
  const raw = await client.get(`${ONLINE_PREFIX}${userId}`);
  
  if (raw) {
    return { online: true, lastSeen: null };
  }
  
  const lastSeenRaw = await client.get(`${ONLINE_PREFIX}${userId}:lastSeen`);
  if (lastSeenRaw) {
    return { online: false, lastSeen: parseInt(lastSeenRaw, 10) };
  }
  
  return { online: false, lastSeen: null };
};

/**
 * Mark user as offline and store last seen time (persists for 30 days)
 */
const setUserOffline = async (userId) => {
  const client = getRedisClient();
  await client.del(`${ONLINE_PREFIX}${userId}`);
  await client.setex(`${ONLINE_PREFIX}${userId}:lastSeen`, 2592000, Date.now().toString());
};

module.exports = {
  cacheFeed,
  getCachedFeed,
  invalidateFeedCache,
  cacheAnalytics,
  getCachedAnalytics,
  invalidateAnalyticsCache,
  setUserOnline,
  refreshUserActivity,
  isUserOnline,
  getUserOnlineStatus,
  setUserOffline,
};
