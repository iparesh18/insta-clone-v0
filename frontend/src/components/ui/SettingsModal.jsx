/**
 * components/ui/SettingsModal.jsx
 * Instagram-style settings modal with user info and delete account
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, Trash2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import useNotificationStore from "@/store/notificationStore";
import { userAPI } from "@/api/services";
import Avatar from "./Avatar";

export default function SettingsModal({ isOpen, onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const showError = useNotificationStore((s) => s.showError);
  const showSuccess = useNotificationStore((s) => s.showSuccess);

  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
      navigate("/login");
    } catch (err) {
      showError("Logout failed");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await userAPI.deleteAccount();
      
      // Clear auth state and redirect
      await logout();
      showSuccess("Account deleted successfully");
      onClose();
      navigate("/login");
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to delete account");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-ig-border">
                <h2 className="text-lg font-bold">Settings</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-ig-hover rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[70vh] overflow-y-auto">
                {/* User Info Section */}
                <div className="p-6 border-b border-ig-border">
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={user?.profilePicture?.url}
                      alt={user?.username}
                      size="lg"
                    />
                    <div>
                      <p className="font-bold text-sm">{user?.username}</p>
                      <p className="text-ig-gray text-sm">{user?.fullName}</p>
                      <p className="text-ig-gray text-xs">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Profile Info */}
                <div className="p-6 border-b border-ig-border space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Full Name</span>
                    <span className="text-sm font-semibold text-ig-gray">
                      {user?.fullName || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bio</span>
                    <span className="text-sm font-semibold text-ig-gray max-w-[150px] text-right line-clamp-2">
                      {user?.bio || "No bio"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Website</span>
                    <span className="text-sm font-semibold text-ig-gray">
                      {user?.website || "None"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Account Status</span>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        user?.isPrivate
                          ? "bg-red-50 text-red-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {user?.isPrivate ? "Private" : "Public"}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="p-6 border-b border-ig-border grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="font-bold text-lg">{user?.postCount || 0}</p>
                    <p className="text-xs text-ig-gray">Posts</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg">{user?.followerCount || 0}</p>
                    <p className="text-xs text-ig-gray">Followers</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg">{user?.followingCount || 0}</p>
                    <p className="text-xs text-ig-gray">Following</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-6 space-y-3">
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3
                               bg-blue-500 hover:bg-blue-600 disabled:opacity-50
                               text-white font-semibold rounded-lg transition-colors"
                  >
                    <LogOut size={18} />
                    Log Out
                  </button>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3
                                 border-2 border-red-500 hover:bg-red-50
                                 text-red-600 font-semibold rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                      Delete Account
                    </button>
                  ) : (
                    // Confirmation state
                    <div className="space-y-3 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-sm text-red-900">
                            Delete Account?
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            This action is permanent. All your posts, reels, messages,
                            and profile data will be deleted from our servers and
                            ImageKit. This cannot be undone.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={loading}
                          className="flex-1 px-3 py-2 bg-white border border-red-300
                                     text-red-600 font-semibold rounded-lg
                                     hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={loading}
                          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700
                                     text-white font-semibold rounded-lg
                                     transition-colors disabled:opacity-50"
                        >
                          {loading ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
