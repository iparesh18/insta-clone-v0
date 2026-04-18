/**
 * pages/LoginPage.jsx
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { authAPI, verificationAPI } from "@/api/services";
import useAuthStore from "@/store/authStore";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setEmailNotVerified(false);
    try {
      const { data } = await authAPI.login(form);
      setUser(data.data.user);
      toast.success("Welcome back!");
      navigate("/");
    } catch (error) {
      // Check if error is due to unverified email (403 status)
      if (error.response?.status === 403 && error.response?.data?.message?.includes("verify")) {
        setEmailNotVerified(true);
        toast.error("Please verify your email to login");
      }
      // Other errors handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!form.email) {
      toast.error("Please enter your email address");
      return;
    }

    setResendLoading(true);
    try {
      await verificationAPI.resendVerificationEmail(form.email);
      toast.success("Verification email sent! Check your inbox.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send verification email");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Card */}
      <div className="bg-white border border-ig-border rounded p-10 space-y-4">
        <h1 className="text-4xl font-bold text-center tracking-tighter mb-6"
            style={{ fontFamily: "Billabong, cursive" }}>
          Instagram
        </h1>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            className="ig-input"
            type="email"
            placeholder="Phone number, username, or email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="ig-input"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button className="ig-btn-primary mt-2" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        {/* Email Verification Needed */}
        {emailNotVerified && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
            <p className="text-sm font-semibold text-yellow-900">
              📧 Email verification required
            </p>
            <p className="text-xs text-yellow-800">
              Check your email for a verification link. If you didn't receive it, we can send it again.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="w-full px-4 py-2 text-sm font-semibold text-yellow-900 bg-yellow-100 rounded hover:bg-yellow-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading ? "Sending…" : "Resend Verification Email"}
            </button>
          </div>
        )}

      </div>

      <div className="bg-white border border-ig-border rounded p-5 text-center text-sm">
        Don't have an account?{" "}
        <Link to="/register" className="text-ig-blue font-semibold hover:underline">
          Sign up
        </Link>
      </div>
    </motion.div>
  );
}
