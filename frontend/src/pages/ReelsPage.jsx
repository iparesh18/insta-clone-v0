/**
 * pages/ReelsPage.jsx
 *
 * Full-screen vertical reel feed with:
 *  • CSS scroll-snap for swipe navigation
 *  • IntersectionObserver for autoplay/pause
 *  • Cursor-based infinite scroll
 *  • View registration via BullMQ (async API call)
 *  • Like toggle with optimistic UI
 *  • Framer Motion entrance animations
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import ReelItem from "@/components/reel/ReelItem";
import CreateReelModal from "@/components/reel/CreateReelModal";
import { reelAPI } from "@/api/services";
import useReelsStore from "@/store/reelsStore";

export default function ReelsPage() {
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showCreateReel, setShowCreateReel] = useState(false);
  
  const { reels, setReels, addReel } = useReelsStore();

  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 });

  const fetchReels = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      console.log("📥 Fetching reels, cursor:", cursor);
      const { data } = await reelAPI.getFeed(cursor);
      console.log("📊 Reels fetch response:", data);
      const newReels = data.data.reels || data.data || [];
      console.log("   Got", newReels.length, "reels");
      
      setReels(cursor ? [...reels, ...newReels] : newReels);
      setCursor(data.pagination?.nextCursor);
      setHasMore(data.pagination?.hasMore ?? false);
    } catch (err) {
      console.error("❌ Reels fetch error:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, hasMore, reels, setReels]);

  useEffect(() => {
    if (reels.length === 0) {
      fetchReels();
    }
  }, []);

  useEffect(() => {
    if (inView) fetchReels();
  }, [inView]);

  const handleReelCreated = (reel) => {
    console.log("🎥 handleReelCreated called with reel:", reel);
    if (!reel?._id) {
      console.warn("⚠️ Reel has no _id, skipping");
      return;
    }
    
    addReel({ ...reel, isLiked: false });
    console.log("✅ Reel added to store");
  };

  if (!loading && reels.length === 0) {
    console.warn("⚠️ ReelsPage: showing empty state - loading:", loading, "reels.length:", reels.length);
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-ig-gray">No reels yet. Be the first to upload!</p>
      </div>
    );
  }

  console.log("✅ ReelsPage: rendering", reels.length, "reels");
  
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      {/* Desktop side blur backgrounds */}
      <div className="hidden lg:flex absolute inset-0 pointer-events-none">
        <div className="flex-1 bg-gradient-to-r from-black to-black/50" />
        <div className="flex-1 bg-gradient-to-l from-black to-black/50" />
      </div>

      {/* Mobile/Centered Reel Container */}
      <div className="relative w-full lg:max-w-[450px] h-screen overflow-hidden">
        {/* Reel scroll snap container */}
        <div className="reel-container w-full h-full relative">
          {[...reels].reverse().map((reel, index) => (
            <ReelItem
              key={reel._id}
              reel={reel}
            />
          ))}

          {/* Infinite scroll trigger */}
          {hasMore && (
            <div ref={sentinelRef} className="reel-item flex items-center justify-center bg-black">
              {loading && (
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}
        </div>

        {/* Create Reel Button */}
        <button
          className="absolute top-5 right-5 z-40 bg-white/90 hover:bg-white text-black text-sm font-semibold px-4 py-2 rounded-full transition-all"
          onClick={() => setShowCreateReel(true)}
        >
          Create Reel
        </button>
      </div>

      {showCreateReel && (
        <CreateReelModal
          onClose={() => setShowCreateReel(false)}
          onCreated={handleReelCreated}
        />
      )}
    </div>
  );
}
