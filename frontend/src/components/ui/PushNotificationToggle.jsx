/**
 * components/ui/PushNotificationToggle.jsx
 *
 * UI component for users to enable/disable push notifications
 * Can be placed in settings or notification preferences
 */

import { useState, useEffect } from "react";
import { usePushNotification } from "@/hooks/usePushNotification";
import toast from "react-hot-toast";

export default function PushNotificationToggle() {
  const { isSupported, isSubscribed, loading, error, subscribe, unsubscribe, requestPermission } = 
    usePushNotification();
  const [permission, setPermission] = useState(Notification.permission);

  // Update permission state
  useEffect(() => {
    setPermission(Notification.permission);
  }, []);

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
        <div>
          <h3 className="font-semibold">Push Notifications</h3>
          <p className="text-sm text-gray-600">Not supported in your browser</p>
        </div>
      </div>
    );
  }

  const handleToggle = async () => {
    if (loading) return;

    if (isSubscribed) {
      // Unsubscribe
      const success = await unsubscribe();
      if (success) {
        toast.success("Notifications disabled");
      } else {
        toast.error(error || "Failed to disable notifications");
      }
    } else {
      // Subscribe
      let hasPermission = permission === "granted";

      // Request permission if needed
      if (!hasPermission) {
        hasPermission = await requestPermission();
        if (hasPermission) {
          setPermission("granted");
        } else {
          toast.error("Please allow notifications in browser settings");
          return;
        }
      }

      const success = await subscribe();
      if (success) {
        toast.success("Notifications enabled! 🎉");
      } else {
        toast.error(error || "Failed to enable notifications");
      }
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">Push Notifications</h3>
        <p className="text-sm text-gray-600 mt-1">
          {isSubscribed
            ? "✓ You'll receive notifications even when app is closed"
            : "Get notified about likes, comments, and mentions"}
        </p>
      </div>

      <button
        onClick={handleToggle}
        disabled={loading}
        className={`ml-4 px-4 py-2 rounded-full font-semibold transition whitespace-nowrap
          ${
            isSubscribed
              ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
              : "bg-ig-blue text-white hover:bg-ig-blue-dark"
          }
          ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {isSubscribed ? "Disabling..." : "Enabling..."}
          </span>
        ) : isSubscribed ? (
          "Disable"
        ) : (
          "Enable"
        )}
      </button>
    </div>
  );
}
