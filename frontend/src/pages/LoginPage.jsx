/**
 * pages/LoginPage.jsx
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { authAPI } from "@/api/services";
import useAuthStore from "@/store/authStore";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.login(form);
      setUser(data.data.user);
      toast.success("Welcome back!");
      navigate("/");
    } catch {
      // error toast handled by axios interceptor
    } finally {
      setLoading(false);
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
