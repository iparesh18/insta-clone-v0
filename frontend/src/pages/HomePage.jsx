/**
 * pages/HomePage.jsx - FIXED v3
 * Fixed: story fetch error handling, cursor initialisation, sentinel placement
 * Optimized: Added debouncing to infinite scroll fetches, reduced query overhead
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { postAPI, storyAPI } from "@/api/services";
import StoriesBar from "@/components/story/StoriesBar";
import PostCard from "@/components/post/PostCard";
import PostCardSkeleton from "@/components/post/PostCardSkeleton";
import SuggestedUsers from "@/components/profile/SuggestedUsers";
import usePostsStore from "@/store/postsStore";

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [storyGroups, setStoryGroups] = useState([]);
  
  const { initializeSavedPosts, addSavedPost } = usePostsStore();

  const isFetchingRef = useRef(false); // prevent double-fetch on StrictMode
  const fetchDebounceRef = useRef(null); // debounce timer for infinite scroll
  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 });

  const fetchPosts = useCallback(async (currentCursor) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const { data } = await postAPI.getFeed(currentCursor || undefined);
      const newPosts = data.data.posts || [];
      
      // Initialize saved posts from API on first fetch
      if (!currentCursor) {
        const savedPostIds = newPosts.filter(p => p.isSaved).map(p => p._id);
        initializeSavedPosts(savedPostIds);
      } else {
        // Add any newly saved posts for incremental fetches
        newPosts.forEach(p => {
          if (p.isSaved) addSavedPost(p._id);
        });
      }
      
      setPosts(prev => currentCursor ? [...prev, ...newPosts] : newPosts);
      setCursor(data.pagination.nextCursor);
      setHasMore(data.pagination.hasMore);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setInitialLoad(false);
      isFetchingRef.current = false;
    }
  }, [initializeSavedPosts, addSavedPost]);

  const fetchStories = useCallback(async () => {
    try {
      const { data } = await storyAPI.getFeed();
      setStoryGroups(data.data?.storyGroups || []);
    } catch {
      setStoryGroups([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPosts(null);
    fetchStories();
  }, []);

  // Infinite scroll with debouncing (300ms) to prevent excessive API calls
  useEffect(() => {
    if (inView && !initialLoad && hasMore && !loading) {
      // Clear any pending fetch
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
      
      // Debounce fetch to avoid multiple calls when rapidly scrolling
      fetchDebounceRef.current = setTimeout(() => {
        fetchPosts(cursor);
      }, 300);
    }
    
    return () => {
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
    };
  }, [inView, initialLoad, hasMore, loading, cursor, fetchPosts]);

  return (
    <div className="flex justify-center gap-8 py-8 px-4">
      {/* ── Feed column ──────────────────────────────────────────────── */}
      <div className="w-full max-w-[470px]">

        <StoriesBar storyGroups={storyGroups} onStoryCreated={fetchStories} />

        <div className="space-y-0 mt-2">
          {initialLoad
            ? Array(3).fill(0).map((_, i) => <PostCardSkeleton key={i} />)
            : posts.map(post => (
                <PostCard
                  key={post._id}
                  post={post}
                  onDelete={id => setPosts(prev => prev.filter(p => p._id !== id))}
                />
              ))
          }
        </div>

        {/* Infinite scroll sentinel */}
        {!initialLoad && (
          <div ref={sentinelRef} className="py-6 flex justify-center">
            {loading && hasMore && (
              <div className="w-7 h-7 border-2 border-ig-border border-t-ig-gray
                              rounded-full animate-spin" />
            )}
          </div>
        )}

        {!hasMore && !initialLoad && posts.length > 0 && (
          <p className="text-center text-sm text-ig-gray py-8 select-none">
            You're all caught up ✨
          </p>
        )}

        {!hasMore && !initialLoad && posts.length === 0 && (
          <div className="text-center py-20">
            <p className="font-semibold text-lg">Your feed is empty</p>
            <p className="text-sm text-ig-gray mt-2">
              Follow people to see their photos and videos here.
            </p>
          </div>
        )}
      </div>

      {/* ── Right sidebar ─────────────────────────────────────────── */}
      <div className="hidden lg:block w-72 flex-shrink-0 pt-2">
        <SuggestedUsers />
      </div>
    </div>
  );
}
