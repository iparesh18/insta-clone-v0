import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactPlayer from "react-player/lazy";
import { Heart, MessageCircle, Bookmark, X, VolumeX, Volume2, MoreVertical, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import Avatar from "@/components/ui/Avatar";
import ReelCommentSheet from "./ReelCommentSheet";
import useAuthStore from "@/store/authStore";
import useReelsStore from "@/store/reelsStore";
import { reelAPI } from "@/api/services";
import toast from "react-hot-toast";

const formatCount = (n) => {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
};

export default function ReelModal({ reel, onClose }) {
  const { user } = useAuthStore();
  const { toggleReelLike, toggleReelSave, savedReels, updateCommentCount } = useReelsStore();

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [liked, setLiked] = useState(reel?.isLiked || false);
  const [likeCount, setLikeCount] = useState(reel?.likeCount || 0);
  const [commentCount, setCommentCount] = useState(reel?.commentCount || 0);
  const [isSaved, setIsSaved] = useState(savedReels.has(reel?._id));
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const playerRef = useRef(null);
  const isOwn = user?._id === reel?.author?._id;

  useEffect(() => {
    setLiked(reel?.isLiked || false);
    setLikeCount(reel?.likeCount || 0);
    setCommentCount(reel?.commentCount || 0);
    setIsSaved(savedReels.has(reel?._id));
  }, [reel, savedReels]);

  // Sync muted state with player
  useEffect(() => {
    const player = playerRef.current;
    if (player?.getInternalPlayer) {
      const videoElement = player.getInternalPlayer("html5");
      if (videoElement) {
        videoElement.muted = muted;
      }
    }
  }, [muted]);

  if (!reel) return null;

  const handleLike = async () => {
    setLiked(!liked);
    setLikeCount(liked ? Math.max(0, likeCount - 1) : likeCount + 1);
    await toggleReelLike(reel._id);
  };

  const handleSave = async () => {
    setIsSaved(!isSaved);
    await toggleReelSave(reel._id);
  };

  const handleDoubleTap = async () => {
    if (!liked) {
      setLiked(true);
      setLikeCount(likeCount + 1);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
      await toggleReelLike(reel._id);
    }
  };

  const handleCommentCountChange = (newCount) => {
    setCommentCount(newCount);
    updateCommentCount(reel._id, newCount);
  };

  const handleDeleteReel = async () => {
    setDeleting(true);
    try {
      await reelAPI.delete(reel._id);
      deleteReel(reel._id); // Remove from Zustand store
      toast.success("Reel deleted successfully");
      onClose();
    } catch (err) {
      console.error("Failed to delete reel:", err);
      toast.error(err?.response?.data?.message || "Failed to delete reel");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-black rounded-2xl overflow-hidden shadow-2xl max-w-[420px] w-full flex flex-col h-[90vh] pointer-events-auto">
          {/* Menu Button */}
          {isOwn && (
            <div className="absolute top-3 left-3 z-10">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="bg-black/40 rounded-full p-2 text-white hover:bg-black/60 transition"
              >
                <MoreVertical size={20} />
              </button>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-12 left-0 bg-black/95 rounded-lg shadow-lg min-w-[150px] overflow-hidden z-20"
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/20 transition text-sm font-medium"
                  >
                    <Trash2 size={16} />
                    Delete Reel
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 bg-black/40 rounded-full p-2 text-white hover:bg-black/60 transition"
          >
            <X size={20} />
          </button>

          {/* Mute Button */}
          <button
            onClick={() => setMuted(!muted)}
            className="absolute bottom-20 left-3 z-10 bg-black/40 rounded-full p-2 text-white hover:bg-black/60 transition"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Video Container */}
          <div className="flex-1 relative bg-black overflow-hidden" onDoubleClick={handleDoubleTap}>
            <ReactPlayer
              ref={playerRef}
              url={reel.video?.url}
              playing={playing}
              muted={muted}
              loop
              playsinline
              width="100%"
              height="100%"
              style={{ position: "absolute", top: 0, left: 0 }}
              config={{
                file: {
                  attributes: {
                    controlsList: "nodownload",
                    style: { width: "100%", height: "100%", objectFit: "cover" },
                    crossOrigin: "anonymous",
                    preload: "metadata",
                  },
                },
              }}
            />

            {/* Double-tap heart */}
            <AnimatePresence>
              {showHeart && (
                <motion.div
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 1.4, opacity: 1 }}
                  exit={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <Heart className="w-20 h-20 fill-white text-white drop-shadow-2xl" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Author Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
              <div className="flex items-center gap-2">
                <Link to={`/${reel.author?.username}`} onClick={onClose}>
                  <Avatar
                    src={reel.author?.profilePicture?.url}
                    alt={reel.author?.username}
                    size="sm"
                  />
                </Link>
                <Link to={`/${reel.author?.username}`} onClick={onClose} className="text-white font-semibold text-sm hover:opacity-80">
                  {reel.author?.username}
                </Link>
              </div>
              {reel.caption && (
                <p className="text-white text-xs mt-1 line-clamp-2">{reel.caption}</p>
              )}
            </div>
          </div>

          {/* Actions Bar */}
          <div className="bg-black px-4 py-3 flex items-center justify-between border-t border-gray-800">
            {/* Left: Like & Comment */}
            <div className="flex items-center gap-4">
              <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Heart
                    size={24}
                    className={liked ? "fill-red-500 text-red-500" : "text-white"}
                  />
                </motion.div>
                <span className="text-white text-xs">{formatCount(likeCount)}</span>
              </button>

              <button
                onClick={() => setShowComments(true)}
                className="flex flex-col items-center gap-1 group"
              >
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <MessageCircle size={24} className="text-white" />
                </motion.div>
                <span className="text-white text-xs">{formatCount(commentCount)}</span>
              </button>
            </div>

            {/* Right: Save */}
            <button onClick={handleSave} className="flex flex-col items-center gap-1">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Bookmark
                  size={24}
                  className={isSaved ? "fill-blue-500 text-blue-500" : "text-white"}
                />
              </motion.div>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Comment Sheet */}
      {showComments && (
        <ReelCommentSheet
          reelId={reel._id}
          onClose={() => setShowComments(false)}
          onCommentCountChange={handleCommentCountChange}
          commentCount={commentCount}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="fixed inset-0 z-[60] bg-black/70"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-2">Delete Reel?</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Are you sure you want to delete this reel? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900
                                 font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteReel}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white
                                 font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
