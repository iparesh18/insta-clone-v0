/**
 * api/services.js - FIXED v2
 * Fixed: getUserPosts correctly passes userId in path.
 */

import api from "./axios";

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
};

export const userAPI = {
  getProfile: (username) => api.get(`/users/${username}`),
  updateProfile: (formData) =>
    api.put("/users/me", formData),
  deleteAccount: () => api.delete("/users/me"),
  searchUsers: (q, limit = 20) =>
    api.get(`/users/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  follow: (id) => api.post(`/users/${id}/follow`),
  unfollow: (id) => api.delete(`/users/${id}/follow`),
  getFollowers: (id, cursor) =>
    api.get(`/users/${id}/followers${cursor ? `?cursor=${cursor}` : ""}`),
  getFollowing: (id, cursor) =>
    api.get(`/users/${id}/following${cursor ? `?cursor=${cursor}` : ""}`),
  getFollowRequests: () => api.get("/users/follow-requests"),
  acceptRequest: (id) => api.post(`/users/follow-requests/${id}/accept`),
  rejectRequest: (id) => api.post(`/users/follow-requests/${id}/reject`),
};

export const postAPI = {
  create: (formData) =>
    api.post("/posts", formData),
  getFeed: (cursor) =>
    api.get(`/posts/feed${cursor ? `?cursor=${cursor}` : ""}`),
  getPost: (id) => api.get(`/posts/${id}`),
  getSaved: (cursor) =>
    api.get(`/posts/saved${cursor ? `?cursor=${cursor}` : ""}`),
  delete: (id) => api.delete(`/posts/${id}`),
  toggleLike: (id) => api.post(`/posts/${id}/like`),
  toggleSave: (id) => api.post(`/posts/${id}/save`),
  getLikes: (id, cursor) =>
    api.get(`/posts/${id}/likes${cursor ? `?cursor=${cursor}` : ""}`),
  getComments: (id, cursor) =>
    api.get(`/posts/${id}/comments${cursor ? `?cursor=${cursor}` : ""}`),
  addComment: (id, text) => api.post(`/posts/${id}/comments`, { text }),
  deleteComment: (id, commentId) => api.delete(`/posts/${id}/comments/${commentId}`),
  // FIXED: userId is required in the path
  getUserPosts: (userId, cursor) =>
    api.get(`/posts/user/${userId}${cursor ? `?cursor=${cursor}` : ""}`),
};

export const reelAPI = {
  create: (formData) => {
    console.log("📤 Calling POST /reels with FormData");
    return api.post("/reels", formData).then(response => {
      console.log("✅ POST /reels response:", response);
      return response;
    }).catch(error => {
      console.error("❌ POST /reels error:", error);
      throw error;
    });
  },
  getFeed: (cursor) =>
    api.get(`/reels/feed${cursor ? `?cursor=${cursor}` : ""}`),
  getReel: (id) => api.get(`/reels/${id}`),
  getUserReels: (userId, cursor) =>
    api.get(`/reels/user/${userId}${cursor ? `?cursor=${cursor}` : ""}`),
  registerView: (id) => api.post(`/reels/${id}/view`),
  toggleLike: (id) => api.post(`/reels/${id}/like`),
  delete: (id) => api.delete(`/reels/${id}`),
  getComments: (id, cursor) =>
    api.get(`/reels/${id}/comments${cursor ? `?cursor=${cursor}` : ""}`),
  addComment: (id, text) => api.post(`/reels/${id}/comments`, { text }),
  deleteComment: (id, commentId) => api.delete(`/reels/${id}/comments/${commentId}`),
};

export const storyAPI = {
  create: (formData) =>
    api.post("/stories", formData),
  getFeed: () => api.get("/stories/feed"),
  view: (id) => api.post(`/stories/${id}/view`),
  delete: (id) => api.delete(`/stories/${id}`),
};

export const chatAPI = {
  getConversations: () => api.get("/chat/conversations"),
  getMessages: (userId, cursor) =>
    api.get(`/chat/${userId}${cursor ? `?cursor=${cursor}` : ""}`),
  sendMessage: (userId, data) => api.post(`/chat/${userId}`, data),
  markAsRead: (userId) => api.patch(`/chat/${userId}/read`),
  deleteMessage: (messageId) => api.delete(`/chat/${messageId}`),
};

export const shareAPI = {
  getFollowers: (cursor) =>
    api.get(`/share/followers${cursor ? `?cursor=${cursor}` : ""}`),
  sharePost: (postId, data) => api.post(`/share/posts/${postId}`, data),
  shareReel: (reelId, data) => api.post(`/share/reels/${reelId}`, data),
  getSharedPosts: (cursor) =>
    api.get(`/share/posts${cursor ? `?cursor=${cursor}` : ""}`),
  getSharedReels: (cursor) =>
    api.get(`/share/reels${cursor ? `?cursor=${cursor}` : ""}`),
  markAsRead: (shareId) => api.patch(`/share/${shareId}/read`),
};
