/**
 * App.jsx - FIXED v2
 * Removed localStorage token dependency (auth via httpOnly cookie only).
 */

import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import useAuthStore from "@/store/authStore";
import useSocketStore from "@/store/socketStore";

import MainLayout from "@/components/layout/MainLayout";
import AuthLayout from "@/components/layout/AuthLayout";
import PushNotificationManager from "@/components/PushNotificationManager";

import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import HomePage from "@/pages/HomePage";
import ExplorePage from "@/pages/ExplorePage";
import ReelsPage from "@/pages/ReelsPage";
import ProfilePage from "@/pages/ProfilePage";
import ChatPage from "@/pages/ChatPage";
import NotificationPage from "@/pages/NotificationPage";
import NotFoundPage from "@/pages/NotFoundPage";

const Spinner = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="w-8 h-8 border-2 border-ig-blue border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <Spinner />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <Spinner />;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
};

export default function App() {
  const { fetchMe, isAuthenticated } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  // On mount: verify session cookie with server
  // Empty dependency array ensures this runs ONCE on mount only
  useEffect(() => {
    fetchMe();
  }, []);

  // Connect/disconnect socket based on auth state
  // Socket auth uses the httpOnly cookie automatically via withCredentials
  useEffect(() => {
    if (isAuthenticated) {
      connect(); // no token needed — cookie is sent with WS handshake
    } else {
      disconnect();
    }
  }, [isAuthenticated, connect, disconnect]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PushNotificationManager />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { fontSize: "14px", borderRadius: "8px" },
        }}
      />
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        </Route>

        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/reels" element={<ReelsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:userId" element={<ChatPage />} />
          <Route path="/notifications" element={<NotificationPage />} />
          <Route path="/:username" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
