/**
 * pages/ExplorePage.jsx
 * Global search page with multi-category search (users, posts, reels, hashtags)
 */

import React from "react";
import SearchBar from "@/components/search/SearchBar";

export default function ExplorePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Explore</h1>
      
      {/* Global Search Bar with Users, Posts, Reels, Hashtags */}
      <div className="mb-8">
        <SearchBar />
      </div>
    </div>
  );
}
