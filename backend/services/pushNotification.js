/**
 * services/pushNotification.js
 *
 * Web Push Notification Service
 * Manages push notifications for users
 *
 * Environment Variables Required:
 * - VAPID_PUBLIC_KEY: VAPID public key from Firebase/WebPush setup
 * - VAPID_PRIVATE_KEY: VAPID private key from Firebase/WebPush setup
 * - VAPID_SUBJECT: Subject for VAPID (your email: mailto:your@email.com)
 *
 * Setup Instructions:
 * 1. Install web-push: npm install web-push
 * 2. Generate VAPID keys: npx web-push generate-vapid-keys
 * 3. Store the keys in your .env file
 * 4. Configure service worker on frontend
 */

let webpush;

const initPushNotification = () => {
  try {
    webpush = require("web-push");

    // Set VAPID details
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT;

    if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      console.log("✓ Web Push notifications configured");
      return true;
    } else {
      console.warn("⚠️  VAPID keys not configured for push notifications");
      return false;
    }
  } catch (error) {
    console.warn("⚠️  web-push not installed. Install with: npm install web-push");
    return false;
  }
};

/**
 * Send a push notification to a user's device
 *
 * @param {object} subscription - Push subscription object from client
 * @param {object} payload - Notification payload
 * @returns {Promise<object>}
 */
const sendPushNotification = async (subscription, payload) => {
  try {
    if (!webpush) {
      initPushNotification();
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || "Instagram Clone",
      body: payload.body || "",
      icon: payload.icon || "/logo.png",
      badge: payload.badge || "/badge.png",
      tag: payload.tag || "notification",
      data: payload.data || {},
    });

    await webpush.sendNotification(subscription, notificationPayload);
    console.log("✓ Push notification sent");
    return { success: true };
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription is invalid, should be removed from database
      console.warn("⚠️  Invalid subscription, should be removed from database");
      return { success: false, shouldDelete: true };
    }
    console.error("✗ Push notification failed:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send push notifications to multiple users
 *
 * @param {object[]} subscriptions - Array of subscription objects
 * @param {object} payload - Notification payload
 * @returns {Promise<object>}
 */
const sendBulkPushNotifications = async (subscriptions, payload) => {
  if (!subscriptions || subscriptions.length === 0) {
    return { success: true, count: 0, failed: [] };
  }

  const results = {
    success: true,
    count: 0,
    failed: [],
  };

  for (const subscription of subscriptions) {
    try {
      await sendPushNotification(subscription, payload);
      results.count++;
    } catch (err) {
      results.failed.push({
        subscription,
        error: err.message,
      });
    }
  }

  return results;
};

/**
 * Register a device token for push notifications
 * Called when a user subscribes on the client
 *
 * @param {object} User - User model
 * @param {string} userId - User ID
 * @param {string} token - Device push token
 * @returns {Promise<boolean>}
 */
const registerPushToken = async (User, userId, token) => {
  try {
    if (!token) return false;

    const user = await User.findById(userId);
    if (!user) return false;

    // Avoid duplicates
    if (!user.pushTokens.includes(token)) {
      user.pushTokens.push(token);
      await user.save();
      console.log(`✓ Push token registered for user ${userId}`);
    }

    return true;
  } catch (error) {
    console.error("✗ Failed to register push token:", error);
    return false;
  }
};

/**
 * Unregister a device token
 * Called when a user unsubscribes on the client
 *
 * @param {object} User - User model
 * @param {string} userId - User ID
 * @param {string} token - Device push token
 * @returns {Promise<boolean>}
 */
const unregisterPushToken = async (User, userId, token) => {
  try {
    if (!token) return false;

    const user = await User.findById(userId);
    if (!user) return false;

    user.pushTokens = user.pushTokens.filter((t) => t !== token);
    await user.save();
    console.log(`✓ Push token unregistered for user ${userId}`);

    return true;
  } catch (error) {
    console.error("✗ Failed to unregister push token:", error);
    return false;
  }
};

/**
 * Example notification payloads for different events
 */
const notificationTemplates = {
  like: (actor, postType = "post") => ({
    title: `${actor.username} liked your ${postType}`,
    body: `Check out what ${actor.username} likes!`,
    icon: actor.profilePicture,
    tag: `like-${actor._id}`,
    data: {
      type: "like",
      actorId: actor._id,
      actionUrl: `/post/${postType}`,
    },
  }),

  comment: (actor, postType = "post") => ({
    title: `${actor.username} commented on your ${postType}`,
    body: `See what ${actor.username} has to say`,
    icon: actor.profilePicture,
    tag: `comment-${actor._id}`,
    data: {
      type: "comment",
      actorId: actor._id,
      actionUrl: `/post/${postType}`,
    },
  }),

  mention: (actor, postType = "post") => ({
    title: `${actor.username} mentioned you`,
    body: `${actor.username} mentioned you in a ${postType}`,
    icon: actor.profilePicture,
    tag: `mention-${actor._id}`,
    data: {
      type: "mention",
      actorId: actor._id,
      actionUrl: `/post/${postType}`,
    },
  }),

  follow: (actor) => ({
    title: `${actor.username} started following you`,
    body: `${actor.username} is now following your account`,
    icon: actor.profilePicture,
    tag: `follow-${actor._id}`,
    data: {
      type: "follow",
      actorId: actor._id,
      actionUrl: `/profile/${actor.username}`,
    },
  }),
};

module.exports = {
  initPushNotification,
  sendPushNotification,
  sendBulkPushNotifications,
  registerPushToken,
  unregisterPushToken,
  notificationTemplates,
};
