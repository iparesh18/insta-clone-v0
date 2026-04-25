/**
 * api/axios.js
 * Pre-configured axios instance with interceptors for
 * cookie-based auth and error handling.
 */

import axios from "axios";
import toast from "react-hot-toast";

const resolveApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL?.trim();

  if (!configured) {
    return "/api/v1";
  }

  const withoutTrailingSlash = configured.replace(/\/+$/, "");

  if (
    withoutTrailingSlash === "http://" ||
    withoutTrailingSlash === "https://"
  ) {
    console.warn("Invalid VITE_API_URL. Falling back to /api/v1.");
    return "/api/v1";
  }

  if (withoutTrailingSlash.startsWith("/")) {
    return withoutTrailingSlash;
  }

  if (!/^https?:\/\//i.test(withoutTrailingSlash)) {
    console.warn("VITE_API_URL must start with http:// or https://. Falling back to /api/v1.");
    return "/api/v1";
  }

  try {
    new URL(withoutTrailingSlash);
  } catch {
    console.warn("Invalid VITE_API_URL format. Falling back to /api/v1.");
    return "/api/v1";
  }

  if (withoutTrailingSlash.endsWith("/api/v1")) {
    return withoutTrailingSlash;
  }

  return `${withoutTrailingSlash}/api/v1`;
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  timeout: 300000, // 5 minutes for large file uploads
});

// Response interceptor — handles auth failures by redirecting to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    const message =
      error.response?.data?.message || "Something went wrong";

    // Don't toast on 401 (handled above) or on canceled requests
    if (error.response?.status !== 401 && !axios.isCancel(error)) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
