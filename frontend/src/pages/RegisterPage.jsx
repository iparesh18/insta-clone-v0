/**
 * pages/RegisterPage.jsx
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { authAPI, verificationAPI } from "@/api/services";

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: "", fullName: "", username: "", password: "",
  });
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.register(form);
      // Registration successful - now user needs to verify email
      setRegistrationSuccess(true);
      toast.success("Account created! Check your email to verify.");
    } catch (error) {
      // Error handled by interceptor
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

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 max-w-sm mx-auto"
      >
        <div className="bg-white dark:bg-ig-dark border border-ig-border rounded p-10 space-y-6 text-center">
          <div className="text-5xl">📧</div>

          <h2 className="text-2xl font-bold text-ig-dark">
            Verify Your Email
          </h2>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 mb-3">
              We've sent a verification link to:
            </p>
            <p className="text-base font-semibold text-blue-950 mb-4">
              {form.email}
            </p>
            <p className="text-xs text-blue-800">
              Click the link in your email to activate your account. The link expires in 24 hours.
            </p>
          </div>

          <div className="space-y-2 border-t border-ig-border pt-6">
            <p className="text-sm text-ig-gray">
              Didn't receive the email?
            </p>
            <button
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="w-full px-4 py-2 bg-ig-blue text-white font-semibold rounded hover:bg-ig-blue-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading ? "Sending…" : "Resend Verification Email"}
            </button>
          </div>

          <div className="border-t border-ig-border pt-4">
            <p className="text-sm text-ig-gray mb-3">
              Already verified your email?
            </p>
            <Link
              to="/login"
              className="text-ig-blue font-semibold hover:underline text-base"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  // Normal registration form
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="bg-white dark:bg-ig-dark border border-ig-border rounded p-10 space-y-4">
        <h1 className="text-4xl font-bold text-center tracking-tighter"
            style={{ fontFamily: "Billabong, cursive" }}>
          Instagram
        </h1>
        <p className="text-center text-ig-gray font-semibold text-base leading-5">
          Sign up to see photos and videos from your friends.
        </p>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input className="ig-input" name="email" type="email"
            placeholder="Mobile number or email" value={form.email}
            onChange={handleChange} required />
          <input className="ig-input" name="fullName" type="text"
            placeholder="Full Name" value={form.fullName}
            onChange={handleChange} required />
          <input className="ig-input" name="username" type="text"
            placeholder="Username" value={form.username}
            onChange={handleChange} required />
          <input className="ig-input" name="password" type="password"
            placeholder="Password" value={form.password}
            onChange={handleChange} required minLength={6} />

          <p className="text-xs text-ig-gray text-center">
            By signing up, you agree to our{" "}
            <span className="text-ig-dark font-semibold">Terms</span>,{" "}
            <span className="text-ig-dark font-semibold">Privacy Policy</span>.
          </p>

          <button className="ig-btn-primary" disabled={loading}>
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-ig-dark border border-ig-border rounded p-5 text-center text-sm">
        Have an account?{" "}
        <Link to="/login" className="text-ig-blue font-semibold hover:underline">
          Log in
        </Link>
      </div>
    </motion.div>
  );
}

