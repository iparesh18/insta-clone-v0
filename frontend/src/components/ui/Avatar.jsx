/**
 * components/ui/Avatar.jsx
 */

import React from "react";

const sizes = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-16 h-16 text-xl",
  xl: "w-24 h-24 text-3xl",
  "2xl": "w-36 h-36 text-5xl",
};

export default function Avatar({ src, alt = "", size = "md", ring = false, className = "" }) {
  const initials = alt ? alt[0].toUpperCase() : "?";

  return (
    <div
      className={`
        ${sizes[size]} rounded-full overflow-hidden flex-shrink-0
        flex items-center justify-center bg-gradient-to-br
        from-purple-500 via-pink-500 to-orange-400 text-white font-semibold
        ${ring ? "ring-2 ring-white outline outline-2 outline-pink-500" : ""}
        ${className}
      `}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
