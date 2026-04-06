/**
 * pages/ExplorePage.jsx
 */

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { userAPI } from "@/api/services";
import Avatar from "@/components/ui/Avatar";
import { Link } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return; }
    setLoading(true);
    userAPI.searchUsers(debouncedQuery)
      .then(({ data }) => setResults(data.data.users))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ig-gray" />
        <input
          className="w-full bg-ig-hover rounded-lg pl-9 pr-4 py-2.5 text-sm
                     focus:outline-none placeholder-ig-gray"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-ig-border border-t-ig-blue rounded-full animate-spin" />
        </div>
      )}

      <div className="space-y-1">
        {results.map((u) => (
          <Link
            key={u._id}
            to={`/${u.username}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-ig-hover transition-colors"
          >
            <Avatar src={u.profilePicture?.url} alt={u.username} size="md" />
            <div>
              <p className="text-sm font-semibold">{u.username}</p>
              <p className="text-xs text-ig-gray">{u.fullName}</p>
              <p className="text-xs text-ig-gray">
                {u.followerCount?.toLocaleString()} followers
              </p>
            </div>
          </Link>
        ))}
      </div>

      {!loading && query && results.length === 0 && (
        <p className="text-center text-ig-gray text-sm py-8">No results for "{query}"</p>
      )}
    </div>
  );
}
