/**
 * store/authStore.js - FIXED v2
 * Stable function refs so useEffect deps don't warn.
 * Uses initialization flag to prevent duplicate fetchMe calls.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authAPI } from "@/api/services";

let isFetchingMe = false;

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,  // start true so ProtectedRoute waits for cookie check
      isMeInitialized: false,

      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

      fetchMe: async () => {
        // Prevent duplicate calls during React StrictMode
        if (isFetchingMe || get().isMeInitialized) return;
        
        isFetchingMe = true;
        set({ isLoading: true });
        try {
          const { data } = await authAPI.getMe();
          set({
            user: data.data.user,
            isAuthenticated: true,
            isLoading: false,
            isMeInitialized: true,
          });
        } catch (err) {
          // 401 means no valid session — this is normal for new users
          // Don't spam with error messages, just mark as initialized
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            isMeInitialized: true,
          });
        } finally {
          isFetchingMe = false;
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch {
          // ignore — clear state regardless
        } finally {
          set({ 
            user: null, 
            isAuthenticated: false,
            isMeInitialized: false,
          });
          isFetchingMe = false;
        }
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: "ig-auth",
      // Only persist minimal data — actual auth is validated via cookie on app start
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
