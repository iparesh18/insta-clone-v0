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
import { Plus, X, Trash2, Eye } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { storyAPI } from "@/api/services";
import useAuthStore from "@/store/authStore";
import toast from "react-hot-toast";

export default function StoriesBar({ storyGroups = [], onStoryCreated }) {
  const { user } = useAuthStore();
  const [activeGroup, setActiveGroup] = useState(null); // index of open group
  const [activeStoryIndex, setActiveStoryIndex] = useState(0); // current story in group
  const [uploading, setUploading] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const currentGroup =
    activeGroup !== null && storyGroups[activeGroup] ? storyGroups[activeGroup] : null;
  const currentStory = currentGroup?.stories?.[activeStoryIndex];
  const isOwnStory = currentGroup?.user._id === user?._id;

  const openStory = (index) => {
    setActiveGroup(index);
    setActiveStoryIndex(0);
    setShowViewers(false);
  };
  const closeStory = () => setActiveGroup(null);

  const handleStoryEnd = () => {
    // Move to next user's stories or close
    if (activeGroup < storyGroups.length - 1) {
      setActiveGroup(activeGroup + 1);
      setActiveStoryIndex(0);
    } else {
      closeStory();
    }
  };

  const handleSeenByIndex = (storyIndex) => {
    if (typeof storyIndex !== "number") return;
    const story = currentGroup?.stories?.[storyIndex];
    if (!story?._id) return;
    setActiveStoryIndex(storyIndex);
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

  const handleDeleteStory = async () => {
    if (!currentStory) return;
    
    const confirmed = window.confirm("Delete this story?");
    if (!confirmed) return;

    setDeleting(true);
    try {
      await storyAPI.delete(currentStory._id);
      toast.success("Story deleted");
      closeStory();
      if (onStoryCreated) onStoryCreated();
    } catch (err) {
      toast.error("Failed to delete story");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* ── Story circles row ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-ig-dark border border-ig-border rounded-lg p-3 mb-4">
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
              className="flex flex-col items-center gap-1 flex-shrink-0 w-16 relative"
            >
              <Avatar
                src={group.user.profilePicture?.url}
                alt={group.user.username}
                size="lg"
                ring={group.hasUnseen}
                className={group.hasUnseen ? "" : "opacity-70"}
              />
              {/* View count badge for own stories */}
              {group.user._id === user?._id && group.stories[0]?.viewerCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {group.stories[0].viewerCount}
                </span>
              )}
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
            {/* Top controls */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
              <div className="flex-1" />
              
              {/* Own story controls */}
              {isOwnStory && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowViewers(!showViewers)}
                    className="bg-white dark:bg-ig-dark/20 hover:bg-white dark:bg-ig-dark/30 text-white p-2 rounded-full transition flex items-center gap-1"
                    title="View viewers"
                  >
                    <Eye size={20} />
                    <span className="text-xs font-semibold">{currentStory?.viewerCount || 0}</span>
                  </button>
                  <button
                    onClick={handleDeleteStory}
                    disabled={deleting}
                    className="bg-red-500/70 hover:bg-red-600 text-white p-2 rounded-full transition disabled:opacity-50"
                    title="Delete story"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={closeStory}
                className="ml-4 text-white p-2"
              >
                <X size={28} />
              </button>
            </div>

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

            {/* Viewers sidebar (only for own stories) */}
            <AnimatePresence>
              {isOwnStory && showViewers && (
                <motion.div
                  initial={{ x: 400, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 400, opacity: 0 }}
                  className="absolute right-0 top-0 bottom-0 w-80 bg-black/90 backdrop-blur-sm border-l border-white/20 flex flex-col z-20"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-white/20">
                    <h2 className="text-white font-bold text-lg">
                      {currentStory?.viewerCount || 0} View{currentStory?.viewerCount !== 1 ? "s" : ""}
                    </h2>
                  </div>

                  {/* Viewers list */}
                  <div className="flex-1 overflow-y-auto">
                    {currentStory?.viewers && currentStory.viewers.length > 0 ? (
                      <div className="space-y-3 p-4">
                        {currentStory.viewers.map((viewer) => (
                          <div
                            key={viewer._id}
                            className="flex items-center gap-3 hover:bg-white dark:bg-ig-dark/10 p-2 rounded-lg transition"
                          >
                            <Avatar
                              src={viewer.profilePicture?.url}
                              alt={viewer.username}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-sm truncate">
                                {viewer.username}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-white/60">
                        <p className="text-sm">No viewers yet</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}



