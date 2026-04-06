/**
 * ShareModal.jsx - Send post/reel as chat message to user
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import api from "@/api/axios";
import useSocketStore from "@/store/socketStore";
import useAuthStore from "@/store/authStore";
import { useDebounce } from "@/hooks/useDebounce";
import toast from "react-hot-toast";

const ShareModal = ({ isOpen, contentType, contentId, onClose, onSuccess }) => {
  const { socket } = useSocketStore();
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch users (conversations or search results)
  const fetchUsers = useCallback(async () => {
    try {
      setFetching(true);
      let res;

      if (debouncedSearch.trim()) {
        // Search for users
        res = await api.get("/user/search", {
          params: { q: debouncedSearch, limit: 30 },
        });
      } else {
        // Get recent conversations
        res = await api.get("/chat/conversations");
      }

      const userData =
        res.data.data.conversations?.map((c) => ({
          ...c.otherUser,
          lastMessage: c.lastMessage,
          timestamp: c.timestamp,
        })) ||
        res.data.data.users ||
        [];

      setUsers(userData);
      setError("");
    } catch (err) {
      setError("Failed to load users");
      console.error(err);
    } finally {
      setFetching(false);
    }
  }, [debouncedSearch]);

  // Load users when modal opens or search term changes
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(null);
      setMessage("");
      setSearchTerm("");
      setUsers([]);
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  // Handle user selection and share
  const handleShare = async () => {
    if (!selectedUserId) {
      setError("Select a user");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (!socket || !me) {
        setError("Connection error. Please try again.");
        return;
      }

      // Send shared content via socket
      socket.emit("chat:send", {
        receiverId: selectedUserId,
        sharedContent: {
          type: contentType, // "post" or "reel"
          contentId: contentId,
          message: message.trim(),
        },
        text: "", // Empty text, as we're sharing content
      });

      setSelectedUserId(null);
      setMessage("");
      toast.success(
        `${contentType} shared successfully!`
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      setError("Failed to share. Try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter((user) =>
    `${user.username} ${user.fullName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold dark:text-white">
                  Send {contentType} to
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Search Input */}
              <input
                type="text"
                placeholder="Search or browse conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Users List */}
              <div className="px-4 py-2">
                {filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    {users.length === 0 && !fetching
                      ? "No conversations or users found"
                      : "No users match your search"}
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => setSelectedUserId(user._id)}
                      className={`flex items-center gap-3 py-3 px-2 rounded-lg cursor-pointer transition ${
                        selectedUserId === user._id
                          ? "bg-blue-50 dark:bg-blue-900/30"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {/* Radio Button */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedUserId === user._id
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {selectedUserId === user._id && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>

                      {/* Avatar */}
                      <img
                        src={user.profilePicture?.url || "/default-avatar.png"}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {user.username}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user.fullName}
                        </p>
                      </div>
                    </div>
                  ))
                )}

                {fetching && (
                  <div className="py-4 text-center">
                    <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Message Input */}
            {selectedUserId && (
              <div className="border-t dark:border-gray-800 px-6 py-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  placeholder="Add a message..."
                  maxLength={500}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="3"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {message.length}/500
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-none">
                {error}
              </div>
            )}

            {/* Footer: Share Button */}
            <div className="border-t dark:border-gray-800 px-6 py-4 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={loading || !selectedUserId}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ShareModal;
