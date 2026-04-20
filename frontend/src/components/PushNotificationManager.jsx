/**
 * components/PushNotificationManager.jsx
 *
 * Auto-initializes push notifications on app load if user is authenticated
 * Silently subscribes in background without user interaction (unless permission needed)
 */

import { useEffect, useRef } from "react";
import { usePushNotification } from "@/hooks/usePushNotification";
import useAuthStore from "@/store/authStore";

export default function PushNotificationManager() {
  const { isAuthenticated } = useAuthStore();
  const { isSupported, isSubscribed, subscribe } = usePushNotification();
  const hasAttemptedRef = useRef(false);

  // Auto-subscribe on app load if authenticated and supported
  useEffect(() => {
    if (!isAuthenticated || !isSupported || isSubscribed || hasAttemptedRef.current) {
      return;
    }

    hasAttemptedRef.current = true;

    // Silently attempt subscription
    // If permission is needed, browser will prompt user
    const attemptSubscribe = async () => {
      try {
        // Check if VAPID key is configured
        if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
          console.warn("⚠️  VITE_VAPID_PUBLIC_KEY not configured - push notifications disabled");
          return;
        }

        // Check permission status
        const permission = Notification.permission || "default";

        // Only AutoSubscribe if permission already granted
        // Otherwise wait for user to enable manually
        if (permission === "granted") {
          console.log("🔔 Attempting to subscribe to push notifications...");
          await subscribe();
        } else if (permission === "default") {
          console.log("⏳ Push notifications available - user can enable in settings");
        }
        // If permission === "denied", don't attempt
      } catch (error) {
        console.error("Push subscription attempt failed:", error);
      }
    };

    // Small delay to avoid conflicting with other initialization
    const timer = setTimeout(attemptSubscribe, 1000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isSupported, isSubscribed, subscribe]);

  // This component doesn't render anything
  return null;
}
