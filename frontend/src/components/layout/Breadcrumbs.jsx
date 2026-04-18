/**
 * components/layout/Breadcrumbs.jsx
 * Reusable breadcrumb navigation component
 * Shows current path with clickable navigation
 */

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const ROUTE_NAMES = {
  "": "Home",
  explore: "Explore",
  reels: "Reels",
  chat: "Messages",
  notifications: "Notifications",
  profile: "Profile",
};

export default function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse route parts
  const parts = location.pathname
    .split("/")
    .filter((p) => p && p !== "home");

  // If we're at home, don't show breadcrumbs
  if (parts.length === 0) return null;

  // Build breadcrumb items
  const breadcrumbs = [
    { name: "Home", path: "/" },
    ...parts.map((part, index) => {
      const path = "/" + parts.slice(0, index + 1).join("/");
      const name = ROUTE_NAMES[part] || capitalize(part);
      return { name, path };
    }),
  ];

  return (
    <div className="px-4 py-3 text-sm text-gray-600 border-b border-gray-200">
      <div className="max-w-6xl mx-auto flex items-center gap-2 flex-wrap">
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.path} className="flex items-center gap-2">
            {/* Breadcrumb Item */}
            {idx === breadcrumbs.length - 1 ? (
              // Last item: active (bold, not clickable)
              <span className="font-semibold text-gray-900">{crumb.name}</span>
            ) : (
              // Previous items: clickable links
              <button
                onClick={() => navigate(crumb.path)}
                className="text-blue-500 hover:text-blue-700 hover:underline transition-colors font-medium"
              >
                {crumb.name}
              </button>
            )}

            {/* Separator (except for last item) */}
            {idx < breadcrumbs.length - 1 && (
              <ChevronRight size={16} className="text-gray-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper: capitalize first letter
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
