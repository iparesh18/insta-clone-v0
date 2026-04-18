/**
 * public/service-worker.js
 *
 * Service Worker for Web Push Notifications
 * Registers service worker and handles incoming push notifications
 */

const CACHE_NAME = "instagram-clone-v1";

// Handle installation
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  self.skipWaiting();
});

// Handle activation
self.addEventListener("activate", (event) => {
  console.log("Service Worker activated");
  self.clients.claim();
});

// Handle push notifications
self.addEventListener("push", (event) => {
  let notificationData = {
    title: "Instagram Clone",
    body: "You have a new notification",
    icon: "/logo.png",
    badge: "/badge.png",
    tag: "notification",
  };

  // Parse the push notification data
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
    })
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Handle navigation based on notification type
  const data = event.notification.data || {};
  let urlToOpen = "/";

  if (data.actionUrl) {
    urlToOpen = data.actionUrl;
  }

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if window is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // Open new window if not already open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener("notificationclose", (event) => {
  console.log("Notification closed:", event.notification.tag);
});

// Handle background sync (for offline notifications)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-notifications") {
    event.waitUntil(syncNotifications());
  }
});

// Sync notifications with server
async function syncNotifications() {
  try {
    const response = await fetch("/api/v1/notifications");
    if (response.ok) {
      console.log("Notifications synced");
    }
  } catch (error) {
    console.error("Sync failed:", error);
  }
}
