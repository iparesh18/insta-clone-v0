/**
 * components/post/PostCardSkeleton.jsx
 */

import React from "react";

export default function PostCardSkeleton() {
  return (
    <div className="border-b border-ig-border bg-white dark:bg-ig-dark mb-1 animate-pulse">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-ig-border" />
        <div className="h-3 w-28 rounded bg-ig-border" />
      </div>
      <div className="aspect-square bg-ig-border" />
      <div className="px-4 py-3 space-y-2">
        <div className="h-3 w-20 rounded bg-ig-border" />
        <div className="h-3 w-48 rounded bg-ig-border" />
        <div className="h-3 w-32 rounded bg-ig-border" />
      </div>
    </div>
  );
}
