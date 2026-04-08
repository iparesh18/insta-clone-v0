/**
 * pages/SearchPage.jsx
 * Dedicated search results page for full-screen view
 */

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { searchAPI } from "@/api/services";
import PostCard from "@/components/post/PostCard";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q");

  const [activeTab, setActiveTab] = useState("all"); // all, users, posts, reels, tags
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await searchAPI.global(query);
        setResults(res.data);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  if (!query) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Enter a search query</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: "all", label: "All", count: (results?.users?.length || 0) + (results?.posts?.length || 0) + (results?.reels?.length || 0) + (results?.hashtags?.length || 0) },
    { id: "users", label: "Users", count: results?.users?.length || 0 },
    { id: "posts", label: "Posts", count: results?.posts?.length || 0 },
    { id: "reels", label: "Reels", count: results?.reels?.length || 0 },
    { id: "tags", label: "Tags", count: results?.hashtags?.length || 0 },
  ];

  const renderContent = () => {
    if (activeTab === "all" || activeTab === "users") {
      const users = results?.users || [];
      if (users.length === 0 && activeTab === "users") {
        return <div className="text-center py-8 text-gray-500">No users found</div>;
      }
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {users.map((user) => (
            <button
              key={user._id}
              onClick={() => navigate(`/${user.username}`)}
              className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
            >
              <img
                src={user.profilePicture}
                alt={user.username}
                className="w-16 h-16 rounded-full mx-auto mb-2"
              />
              <p className="font-semibold text-sm">{user.username}</p>
              <p className="text-xs text-gray-500">{user.name}</p>
            </button>
          ))}
        </div>
      );
    }

    if (activeTab === "all" || activeTab === "posts") {
      const posts = results?.posts || [];
      if (posts.length === 0 && activeTab === "posts") {
        return <div className="text-center py-8 text-gray-500">No posts found</div>;
      }
      return (
        <div className="grid grid-cols-3 gap-4">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      );
    }

    if (activeTab === "all" || activeTab === "reels") {
      const reels = results?.reels || [];
      if (reels.length === 0 && activeTab === "reels") {
        return <div className="text-center py-8 text-gray-500">No reels found</div>;
      }
      return (
        <div className="grid grid-cols-3 gap-4">
          {reels.map((reel) => (
            <button
              key={reel._id}
              onClick={() => navigate(`/reel/${reel._id}`)}
              className="relative group overflow-hidden rounded-lg"
            >
              <img
                src={reel.thumbnail}
                alt="reel"
                className="w-full aspect-video object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition" />
            </button>
          ))}
        </div>
      );
    }

    if (activeTab === "tags") {
      const hashtags = results?.hashtags || [];
      if (hashtags.length === 0) {
        return <div className="text-center py-8 text-gray-500">No hashtags found</div>;
      }
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {hashtags.map((tag) => (
            <button
              key={tag}
              onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
              className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
            >
              <p className="font-semibold">#{tag}</p>
            </button>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">
        Search results for "<span className="text-blue-500">{query}</span>"
      </h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === tab.id
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
