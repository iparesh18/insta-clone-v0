/**
 * api/axios.js
 * Pre-configured axios instance with interceptors for
 * cookie-based auth and error handling.
 */

import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: "/api/v1",
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
