import { create } from "zustand";
import { postAPI } from "@/api/services";
import toast from "react-hot-toast";

/**
 * Global Posts Store
 * Manages saved posts across entire app
 * Ensures save state sync everywhere
 */
const usePostsStore = create((set, get) => ({
  // State
  savedPosts: new Set(), // Track saved post IDs

  // ─── TOGGLE SAVE ────────────────────────────────────────────────
  togglePostSave: async (postId) => {
    const { savedPosts } = get();
    const currentSaved = savedPosts.has(postId);

    // Optimistic update
    set((state) => {
      const newSavedPosts = new Set(state.savedPosts);
      if (currentSaved) {
        newSavedPosts.delete(postId);
      } else {
        newSavedPosts.add(postId);
      }
      return { savedPosts: newSavedPosts };
    });

    try {
      const { data } = await postAPI.toggleSave(postId);
      const isSaved = !!data.data?.saved;

      // Confirm with server response
      set((state) => {
        const newSavedPosts = new Set(state.savedPosts);
        if (isSaved) {
          newSavedPosts.add(postId);
        } else {
          newSavedPosts.delete(postId);
        }
        return { savedPosts: newSavedPosts };
      });

      toast.success(isSaved ? "Saved to collection" : "Removed from saved");
    } catch (error) {
      // Revert on error
      console.error("Save toggle failed:", error);
      set((state) => {
        const newSavedPosts = new Set(state.savedPosts);
        if (currentSaved) {
          newSavedPosts.add(postId);
        } else {
          newSavedPosts.delete(postId);
        }
        return { savedPosts: newSavedPosts };
      });
      toast.error("Failed to update save");
    }
  },

  // ─── INITIALIZE SAVED POSTS ─────────────────────────────────────
  initializeSavedPosts: (postIds) => {
    set({
      savedPosts: new Set(postIds),
    });
  },

  // ─── ADD SAVED POST ──────────────────────────────────────────────
  addSavedPost: (postId) => {
    set((state) => {
      const newSavedPosts = new Set(state.savedPosts);
      newSavedPosts.add(postId);
      return { savedPosts: newSavedPosts };
    });
  },

  // ─── REMOVE SAVED POST ───────────────────────────────────────────
  removeSavedPost: (postId) => {
    set((state) => {
      const newSavedPosts = new Set(state.savedPosts);
      newSavedPosts.delete(postId);
      return { savedPosts: newSavedPosts };
    });
  },
}));

export default usePostsStore;
