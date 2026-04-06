import { create } from "zustand";
import { reelAPI } from "@/api/services";
import toast from "react-hot-toast";

/**
 * Global Reels Store
 * Manages reels across entire app with optimistic updates
 * Ensures like/save sync everywhere
 */
const useReelsStore = create((set, get) => ({
  // State
  reels: [], // All reels
  savedReels: new Set(), // Track saved reel IDs for quick lookup
  likedReels: new Map(), // Track liked reel IDs + like state

  // ─── LIKE/UNLIKE ────────────────────────────────────────────────
  toggleReelLike: async (reelId) => {
    const { reels, likedReels } = get();
    const currentLiked = likedReels.get(reelId)?.liked || false;

    // Optimistic update
    set((state) => {
      const newLikedReels = new Map(state.likedReels);
      newLikedReels.set(reelId, {
        liked: !currentLiked,
        likeCount: currentLiked
          ? Math.max(0, (newLikedReels.get(reelId)?.likeCount || 0) - 1)
          : (newLikedReels.get(reelId)?.likeCount || 0) + 1,
      });

      // Update reels array
      const updatedReels = reels.map((r) =>
        r._id === reelId
          ? {
              ...r,
              isLiked: !currentLiked,
              likeCount: newLikedReels.get(reelId).likeCount,
            }
          : r
      );

      return {
        reels: updatedReels,
        likedReels: newLikedReels,
      };
    });

    try {
      const { data } = await reelAPI.toggleLike(reelId);
      const likedFromApi = !!data.data?.liked;
      const countFromApi = data.data?.likeCount || 0;

      // Confirm with server response
      set((state) => {
        const newLikedReels = new Map(state.likedReels);
        newLikedReels.set(reelId, {
          liked: likedFromApi,
          likeCount: countFromApi,
        });

        const updatedReels = state.reels.map((r) =>
          r._id === reelId
            ? { ...r, isLiked: likedFromApi, likeCount: countFromApi }
            : r
        );

        return {
          reels: updatedReels,
          likedReels: newLikedReels,
        };
      });
    } catch (error) {
      // Revert on error
      console.error("Like toggle failed:", error);
      set((state) => {
        const newLikedReels = new Map(state.likedReels);
        newLikedReels.set(reelId, {
          liked: currentLiked,
          likeCount: newLikedReels.get(reelId)?.likeCount || 0,
        });

        const updatedReels = state.reels.map((r) =>
          r._id === reelId
            ? {
                ...r,
                isLiked: currentLiked,
                likeCount: newLikedReels.get(reelId).likeCount,
              }
            : r
        );

        return {
          reels: updatedReels,
          likedReels: newLikedReels,
        };
      });
      toast.error("Failed to update like");
    }
  },

  // ─── SAVE/UNSAVE ────────────────────────────────────────────────
  toggleReelSave: async (reelId) => {
    const { savedReels } = get();
    const currentSaved = savedReels.has(reelId);

    // Optimistic update
    set((state) => {
      const newSavedReels = new Set(state.savedReels);
      if (currentSaved) {
        newSavedReels.delete(reelId);
      } else {
        newSavedReels.add(reelId);
      }
      return { savedReels: newSavedReels };
    });

    try {
      // If API exists for save, call it. Otherwise just track locally
      // await reelAPI.toggleSave?.(reelId);
      toast.success(currentSaved ? "Removed from saved" : "Saved to collection");
    } catch (error) {
      console.error("Save toggle failed:", error);
      set((state) => {
        const newSavedReels = new Set(state.savedReels);
        if (currentSaved) {
          newSavedReels.add(reelId);
        } else {
          newSavedReels.delete(reelId);
        }
        return { savedReels: newSavedReels };
      });
      toast.error("Failed to update save");
    }
  },

  // ─── ADD REEL ────────────────────────────────────────────────────
  addReel: (reel) => {
    set((state) => ({
      reels: [reel, ...state.reels],
      likedReels: new Map(state.likedReels),
    }));
  },

  // ─── DELETE REEL ────────────────────────────────────────────────
  deleteReel: (reelId) => {
    set((state) => {
      const newLikedReels = new Map(state.likedReels);
      newLikedReels.delete(reelId);

      const newSavedReels = new Set(state.savedReels);
      newSavedReels.delete(reelId);

      return {
        reels: state.reels.filter((r) => r._id !== reelId),
        likedReels: newLikedReels,
        savedReels: newSavedReels,
      };
    });
  },

  // ─── UPDATE COMMENT COUNT ────────────────────────────────────────
  updateCommentCount: (reelId, newCount) => {
    set((state) => ({
      reels: state.reels.map((r) =>
        r._id === reelId ? { ...r, commentCount: newCount } : r
      ),
    }));
  },

  // ─── SET REELS ──────────────────────────────────────────────────
  setReels: (newReels) => {
    const likedMap = new Map();
    const savedSet = new Set();

    newReels.forEach((reel) => {
      likedMap.set(reel._id, {
        liked: reel.isLiked || false,
        likeCount: reel.likeCount || 0,
      });
    });

    set({
      reels: newReels,
      likedReels: likedMap,
      savedReels: savedSet,
    });
  },

  // ─── GET REEL BY ID ──────────────────────────────────────────────
  getReelById: (reelId) => {
    return get().reels.find((r) => r._id === reelId);
  },
}));

export default useReelsStore;
