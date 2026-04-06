import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Send, Trash2 } from "lucide-react";
import { reelAPI } from "@/api/services";
import Avatar from "@/components/ui/Avatar";
import useAuthStore from "@/store/authStore";
import toast from "react-hot-toast";

export default function ReelCommentSheet({ reelId, onClose, onCommentCountChange, commentCount = 0 }) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchComments = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const { data } = await reelAPI.getComments(reelId, cursor);
      const newComments = data.data.comments || [];
      setComments((prev) => (cursor ? [...prev, ...newComments] : newComments));
      setCursor(data.pagination?.nextCursor);
      setHasMore(data.pagination?.hasMore ?? false);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [reelId, cursor, loading, hasMore]);

  useEffect(() => {
    fetchComments();
  }, []);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { data } = await reelAPI.addComment(reelId, newComment);
      setComments((prev) => [data.data.comment, ...prev]);
      setNewComment("");
      toast.success("Comment added");
      // Update comment count in parent
      onCommentCountChange?.(commentCount + 1);
    } catch {
      // handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await reelAPI.deleteComment(reelId, commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      toast.success("Comment deleted");
      // Update comment count in parent
      onCommentCountChange?.(Math.max(0, commentCount - 1));
    } catch {
      // handled by interceptor
    }
  };

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl max-h-[60vh] flex flex-col overflow-hidden"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <div>
            <h3 className="font-bold text-lg text-black dark:text-white">Comments</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition"
          >
            <X size={24} className="text-black dark:text-white" />
          </button>
        </div>

        {/* Comments List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <p className="text-sm">No comments yet. Be the first!</p>
            </div>
          ) : (
            <>
              {comments.map((comment) => (
                <div key={comment._id} className="flex gap-3 pb-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                  <Avatar
                    src={comment.author.profilePicture?.url}
                    alt={comment.author.username}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="font-semibold text-sm text-black dark:text-white">
                        {comment.author.username}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-words">
                      {comment.text}
                    </p>
                  </div>
                  {(user?._id === comment.author._id || user?._id === reelId) && (
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      className="text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-500 p-1 flex-shrink-0 transition"
                      title="Delete comment"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={fetchComments}
                  disabled={loading}
                  className="w-full py-3 text-blue-500 dark:text-blue-400 text-sm font-semibold hover:text-blue-600 disabled:opacity-50 transition"
                >
                  {loading ? "Loading..." : "Load more comments"}
                </button>
              )}
            </>
          )}
        </div>

        {/* Input Section - Fixed at bottom */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-900">
          <form onSubmit={handleAddComment} className="flex items-center gap-3">
            <Avatar
              src={user?.profilePicture?.url}
              alt={user?.username}
              size="sm"
            />
            <div className="flex-1 flex items-center bg-gray-100 dark:bg-zinc-800 rounded-full px-4 py-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={500}
                className="flex-1 bg-transparent text-sm text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="text-blue-500 dark:text-blue-400 font-bold p-2 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
              title="Send comment"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </motion.div>
    </>
  );
}
