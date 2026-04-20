/**
 * pages/VerifyEmailPage.jsx
 *
 * Verify email with token from URL parameter
 * User can paste token manually or click link from email
 */

import React, { useState, useEffect } from "react";
import { useSearchParams, useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { verificationAPI } from "@/api/services";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { token: tokenFromPath } = useParams();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Auto-verify token from either /verify-email?token=... or /verify-email/:token
  useEffect(() => {
    const urlToken = searchParams.get("token") || tokenFromPath;
    if (urlToken) {
      setToken(urlToken);
      verifyToken(urlToken);
    }
  }, [searchParams, tokenFromPath]);

  const verifyToken = async (verifyToken) => {
    setLoading(true);
    setError("");
    try {
      await verificationAPI.verifyEmail(verifyToken);
      setVerified(true);
      toast.success("Email verified successfully! 🎉");
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired verification link");
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitToken = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError("Please enter the verification token");
      return;
    }
    await verifyToken(token);
  };

  // Success state
  if (verified) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm mx-auto"
      >
        <div className="bg-white dark:bg-ig-dark border border-ig-border rounded p-10 space-y-6 text-center">
          <div className="text-6xl animate-bounce">✅</div>

          <div>
            <h1 className="text-2xl font-bold text-ig-dark mb-2">
              Email Verified!
            </h1>
            <p className="text-ig-gray">
              Your account is now active. Redirecting to login...
            </p>
          </div>

          <Link
            to="/login"
            className="inline-block px-6 py-2 bg-ig-blue text-white font-semibold rounded hover:bg-ig-blue-dark transition"
          >
            Go to Login
          </Link>
        </div>
      </motion.div>
    );
  }

  // Verification form
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-sm mx-auto space-y-4"
    >
      <div className="bg-white dark:bg-ig-dark border border-ig-border rounded p-10 space-y-6">
        <h1 className="text-2xl font-bold text-center text-ig-dark">
          Verify Your Email
        </h1>

        <p className="text-center text-sm text-ig-gray">
          Check your email for a verification link. If the automatic verification didn't work, paste the token below.
        </p>

        <form onSubmit={handleSubmitToken} className="space-y-3">
          <input
            type="text"
            placeholder="Paste verification token here"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="ig-input"
            required
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="ig-btn-primary w-full"
          >
            {loading ? "Verifying…" : "Verify Email"}
          </button>
        </form>

        <div className="border-t border-ig-border pt-4 text-center">
          <p className="text-sm text-ig-gray mb-3">
            Token not working?
          </p>
          <Link
            to="/login"
            className="text-ig-blue font-semibold hover:underline text-sm"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

