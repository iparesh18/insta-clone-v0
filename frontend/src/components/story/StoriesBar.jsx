/**
 * components/story/StoriesBar.jsx
 *
 * Horizontal scrollable story circles.
 * Clicking a circle opens the full-screen story viewer
 * powered by react-insta-stories.
 */

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Stories from "react-insta-stories";
import { Plus, X } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { storyAPI } from "@/api/services";
import useAuthStore from "@/store/authStore";
import toast from "react-hot-toast";

export default function StoriesBar({ storyGroups = [], onStoryCreated }) {
  const { user } = useAuthStore();
  const [activeGroup, setActiveGroup] = useState(null); // index of open group
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const currentGroup =
    activeGroup !== null && storyGroups[activeGroup] ? storyGroups[activeGroup] : null;

  const openStory = (index) => setActiveGroup(index);
  const closeStory = () => setActiveGroup(null);

  const handleStoryEnd = () => {
    // Move to next user's stories or close
    if (activeGroup < storyGroups.length - 1) {
      setActiveGroup(activeGroup + 1);
    } else {
      closeStory();
    }
  };

  const handleSeenByIndex = (storyIndex) => {
    if (typeof storyIndex !== "number") return;
    const story = currentGroup?.stories?.[storyIndex];
    if (!story?._id) return;
    storyAPI.view(story._id).catch(() => {});
  };

  const createStory = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("media", file);
      await storyAPI.create(formData);
      toast.success("Story uploaded");
      if (onStoryCreated) onStoryCreated();
    } catch {
      // handled by interceptor
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      {/* ── Story circles row ─────────────────────────────────────────── */}
      <div className="bg-white border border-ig-border rounded-lg p-3 mb-4">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          <div className="flex flex-col items-center gap-1 flex-shrink-0 w-16">
            <button
              className="relative"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Avatar src={user?.profilePicture?.url} alt={user?.username} size="lg" />
              <span className="absolute -right-1 -bottom-1 bg-ig-blue text-white rounded-full p-1 border-2 border-white">
                <Plus size={10} />
              </span>
            </button>
            <span className="text-xs truncate w-full text-center text-ig-dark">
              {uploading ? "Uploading..." : "Add story"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => createStory(e.target.files?.[0])}
            />
          </div>

          {storyGroups.map((group, idx) => (
            <motion.button
              key={group.user._id}
              whileTap={{ scale: 0.9 }}
              onClick={() => openStory(idx)}
              className="flex flex-col items-center gap-1 flex-shrink-0 w-16"
            >
              <Avatar
                src={group.user.profilePicture?.url}
                alt={group.user.username}
                size="lg"
                ring={group.hasUnseen}
                className={group.hasUnseen ? "" : "opacity-70"}
              />
              <span className="text-xs truncate w-full text-center text-ig-dark">
                {group.user._id === user?._id ? "Your story" : group.user.username}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Full-screen story viewer ──────────────────────────────────── */}
      <AnimatePresence>
        {activeGroup !== null && currentGroup && (
          <motion.div
            key="story-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            {/* Close button */}
            <button
              onClick={closeStory}
              className="absolute top-4 right-4 z-10 text-white p-2"
            >
              <X size={28} />
            </button>

            <div className="w-full h-full flex items-center justify-center px-2 sm:px-4">
              {/* react-insta-stories */}
              <Stories
                stories={currentGroup.stories.map((s) => ({
                  url: s.media.url,
                  type: s.media.type === "video" ? "video" : "image",
                  header: {
                    heading: currentGroup.user.username,
                    subheading: new Date(s.createdAt).toLocaleTimeString([], {
                      hour: "2-digit", minute: "2-digit",
                    }),
                    profileImage: currentGroup.user.profilePicture?.url,
                  },
                  seeMoreCollapsed: s.caption
                    ? () => <span className="text-white text-sm">{s.caption}</span>
                    : undefined,
                }))}
                defaultInterval={5000}
                width="min(420px, 100vw)"
                height="100dvh"
                onAllStoriesEnd={handleStoryEnd}
                onStoryStart={(indexLike) => {
                  const idx = typeof indexLike === "number" ? indexLike : Number(indexLike);
                  if (Number.isInteger(idx) && idx >= 0) handleSeenByIndex(idx);
                }}
                storyStyles={{ objectFit: "contain", background: "#000" }}
                keyboardNavigation
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
