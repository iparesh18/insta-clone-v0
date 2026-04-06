/**
 * pages/RegisterPage.jsx
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { authAPI } from "@/api/services";
import useAuthStore from "@/store/authStore";

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: "", fullName: "", username: "", password: "",
  });
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.register(form);
      setUser(data.data.user);
      toast.success("Account created! Welcome.");
      navigate("/");
    } catch {
      // handled by interceptor
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
      <div className="bg-white border border-ig-border rounded p-10 space-y-4">
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

      <div className="bg-white border border-ig-border rounded p-5 text-center text-sm">
        Have an account?{" "}
        <Link to="/login" className="text-ig-blue font-semibold hover:underline">
          Log in
        </Link>
      </div>
    </motion.div>
  );
}
