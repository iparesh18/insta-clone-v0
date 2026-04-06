/**
 * components/post/PostCard.jsx
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Trash2 } from "lucide-react";
import { postAPI } from "@/api/services";
import Avatar from "@/components/ui/Avatar";
import PostDetailModal from "@/components/post/PostDetailModal";
import useAuthStore from "@/store/authStore";
import usePostsStore from "@/store/postsStore";
import { formatDistanceToNow } from "@/utils/date";

export default function PostCard({ post, onDelete }) {
  const { user } = useAuthStore();
  const { savedPosts, togglePostSave } = usePostsStore();
  const [liked, setLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [likesOpen, setLikesOpen] = useState(false);
  const [likedUsers, setLikedUsers] = useState([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(0);
  const [showPostDetail, setShowPostDetail] = useState(false);
  
  const saved = savedPosts.has(post._id);
  
  const handleSaveToggle = async () => {
    await togglePostSave(post._id);
  };


  const isOwn = String(user?._id) === String(post.author?._id);

  const handleLike = async () => {
    const wasLiked = liked;
    const optimisticCount = wasLiked ? Math.max(0, likeCount - 1) : likeCount + 1;
    setLiked(!wasLiked);
    setLikeCount(optimisticCount);
    try {
      const { data } = await postAPI.toggleLike(post._id);
      setLiked(!!data.data?.liked);
      setLikeCount(
        typeof data.data?.likeCount === "number" ? data.data.likeCount : optimisticCount
      );
    } catch {
      setLiked(wasLiked);
      setLikeCount(likeCount);
    }
  };

  const handleDelete = async () => {
    if (!isOwn) return;
    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) return;

    try {
      await postAPI.delete(post._id);
      onDelete?.(post._id);
    } catch {
      // handled by interceptor
    }
  };

  const handleDoubleTap = () => {
    if (!liked) {
      handleLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
  };

  const openLikes = async () => {
    if (likeCount <= 0) return;
    setLikesOpen(true);
    setLikesLoading(true);
    try {
      const { data } = await postAPI.getLikes(post._id);
      setLikedUsers(data.data.users || []);
    } catch {
      setLikedUsers([]);
    } finally {
      setLikesLoading(false);
    }
  };

  const media = post.media?.[currentMedia];
  const isVideo = media?.type === "video";

  return (
    <article className="border-b border-ig-border bg-white mb-1">
      <div className="flex items-center justify-between px-4 py-3">
        <Link to={`/${post.author.username}`} className="flex items-center gap-3">
          <Avatar src={post.author.profilePicture?.url} alt={post.author.username} size="sm" ring />
          <div>
            <p className="text-sm font-semibold leading-none">{post.author.username}</p>
            {post.location && <p className="text-xs text-ig-gray mt-0.5">{post.location}</p>}
          </div>
        </Link>
        <button className="text-ig-dark p-1" onClick={isOwn ? handleDelete : undefined}>
          {isOwn ? <Trash2 size={20} /> : <MoreHorizontal size={20} />}
        </button>
      </div>

      <div className="relative bg-black aspect-square overflow-hidden" onDoubleClick={handleDoubleTap}>
        {isVideo ? (
          <video src={media?.url} className="w-full h-full object-cover" controls playsInline preload="metadata" />
        ) : (
          <img src={media?.url} alt="Post" className="w-full h-full object-cover" loading="lazy" />
        )}

        {post.media.length > 1 && (
          <>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {post.media.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentMedia(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentMedia ? "bg-ig-blue" : "bg-white/60"}`}
                />
              ))}
            </div>
            {currentMedia > 0 && (
              <button
                onClick={() => setCurrentMedia((c) => c - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-8 h-8 flex items-center justify-center text-sm"
              >
                {"<"}
              </button>
            )}
            {currentMedia < post.media.length - 1 && (
              <button
                onClick={() => setCurrentMedia((c) => c + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-8 h-8 flex items-center justify-center text-sm"
              >
                {">"}
              </button>
            )}
          </>
        )}

        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.3, opacity: 1 }}
              exit={{ scale: 1.7, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-24 h-24 fill-white text-white drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-3">
            <motion.button whileTap={{ scale: 1.2 }} onClick={handleLike}>
              <Heart size={24} className={liked ? "fill-red-500 text-red-500" : "text-ig-dark"} />
            </motion.button>
            <button onClick={() => setShowPostDetail(true)}>
              <MessageCircle size={24} className="text-ig-dark" />
            </button>
            <button>
              <Send size={24} className="text-ig-dark" />
            </button>
          </div>
          <motion.button whileTap={{ scale: 1.2 }} onClick={handleSaveToggle}>
            <Bookmark size={24} className={saved ? "fill-ig-dark text-ig-dark" : "text-ig-dark"} />
          </motion.button>
        </div>

        {likeCount > 0 && (
          <button onClick={openLikes} className="text-sm font-semibold mb-1 hover:opacity-70">
            {likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}
          </button>
        )}

        {post.caption && (
          <p className="text-sm mb-1">
            <Link to={`/${post.author.username}`} className="font-semibold mr-1">
              {post.author.username}
            </Link>
            {post.caption}
          </p>
        )}

        <button
          className="text-sm text-ig-gray"
          onClick={() => setShowPostDetail(true)}
        >
          {post.commentCount > 0 ? `View all ${post.commentCount} comments` : "Add a comment"}
        </button>

        <p className="text-xs text-ig-gray mt-1 uppercase tracking-wide">{formatDistanceToNow(post.createdAt)}</p>
      </div>

      {likesOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setLikesOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-ig-border flex items-center justify-between">
              <h3 className="font-semibold">Likes</h3>
              <button className="text-sm text-ig-gray" onClick={() => setLikesOpen(false)}>Close</button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              {likesLoading ? (
                <div className="p-6 text-center text-sm text-ig-gray">Loading...</div>
              ) : likedUsers.length === 0 ? (
                <div className="p-6 text-center text-sm text-ig-gray">No likes yet.</div>
              ) : (
                likedUsers.map((u) => (
                  <Link key={u._id} to={`/${u.username}`} onClick={() => setLikesOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-ig-hover">
                    <Avatar src={u.profilePicture?.url} alt={u.username} size="sm" />
                    <p className="text-sm font-semibold">{u.username}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showPostDetail && (
        <PostDetailModal postId={post._id} onClose={() => setShowPostDetail(false)} />
      )}
    </article>
  );
}
