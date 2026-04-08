import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, UserPlus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useNotificationStore from "@/store/notificationStore";
import Avatar from "@/components/ui/Avatar";
import PostDetailModal from "@/components/post/PostDetailModal";

/**
 * pages/NotificationPage.jsx
 * Displays all app notifications (likes, comments, follows, posts)
 */

export default function NotificationPage() {
  const navigate = useNavigate();
  const {
    appNotifications,
    appUnreadCount,
    notificationsLoading,
    fetchAppNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteAppNotification,
  } = useNotificationStore();

  const [pagination, setPagination] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);

  useEffect(() => {
    // Fetch notifications on mount
    fetchAppNotifications().then((pag) => setPagination(pag));
  }, [fetchAppNotifications]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return <Heart size={18} className="text-red-500 fill-red-500" />;
      case "comment":
        return <MessageCircle size={18} className="text-blue-500" />;
      case "follow":
        return <UserPlus size={18} className="text-green-500" />;
      default:
        return null;
    }
  };

  const getNotificationMessage = (notification) => {
    const { actor, type, referenceType } = notification;
    const actorName = actor?.username || "Someone";
    
    switch (type) {
      case "like":
        return `${actorName} liked your ${referenceType.toLowerCase()}`;
      case "comment":
        return `${actorName} commented on your ${referenceType.toLowerCase()}`;
      case "follow":
        return `${actorName} followed you`;
      case "post":
        return `${actorName} posted something new`;
      default:
        return notification.message || "New notification";
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markNotificationAsRead(notification._id);
    }
    
    // Handle based on notification type
    if (notification.type === "follow") {
      navigate(`/${notification.actor.username}`);
    } else if (notification.referenceType === "Post") {
      // Open post modal instead of navigating
      setSelectedPostId(notification.referenceId);
    } else if (notification.referenceType === "Reel") {
      navigate(`/reels`);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="lg:hidden">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        {appUnreadCount > 0 && (
          <button
            onClick={markAllNotificationsAsRead}
            className="text-sm text-blue-500 hover:text-blue-600 font-semibold"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      {notificationsLoading && !appNotifications.length ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        </div>
      ) : appNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Heart size={48} className="mb-4 opacity-30" />
          <p className="text-lg">No notifications yet</p>
          <p className="text-sm">When someone likes or comments on your posts, you'll see it here</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {appNotifications.map((notification) => (
            <motion.div
              key={notification._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`p-4 cursor-pointer transition-colors ${
                !notification.isRead ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex gap-3 items-start">
                {/* Avatar */}
                <Avatar
                  src={notification.actor?.profilePicture?.url}
                  alt={notification.actor?.username}
                  size="md"
                  className="mt-1"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">
                      {notification.actor?.username}
                    </span>
                    {" "}
                    {getNotificationMessage(notification)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Icon and Actions */}
                <div className="flex items-center gap-3">
                  {getNotificationIcon(notification.type)}
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAppNotification(notification._id);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                  >
                    ×
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {pagination?.hasMore && (
        <div className="p-4 text-center">
          <button
            onClick={() =>
              fetchAppNotifications(20, appNotifications.length).then((pag) =>
                setPagination(pag)
              )
            }
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg
                       font-semibold transition-colors"
          >
            Load more
          </button>
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPostId && (
        <PostDetailModal
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </div>
  );
}
