/**
 * components/reel/ReelItem.jsx
 *
 * Instagram-style reel with full interactions
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import ReactPlayer from "react-player/lazy";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, VolumeX, Volume2, Trash2,
} from "lucide-react";
import { reelAPI } from "@/api/services";
import Avatar from "@/components/ui/Avatar";
import { Link } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import useReelsStore from "@/store/reelsStore";
import ReelCommentSheet from "./ReelCommentSheet";
import toast from "react-hot-toast";

const formatCount = (n) => {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
};

export default function ReelItem({ reel }) {
  const { user } = useAuthStore();
  const { toggleReelLike, deleteReel, updateCommentCount } = useReelsStore();
  const [playing, setPlaying] = useState(true); // Start playing immediately
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(reel.isLiked);
  const [likeCount, setLikeCount] = useState(reel.likeCount || 0);
  const [commentCount, setCommentCount] = useState(reel.commentCount || 0);
  const [viewRegistered, setViewRegistered] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const playerRef = useRef(null);
  const isOwn = user?._id === reel.author?._id;

  useEffect(() => {
    setLiked(!!reel.isLiked);
    setLikeCount(reel.likeCount || 0);
    setCommentCount(reel.commentCount || 0);
  }, [reel.isLiked, reel.likeCount, reel.commentCount]);

  const { ref: inViewRef, inView } = useInView({
    threshold: 0.5,
    triggerOnce: false,
  });

  // Autoplay/pause based on visibility (pause when out of view, play when in view)
  useEffect(() => {
    setPlaying(inView);

    if (inView && !viewRegistered) {
      setViewRegistered(true);
      reelAPI.registerView(reel._id).catch(() => {});
    }
  }, [inView]);

  // Ensure audio syncs when muted state changes
  useEffect(() => {
    const player = playerRef.current;
    if (player?.getInternalPlayer) {
      const videoElement = player.getInternalPlayer("html5");
      if (videoElement) {
        videoElement.muted = muted;
      }
    }
  }, [muted]);

  const handleLike = useCallback(async () => {
    // Optimistic update
    const wasLiked = liked;
    const newCount = wasLiked ? Math.max(0, likeCount - 1) : likeCount + 1;
    setLiked(!wasLiked);
    setLikeCount(newCount);

    try {
      await toggleReelLike(reel._id);
    } catch {
      // Revert on failure
      setLiked(wasLiked);
      setLikeCount(likeCount);
    }
  }, [liked, likeCount, reel._id, toggleReelLike]);

  // Double-tap to like
  const handleDoubleTap = useCallback(() => {
    if (!liked) {
      handleLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
  }, [liked, handleLike]);

  const handleDelete = async () => {
    try {
      await deleteReel(reel._id);
      toast.success("Reel deleted");
    } catch {
      // handled by interceptor
    }
  };

  return (
    <div
      ref={inViewRef}
      className="reel-item relative bg-black flex items-center justify-center
                 overflow-hidden"
      onDoubleClick={handleDoubleTap}
    >
      {/* ── Video player ────────────────────────────────────────────── */}
      <ReactPlayer
        ref={playerRef}
        url={reel.video.url}
        playing={playing}
        muted={muted}
        loop
        playsinline
        width="100%"
        height="100%"
        style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        onError={(e) => console.error("ReactPlayer error:", e)}
        progressInterval={1000}
        playbackRate={1}
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

      {/* ── Double-tap heart animation ──────────────────────────────── */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.4, opacity: 1 }}
            exit={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <Heart className="w-28 h-28 fill-white text-white drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mute button ─────────────────────────────────────────────── */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setMuted((m) => !m)}
        className="absolute bottom-24 left-4 z-10 bg-black/40 rounded-full p-3 text-white backdrop-blur-sm hover:bg-black/60 transition group"
        title={muted ? "Tap to unmute" : "Tap to mute"}
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        {/* Indicator when muted */}
        {muted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            className="absolute -bottom-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
          />
        )}
      </motion.button>

      {/* ── Bottom info overlay ─────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
        {/* Author */}
        <div className="flex items-center gap-2 mb-3">
          <Link to={`/${reel.author?.username}`}>
            <Avatar
              src={reel.author?.profilePicture?.url}
              alt={reel.author?.username}
              size="sm"
              ring
            />
          </Link>
          <div>
            <Link
              to={`/${reel.author?.username}`}
              className="text-white font-bold text-sm hover:opacity-80"
            >
              {reel.author?.username}
            </Link>
            {reel.author?.isVerified && (
              <span className="ml-1 text-xs">✓</span>
            )}
          </div>
        </div>

        {/* Caption */}
        {reel.caption && (
          <p className="text-white text-sm max-w-full line-clamp-2">
            {reel.caption}
          </p>
        )}
      </div>

      {/* ── Right-side action buttons ────────────────────────────────── */}
      <div className="absolute right-4 bottom-20 z-10 flex flex-col gap-6 items-center">
        {/* Like */}
        <motion.button
          whileTap={{ scale: 1.2 }}
          onClick={handleLike}
          className="flex flex-col items-center gap-1 relative"
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="bg-black/30 rounded-full p-3 backdrop-blur-sm"
          >
            <Heart
              size={28}
              className={`transition-colors ${
                liked ? "fill-red-500 text-red-500" : "text-white"
              }`}
            />
          </motion.div>
          <span className="text-white text-xs font-semibold">
            {formatCount(likeCount)}
          </span>
        </motion.button>

        {/* Comment */}
        <motion.button
          whileTap={{ scale: 1.2 }}
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center gap-1"
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="bg-black/30 rounded-full p-3 backdrop-blur-sm"
          >
            <MessageCircle size={28} className="text-white" />
          </motion.div>
          <span className="text-white text-xs font-semibold">
            {formatCount(commentCount)}
          </span>
        </motion.button>

        {/* Share */}
        <motion.button
          whileTap={{ scale: 1.2 }}
          onClick={() => {
            navigator.clipboard?.writeText(`${window.location.origin}/reels/${reel._id}`);
            toast.success("Link copied");
          }}
          className="flex flex-col items-center gap-1"
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="bg-black/30 rounded-full p-3 backdrop-blur-sm"
          >
            <Share2 size={28} className="text-white" />
          </motion.div>
          <span className="text-white text-xs font-semibold">Share</span>
        </motion.button>

        {/* Author mini avatar */}
        <Link to={`/${reel.author?.username}`}>
          <motion.div whileHover={{ scale: 1.1 }} className="mt-2">
            <Avatar
              src={reel.author?.profilePicture?.url}
              alt={reel.author?.username}
              size="md"
              ring
            />
          </motion.div>
        </Link>

        {/* Delete if owner */}
        {isOwn && (
          <motion.button
            whileTap={{ scale: 1.2 }}
            onClick={handleDelete}
            className="flex flex-col items-center gap-1 mt-2"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="bg-red-500/30 rounded-full p-3 backdrop-blur-sm"
            >
              <Trash2 size={28} className="text-red-400" />
            </motion.div>
          </motion.button>
        )}
      </div>

      {/* Comments Sheet */}
      <AnimatePresence>
        {showComments && (
          <ReelCommentSheet
            reelId={reel._id}
            commentCount={commentCount}
            onCommentCountChange={(newCount) => {
              setCommentCount(newCount);
              updateCommentCount(reel._id, newCount);
            }}
            onClose={() => setShowComments(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
