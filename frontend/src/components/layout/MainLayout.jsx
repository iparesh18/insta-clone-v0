/**
 * components/layout/MainLayout.jsx - FIXED v2
 */

import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Compass, Film, MessageCircle, PlusSquare,
  Menu, LogOut, Settings, Bookmark,
} from "lucide-react";
import useAuthStore from "@/store/authStore";
import useNotificationStore from "@/store/notificationStore";
import CreatePostModal from "@/components/post/CreatePostModal";
import CreateReelModal from "@/components/reel/CreateReelModal";
import SettingsModal from "@/components/ui/SettingsModal";
import Avatar from "@/components/ui/Avatar";
import ToastContainer from "@/components/ui/Toast";
import { useNotificationListener } from "@/hooks/useNotificationListener";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/reels", icon: Film, label: "Reels" },
  { to: "/chat", icon: MessageCircle, label: "Messages" },
];

function IgWordmark() {
  return (
    <span className="text-2xl font-bold select-none"
          style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
      Instagram
    </span>
  );
}

function IgIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
         strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="5"/>
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateReel, setShowCreateReel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Start listening for notifications globally
  useNotificationListener();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-white">
      <nav className="fixed left-0 top-0 h-full z-40 flex flex-col
                      w-16 xl:w-64 border-r border-ig-border bg-white
                      px-3 py-5 gap-1">
        <div className="px-3 mb-6 hidden xl:block"><IgWordmark /></div>
        <div className="px-3 mb-6 xl:hidden flex justify-center"><IgIcon /></div>

        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-4 px-3 py-3 rounded-xl cursor-pointer
               transition-colors hover:bg-ig-hover relative
               ${isActive ? "font-bold" : "font-normal"}`}>
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon size={26} strokeWidth={isActive ? 2.5 : 1.5} />
                  {/* Notification badge for Messages */}
                  {to === "/chat" && unreadCount > 0 && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500
                                    text-white text-xs font-bold rounded-full
                                    flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </div>
                  )}
                </div>
                <span className="hidden xl:block text-sm">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-4 px-3 py-3 rounded-xl
                     hover:bg-ig-hover transition-colors">
          <PlusSquare size={26} strokeWidth={1.5} />
          <span className="hidden xl:block text-sm">Create</span>
        </button>

        <button
          onClick={() => setShowCreateReel(true)}
          className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-ig-hover transition-colors"
        >
          <Film size={26} strokeWidth={1.5} />
          <span className="hidden xl:block text-sm">Create Reel</span>
        </button>

        <div className="flex-1" />

        <NavLink to={`/${user?.username}`}
          className={({ isActive }) =>
            `flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-ig-hover
             transition-colors ${isActive ? "font-bold" : ""}`}>
          <Avatar src={user?.profilePicture?.url} alt={user?.username} size="sm" />
          <span className="hidden xl:block text-sm">{user?.username}</span>
        </NavLink>

        <div className="relative">
          <button onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-4 px-3 py-3 rounded-xl
                       hover:bg-ig-hover transition-colors w-full">
            <Menu size={26} strokeWidth={1.5} />
            <span className="hidden xl:block text-sm">More</span>
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-14 left-0 w-56 bg-white rounded-2xl
                           shadow-xl border border-ig-border overflow-hidden z-50">
                <button onClick={() => { setShowSettings(true); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 w-full hover:bg-ig-hover text-sm">
                  <Settings size={18} /> Settings
                </button>
                <button onClick={() => { navigate(`/${user?.username}`); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 w-full hover:bg-ig-hover text-sm">
                  <Bookmark size={18} /> Saved
                </button>
                <div className="border-t border-ig-border my-1" />
                <button onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 w-full
                             hover:bg-ig-hover text-sm text-red-500">
                  <LogOut size={18} /> Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      <main className="flex-1 ml-16 xl:ml-64">
        <Outlet />
      </main>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
      {showCreateReel && <CreateReelModal onClose={() => setShowCreateReel(false)} />}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
