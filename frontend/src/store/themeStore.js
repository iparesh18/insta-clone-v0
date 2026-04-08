/**
 * store/themeStore.js
 * Zustand store for dark mode theme management
 * Persists to localStorage and applies to document
 */

import { create } from "zustand";

const useThemeStore = create((set) => ({
  isDarkMode: false,

  // Initialize theme from localStorage on app load
  initializeTheme: () => {
    const saved = localStorage.getItem("theme");
    const isDark = saved ? saved === "dark" : false;
    
    set({ isDarkMode: isDark });
    applyTheme(isDark);
  },

  // Toggle dark mode
  toggleDarkMode: () => {
    set((state) => {
      const newIsDark = !state.isDarkMode;
      localStorage.setItem("theme", newIsDark ? "dark" : "light");
      applyTheme(newIsDark);
      return { isDarkMode: newIsDark };
    });
  },

  // Set specific theme
  setDarkMode: (isDark) => {
    set({ isDarkMode: isDark });
    localStorage.setItem("theme", isDark ? "dark" : "light");
    applyTheme(isDark);
  },
}));

/**
 * Apply theme to document
 * Tailwind uses class="dark" on <html> element
 */
const applyTheme = (isDark) => {
  const html = document.documentElement;
  if (isDark) {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
};

export default useThemeStore;
