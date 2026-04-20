/**
 * components/search/SearchBar.jsx
 * Global search with debouncing and local storage
 */

import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { searchAPI } from "@/api/services";
import { Search, X } from "lucide-react";
import ReelModal from "@/components/reel/ReelModal";
import PostDetailModal from "@/components/post/PostDetailModal";

export default function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [selectedReel, setSelectedReel] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recentSearches");
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Debounced search
  const searchDebounced = useCallback(
    (() => {
      let timeout;
      return (q) => {
        clearTimeout(timeout);
        if (!q.trim()) {
          setResults(null);
          return;
        }
        setLoading(true);
        timeout = setTimeout(async () => {
          try {
            const res = await searchAPI.global(q);
            setResults(res.data.data);
          } catch (err) {
            console.error("Search error:", err);
          } finally {
            setLoading(false);
          }
        }, 300); // 300ms debounce
      };
    })(),
    []
  );

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    searchDebounced(value);
    setIsOpen(true);
  };

  const handleSaveSearch = (q) => {
    setQuery(q);
    setIsOpen(false);

    // Save to recent searches
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));

    searchDebounced(q);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleClear = () => {
    setQuery("");
    setResults(null);
    setIsOpen(false);
  };

  const handleClickUser = (username) => {
    navigate(`/${username}`);
    handleClear();
  };

  const handleClickPost = (postId) => {
    setSelectedPostId(postId);
    handleClear();
  };

  const handleClickReel = (reel) => {
    setSelectedReel(reel);
    handleClear();
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative bg-ig-hover rounded-full px-4 py-2 flex items-center gap-2">
        <Search size={18} className="text-ig-gray" />
        <input
          type="text"
          placeholder="Search Instagram..."
          value={query}
          onChange={handleSearch}
          onFocus={() => setIsOpen(true)}
          className="bg-transparent outline-none flex-1 text-sm placeholder-ig-gray text-ig-dark"
        />
        {query && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-ig-border rounded-full"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-ig-border max-h-96 overflow-y-auto z-50 text-ig-dark">
          {loading && (
            <div className="p-4 text-center text-ig-gray">Searching...</div>
          )}

          {!loading && results && (
            <>
              {/* Users Section */}
              {results.users?.length > 0 && (
                <div className="border-b border-ig-border">
                  <div className="px-4 py-2 text-xs font-semibold text-ig-gray uppercase">
                    Users
                  </div>
                  {results.users.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => handleClickUser(user.username)}
                      className="w-full text-left px-4 py-2 hover:bg-ig-hover flex items-center gap-2"
                    >
                      <img
                        src={user.profilePicture}
                        alt={user.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-semibold">{user.username}</p>
                        <p className="text-xs text-ig-gray">{user.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Posts Section */}
              {results.posts?.length > 0 && (
                <div className="border-b border-ig-border">
                  <div className="px-4 py-2 text-xs font-semibold text-ig-gray uppercase">
                    Posts
                  </div>
                  {results.posts.map((post) => (
                    <button
                      key={post._id}
                      onClick={() => handleClickPost(post._id)}
                      className="w-full text-left px-4 py-2 hover:bg-ig-hover flex items-center gap-2"
                    >
                      <img
                        src={post.media?.[0]?.url}
                        alt="post"
                        className="w-10 h-10 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{post.caption}</p>
                        <p className="text-xs text-ig-gray">
                          @{post.author?.username}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Reels Section */}
              {results.reels?.length > 0 && (
                <div className="border-b border-ig-border">
                  <div className="px-4 py-2 text-xs font-semibold text-ig-gray uppercase">
                    Reels
                  </div>
                  {results.reels.map((reel) => (
                    <button
                      key={reel._id}
                      onClick={() => handleClickReel(reel)}
                      className="w-full text-left px-4 py-2 hover:bg-ig-hover flex items-center gap-2"
                    >
                      <img
                        src={reel.video?.thumbnailUrl}
                        alt="reel"
                        className="w-10 h-10 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{reel.caption}</p>
                        <p className="text-xs text-ig-gray">
                          @{reel.author?.username}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Hashtags Section */}
              {results.hashtags?.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-ig-gray uppercase">
                    Hashtags
                  </div>
                  {results.hashtags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleSaveSearch(tag)}
                      className="w-full text-left px-4 py-2 hover:bg-ig-hover"
                    >
                      <p className="text-sm font-semibold">#{tag}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* No results */}
              {!results.users?.length &&
                !results.posts?.length &&
                !results.reels?.length &&
                !results.hashtags?.length && (
                  <div className="p-4 text-center text-ig-gray">
                    No results found
                  </div>
                )}
            </>
          )}

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-ig-gray uppercase">
                Recent
              </div>
              {recentSearches.map((search) => (
                <button
                  key={search}
                  onClick={() => handleSaveSearch(search)}
                  className="w-full text-left px-4 py-2 hover:bg-ig-hover flex items-center justify-between"
                >
                  <span className="text-sm">{search}</span>
                  <X size={14} className="text-ig-gray" />
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!query &&
            recentSearches.length === 0 &&
            !loading &&
            !results && (
              <div className="p-4 text-center text-ig-gray text-sm">
                Type to search users, posts, or tags
              </div>
            )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Reel Modal */}
      {selectedReel && (
        <ReelModal
          reel={selectedReel}
          onClose={() => setSelectedReel(null)}
        />
      )}

      {/* Post Modal */}
      {selectedPostId && (
        <PostDetailModal
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </div>
  );
}
