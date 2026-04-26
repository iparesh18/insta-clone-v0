/**
 * hooks/usePushNotification.js
 *
 * Hook for managing web push notifications
 * Handles service worker registration, permission requests, and subscription management
 */

import { useEffect, useState } from "react";
import useAuthStore from "@/store/authStore";

export const usePushNotification = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuthStore();

  // Check browser support
  useEffect(() => {
    const hasWindow = typeof window !== "undefined";
    const hasNotification = hasWindow && "Notification" in window;

    const supported =
      hasWindow &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      hasNotification;

    setIsSupported(supported);
    setPermission(hasNotification ? Notification.permission : "default");

    if (supported) {
      registerServiceWorker();
      checkSubscription();
    }
  }, []);

  // Register service worker
  const registerServiceWorker = async () => {
    try {
      if (!("serviceWorker" in navigator)) {
        console.warn("Service Workers not supported");
        return;
      }

      const registration = await navigator.serviceWorker.register("/service-worker.js", {
        scope: "/",
      });

      console.log("✓ Service Worker registered", registration);
    } catch (error) {
      console.error("✗ Service Worker registration failed:", error);
      setError("Failed to register service worker");
    }
  };

  // Check if already subscribed
  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        setIsSubscribed(true);
        console.log("✓ Already subscribed to push notifications");
      }
    } catch (error) {
      console.error("✗ Failed to check subscription:", error);
    }
  };

  // Request notification permission
  const requestPermission = async () => {
    if (!isSupported || typeof Notification === "undefined") {
      setError("Push notifications are not supported in this browser");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("✗ Permission request failed:", error);
      setError("Failed to request notification permission");
      return false;
    }
  };

  // Subscribe to push notifications
  const subscribe = async () => {
    if (!isSupported) {
      setError("Push notifications are not supported");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Request permission if not already granted
      if (permission !== "granted") {
        const granted = await requestPermission();
        if (!granted) {
          setError("Notification permission denied");
          setLoading(false);
          return false;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || ""
        ),
      });

      if (!subscription) {
        setError("Failed to create push subscription");
        setLoading(false);
        return false;
      }

      // Send subscription to backend
      const response = await fetch("/api/v1/users/push-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to register push subscription with server");
      }

      setIsSubscribed(true);
      console.log("✓ Subscribed to push notifications");
      return true;
    } catch (error) {
      console.error("✗ Subscription failed:", error);
      setError(error.message || "Failed to subscribe to push notifications");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setError("Not currently subscribed");
        setLoading(false);
        return false;
      }

      // Notify backend
      await fetch("/api/v1/users/push-subscription", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      // Unsubscribe from push manager
      await subscription.unsubscribe();

      setIsSubscribed(false);
      console.log("✓ Unsubscribed from push notifications");
      return true;
    } catch (error) {
      console.error("✗ Unsubscription failed:", error);
      setError(error.message || "Failed to unsubscribe");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
  };
};

/**
 * Convert VAPID public key from base64 to Uint8Array
 * Required for push manager subscription
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
