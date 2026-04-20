/**
 * pages/SharedFeedPage.jsx
 * View posts and reels that were shared with the current user
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { shareAPI } from "@/api/services";
import PostCard from "@/components/post/PostCard";
import ReelItem from "@/components/reel/ReelItem";
import PostCardSkeleton from "@/components/post/PostCardSkeleton";

export default function SharedFeedPage() {
  const [activeTab, setActiveTab] = useState("posts"); // "posts" or "reels"
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const isFetchingRef = useRef(false);
  const fetchDebounceRef = useRef(null);
  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 });

  const fetchSharedContent = useCallback(async (currentCursor) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      const endpoint = activeTab === "posts" ? shareAPI.getSharedPosts : shareAPI.getSharedReels;
      const { data } = await endpoint(currentCursor || undefined);
      const newItems = activeTab === "posts" ? data.data.posts || [] : data.data.reels || [];

      setItems((prev) => (currentCursor ? [...prev, ...newItems] : newItems));
      setCursor(data.pagination.nextCursor);
      setHasMore(data.pagination.hasMore);
    } catch (err) {
      console.error("Failed to load shared content:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
      setInitialLoad(false);
      isFetchingRef.current = false;
    }
  }, [activeTab]);

  // Initial load
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setInitialLoad(true);
    fetchSharedContent(null);
  }, [activeTab]);

  // Infinite scroll
  useEffect(() => {
    if (inView && !initialLoad && hasMore && !loading) {
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      fetchDebounceRef.current = setTimeout(() => {
        fetchSharedContent(cursor);
      }, 300);
    }

    return () => {
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    };
  }, [inView, initialLoad, hasMore, loading, cursor, fetchSharedContent]);

  return (
    <div className="flex justify-center gap-8 py-8 px-4">
      <div className="w-full max-w-[470px]">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-ig-border">
          <button
            onClick={() => setActiveTab("posts")}
            className={`pb-3 text-sm font-semibold transition ${
              activeTab === "posts"
                ? "border-b-2 border-ig-blue text-ig-blue"
                : "text-ig-gray hover:text-ig-dark"
            }`}
          >
            Shared Posts
          </button>
          <button
            onClick={() => setActiveTab("reels")}
            className={`pb-3 text-sm font-semibold transition ${
              activeTab === "reels"
                ? "border-b-2 border-ig-blue text-ig-blue"
                : "text-ig-gray hover:text-ig-dark"
            }`}
          >
            Shared Reels
          </button>
        </div>

        {/* Content */}
        <div className="space-y-0">
          {initialLoad
            ? Array(3)
                .fill(0)
                .map((_, i) => <PostCardSkeleton key={i} />)
            : activeTab === "posts"
              ? items.map((post) => (
                  <div key={post._id}>
                    {/* Shared by info */}
                    <div className="px-4 py-2 bg-ig-hover border-b border-ig-border text-xs text-ig-gray">
                      Shared by{" "}
                      <span className="font-semibold text-ig-dark">
                        @{post.sharedBy?.username}
                      </span>
                      {post.shareMessage && (
                        <div className="mt-1 text-sm italic text-ig-dark">
                          "{post.shareMessage}"
                        </div>
                      )}
                    </div>
                    <PostCard
                      post={post}
                      onDelete={(id) => setItems((prev) => prev.filter((p) => p._id !== id))}
                    />
                  </div>
                ))
              : items.map((reel) => (
                  <div key={reel._id} className="mb-4">
                    {/* Shared by info */}
                    <div className="px-4 py-2 bg-ig-hover border-b border-ig-border text-xs text-ig-gray rounded-t-lg">
                      Shared by{" "}
                      <span className="font-semibold text-ig-dark">
                        @{reel.sharedBy?.username}
                      </span>
                      {reel.shareMessage && (
                        <div className="mt-1 text-sm italic text-ig-dark">
                          "{reel.shareMessage}"
                        </div>
                      )}
                    </div>
                    <ReelItem reel={reel} />
                  </div>
                ))}
        </div>

        {/* Infinite scroll sentinel */}
        {!initialLoad && (
          <div ref={sentinelRef} className="py-6 flex justify-center">
            {loading && hasMore && (
              <div className="w-7 h-7 border-2 border-ig-border border-t-ig-gray rounded-full animate-spin" />
            )}
          </div>
        )}

        {!hasMore && !initialLoad && items.length > 0 && (
          <p className="text-center text-sm text-ig-gray py-8 select-none">
            No more shared {activeTab} ✨
          </p>
        )}

        {!hasMore && !initialLoad && items.length === 0 && (
          <div className="text-center py-20">
            <p className="font-semibold text-lg">No shared {activeTab}</p>
            <p className="text-sm text-ig-gray mt-2">
              When people share {activeTab} with you, they'll appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
