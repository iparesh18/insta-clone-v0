/**
 * jobs/handlers/notificationHandler.js
 * Placeholder for push/in-app notification delivery.
 * Extend with Firebase FCM, APNs, or WebPush as needed.
 */

const logger = require("../../utils/logger");

const processNotification = async (job) => {
  const { type, recipientId, actorId, targetId, targetType } = job.data;

  // TODO: integrate with your push notification provider
  logger.info(
    `[notificationHandler] ${type} | recipient: ${recipientId} | actor: ${actorId} | target: ${targetId}(${targetType})`
  );
};

module.exports = { processNotification };
