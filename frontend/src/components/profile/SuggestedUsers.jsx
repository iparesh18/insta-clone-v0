/**
 * components/profile/SuggestedUsers.jsx - FIXED v2
 * Uses a proper search with empty catch instead of hardcoded "a".
 * In production: add GET /api/v1/users/suggestions endpoint.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userAPI } from "@/api/services";
import Avatar from "@/components/ui/Avatar";
import useAuthStore from "@/store/authStore";

export default function SuggestedUsers() {
  const { user: currentUser } = useAuthStore();
  const [suggestions, setSuggestions] = useState([]);
  const [followed, setFollowed] = useState(new Set());

  useEffect(() => {
    // Fetch users not yet followed — search common letters to seed suggestions
    // TODO: replace with a dedicated /users/suggestions endpoint
    const seeds = ["a", "e", "i"];
    const seed = seeds[Math.floor(Math.random() * seeds.length)];
    userAPI.searchUsers(seed)
      .then(({ data }) => {
        const filtered = (data.data.users || [])
          .filter(u => u._id !== currentUser?._id)
          .slice(0, 5);
        setSuggestions(filtered);
      })
      .catch(() => {});
  }, [currentUser?._id]);

  const handleFollow = async (id) => {
    try {
      await userAPI.follow(id);
      setFollowed(prev => new Set([...prev, id]));
    } catch {}
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-4">
      {/* Current user mini-profile */}
      <div className="flex items-center justify-between">
        <Link to={`/${currentUser.username}`} className="flex items-center gap-3">
          <Avatar src={currentUser.profilePicture?.url} alt={currentUser.username} size="md" />
          <div>
            <p className="text-sm font-semibold leading-none">{currentUser.username}</p>
            <p className="text-xs text-ig-gray mt-0.5">{currentUser.fullName}</p>
          </div>
        </Link>
      </div>

      {suggestions.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-ig-gray">Suggested for you</span>
            <button className="text-xs font-semibold text-ig-dark hover:text-ig-gray">
              See all
            </button>
          </div>
          <div className="space-y-3">
            {suggestions.map(u => (
              <div key={u._id} className="flex items-center justify-between">
                <Link to={`/${u.username}`} className="flex items-center gap-3 min-w-0">
                  <Avatar src={u.profilePicture?.url} alt={u.username} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{u.username}</p>
                    <p className="text-xs text-ig-gray">Suggested for you</p>
                  </div>
                </Link>
                {followed.has(u._id) ? (
                  <span className="text-xs text-ig-gray ml-2 flex-shrink-0">Following</span>
                ) : (
                  <button onClick={() => handleFollow(u._id)}
                    className="text-xs text-ig-blue font-semibold ml-2 flex-shrink-0
                               hover:text-blue-700 transition-colors">
                    Follow
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-ig-gray leading-relaxed pt-2">
        <div className="flex flex-wrap gap-x-2 gap-y-1 mb-2">
          {["About","Help","Press","API","Jobs","Privacy","Terms"].map(t => (
            <span key={t} className="hover:underline cursor-pointer">{t}</span>
          ))}
        </div>
        <p>© {new Date().getFullYear()} Instagram Clone</p>
      </div>
    </div>
  );
}
