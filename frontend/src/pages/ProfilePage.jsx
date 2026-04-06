import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { Grid, Film, Bookmark, Lock } from "lucide-react";
import { userAPI, postAPI, reelAPI } from "@/api/services";
import Avatar from "@/components/ui/Avatar";
import PostDetailModal from "@/components/post/PostDetailModal";
import ReelModal from "@/components/reel/ReelModal";
import useAuthStore from "@/store/authStore";
import useReelsStore from "@/store/reelsStore";
import usePostsStore from "@/store/postsStore";
import toast from "react-hot-toast";

function UserListModal({ title, users, loading, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-ig-border flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button className="text-sm text-ig-gray" onClick={onClose}>Close</button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-sm text-ig-gray">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-sm text-ig-gray">No users found.</div>
          ) : (
            users.map((item) => (
              <Link
                key={item._id}
                to={`/${item.username}`}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 hover:bg-ig-hover"
              >
                <Avatar src={item.profilePicture?.url} alt={item.username} size="sm" />
                <div>
                  <p className="text-sm font-semibold">{item.username}</p>
                  {item.fullName && <p className="text-xs text-ig-gray">{item.fullName}</p>}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EditProfileModal({ profile, onClose, onUpdated }) {
  const [form, setForm] = useState({
    fullName: profile.fullName || "",
    bio: profile.bio || "",
    website: profile.website || "",
    isPrivate: !!profile.isPrivate,
  });
  const [avatar, setAvatar] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("fullName", form.fullName);
      formData.append("bio", form.bio);
      formData.append("website", form.website);
      formData.append("isPrivate", String(form.isPrivate));
      if (avatar) formData.append("avatar", avatar);

      const { data } = await userAPI.updateProfile(formData);
      onUpdated(data.data.user);
      toast.success("Profile updated");
      onClose();
    } catch {
      // handled by axios interceptor
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        className="bg-white w-full max-w-md rounded-xl overflow-hidden"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-ig-border flex items-center justify-between">
          <h3 className="font-semibold">Edit profile</h3>
          <button type="button" className="text-sm text-ig-gray" onClick={onClose}>Close</button>
        </div>

        <div className="p-4 space-y-3">
          <label className="block text-sm font-medium">Avatar</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatar(e.target.files?.[0] || null)}
            className="text-sm"
          />

          <label className="block text-sm font-medium">Full name</label>
          <input
            className="ig-input"
            value={form.fullName}
            onChange={(e) => setForm((v) => ({ ...v, fullName: e.target.value }))}
          />

          <label className="block text-sm font-medium">Bio</label>
          <textarea
            className="ig-input min-h-20"
            value={form.bio}
            onChange={(e) => setForm((v) => ({ ...v, bio: e.target.value }))}
            maxLength={150}
          />

          <label className="block text-sm font-medium">Website</label>
          <input
            className="ig-input"
            value={form.website}
            onChange={(e) => setForm((v) => ({ ...v, website: e.target.value }))}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPrivate}
              onChange={(e) => setForm((v) => ({ ...v, isPrivate: e.target.checked }))}
            />
            Private account
          </label>
        </div>

        <div className="p-4 border-t border-ig-border">
          <button className="ig-btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me } = useAuthStore();
  const { initializeSavedPosts, addSavedPost } = usePostsStore();

  const [profile, setProfile] = useState(null);
  const [followStatus, setFollowStatus] = useState(null);
  const [canViewContent, setCanViewContent] = useState(true);

  const [posts, setPosts] = useState([]);
  const [postCursor, setPostCursor] = useState(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [savedPosts, setSavedPosts] = useState([]);
  const [savedCursor, setSavedCursor] = useState(null);
  const [hasMoreSaved, setHasMoreSaved] = useState(true);
  const [reels, setReels] = useState([]);
  const [reelCursor, setReelCursor] = useState(null);
  const [hasMoreReels, setHasMoreReels] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [tab, setTab] = useState("posts");

  const [showEdit, setShowEdit] = useState(false);
  const [activePostId, setActivePostId] = useState(null);
  const [selectedReel, setSelectedReel] = useState(null);
  const [modalType, setModalType] = useState(null); // followers | following
  const [modalUsers, setModalUsers] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const [followRequests, setFollowRequests] = useState([]);

  const isOwn = me?.username === username;
  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 });

  const effectiveCanView = useMemo(() => {
    if (!profile) return false;
    if (isOwn) return true;
    if (!profile.isPrivate) return true;
    return canViewContent || followStatus === "accepted";
  }, [profile, isOwn, canViewContent, followStatus]);

  useEffect(() => {
    setProfile(null);
    setPosts([]);
    setPostCursor(null);
    setHasMorePosts(true);
    setSavedPosts([]);
    setSavedCursor(null);
    setHasMoreSaved(true);
    setProfileLoading(true);
    setFollowRequests([]);

    userAPI
      .getProfile(username)
      .then(({ data }) => {
        setProfile(data.data.user);
        setFollowStatus(data.data.followStatus);
        setCanViewContent(!!data.data.canViewContent);
      })
      .catch(() => toast.error("Profile not found"))
      .finally(() => setProfileLoading(false));
  }, [username]);

  const fetchPosts = useCallback(async () => {
    if (!profile?._id || postsLoading || !hasMorePosts || !effectiveCanView) return;
    setPostsLoading(true);
    try {
      const { data } = await postAPI.getUserPosts(profile._id, postCursor);
      const newPosts = data.data.posts;
      setPosts((prev) => (postCursor ? [...prev, ...newPosts] : newPosts));
      setPostCursor(data.pagination.nextCursor);
      setHasMorePosts(data.pagination.hasMore);
    } catch {
      setHasMorePosts(false);
    } finally {
      setPostsLoading(false);
    }
  }, [profile?._id, postCursor, postsLoading, hasMorePosts, effectiveCanView]);

  const fetchSavedPosts = useCallback(async () => {
    if (!isOwn || postsLoading || !hasMoreSaved) return;
    setPostsLoading(true);
    try {
      const { data } = await postAPI.getSaved(savedCursor);
      const newPosts = data.data.posts || [];
      
      // Initialize or add to saved posts in store
      if (!savedCursor) {
        const savedPostIds = newPosts.map(p => p._id);
        initializeSavedPosts(savedPostIds);
      } else {
        newPosts.forEach(p => addSavedPost(p._id));
      }
      
      setSavedPosts((prev) => (savedCursor ? [...prev, ...newPosts] : newPosts));
      setSavedCursor(data.data.pagination?.nextCursor || data.pagination?.nextCursor || null);
      setHasMoreSaved(data.data.pagination?.hasMore ?? data.pagination?.hasMore ?? false);
    } catch {
      setHasMoreSaved(false);
    } finally {
      setPostsLoading(false);
    }
  }, [isOwn, postsLoading, hasMoreSaved, savedCursor, initializeSavedPosts, addSavedPost]);

  const fetchUserReels = useCallback(async () => {
    if (!profile?._id || postsLoading || !hasMoreReels || !effectiveCanView) return;
    setPostsLoading(true);
    try {
      const { data } = await reelAPI.getUserReels(profile._id, reelCursor);
      const newReels = data.data.reels || [];
      setReels((prev) => (reelCursor ? [...prev, ...newReels] : newReels));
      setReelCursor(data.pagination?.nextCursor);
      setHasMoreReels(data.pagination?.hasMore ?? false);
    } catch {
      setHasMoreReels(false);
    } finally {
      setPostsLoading(false);
    }
  }, [profile?._id, reelCursor, postsLoading, hasMoreReels, effectiveCanView]);

  useEffect(() => {
    if (profile?._id && tab === "posts") fetchPosts();
  }, [profile?._id, tab]);

  useEffect(() => {
    if (tab === "saved" && isOwn && savedPosts.length === 0) {
      fetchSavedPosts();
    }
  }, [tab, isOwn]);

  useEffect(() => {
    if (inView && !profileLoading && tab === "posts") fetchPosts();
  }, [inView]);

  useEffect(() => {
    if (inView && !profileLoading && tab === "saved") fetchSavedPosts();
  }, [inView, tab]);

  useEffect(() => {
    if (profile?._id && tab === "reels" && reels.length === 0) {
      fetchUserReels();
    }
  }, [profile?._id, tab]);

  useEffect(() => {
    if (inView && !profileLoading && tab === "reels") fetchUserReels();
  }, [inView, tab]);

  useEffect(() => {
    if (!isOwn || !profile?.isPrivate) return;
    userAPI
      .getFollowRequests()
      .then(({ data }) => setFollowRequests(data.data.requests || []))
      .catch(() => setFollowRequests([]));
  }, [isOwn, profile?.isPrivate]);

  const openConnectionsModal = async (type) => {
    if (!profile?._id) return;
    setModalType(type);
    setModalUsers([]);
    setModalLoading(true);
    try {
      const res =
        type === "followers"
          ? await userAPI.getFollowers(profile._id)
          : await userAPI.getFollowing(profile._id);

      const users = type === "followers" ? res.data.data.followers : res.data.data.following;
      setModalUsers(users || []);
    } catch {
      setModalUsers([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!profile) return;
    try {
      if (followStatus === "accepted") {
        await userAPI.unfollow(profile._id);
        setFollowStatus(null);
        setCanViewContent(false);
        setProfile((p) => ({ ...p, followerCount: Math.max(0, p.followerCount - 1) }));
      } else if (followStatus === "pending") {
        await userAPI.unfollow(profile._id);
        setFollowStatus(null);
      } else {
        const { data } = await userAPI.follow(profile._id);
        const status = data.data.status;
        setFollowStatus(status);
        if (status === "accepted") {
          setCanViewContent(true);
          setProfile((p) => ({ ...p, followerCount: p.followerCount + 1 }));
        }
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleAcceptRequest = async (followerId) => {
    try {
      await userAPI.acceptRequest(followerId);
      setFollowRequests((prev) => prev.filter((r) => String(r.follower._id) !== String(followerId)));
      setProfile((p) => ({ ...p, followerCount: p.followerCount + 1 }));
      toast.success("Follow request accepted");
    } catch {
      // handled by interceptor
    }
  };

  const handleRejectRequest = async (followerId) => {
    try {
      await userAPI.rejectRequest(followerId);
      setFollowRequests((prev) => prev.filter((r) => String(r.follower._id) !== String(followerId)));
      toast.success("Follow request rejected");
    } catch {
      // handled by interceptor
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-ig-border border-t-ig-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="font-semibold text-xl">User not found</p>
        <p className="text-ig-gray text-sm mt-2">This account does not exist.</p>
      </div>
    );
  }

  const followBtnLabel =
    followStatus === "accepted" ? "Following" : followStatus === "pending" ? "Requested" : "Follow";

  const followBtnClass =
    followStatus === "accepted" || followStatus === "pending"
      ? "py-1.5 px-5 rounded-lg text-sm font-semibold bg-ig-hover text-ig-dark border border-ig-border transition-colors hover:bg-red-50 hover:text-red-500 hover:border-red-200"
      : "py-1.5 px-5 rounded-lg text-sm font-semibold bg-ig-blue text-white hover:bg-blue-600 transition-colors";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-12 mb-10"
      >
        <Avatar
          src={profile.profilePicture?.url}
          alt={profile.username}
          size="2xl"
          className="flex-shrink-0"
        />

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-4">
            <h1 className="text-xl">{profile.username}</h1>
            {profile.isBlueVerified && <span className="text-ig-blue text-sm">✓</span>}
            {isOwn ? (
              <button className="ig-btn-outline text-sm px-4 py-1.5" onClick={() => setShowEdit(true)}>
                Edit profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleFollowToggle} className={followBtnClass}>
                  {followBtnLabel}
                </button>
                <Link to={`/chat/${profile._id}`} className="ig-btn-outline text-sm">
                  Message
                </Link>
              </div>
            )}
          </div>

          <div className="flex justify-center sm:justify-start gap-8 mb-4">
            <div className="text-sm">
              <strong>{profile.postCount?.toLocaleString() || 0}</strong> posts
            </div>
            <button className="text-sm hover:opacity-70" onClick={() => openConnectionsModal("followers")}>
              <strong>{profile.followerCount?.toLocaleString() || 0}</strong> followers
            </button>
            <button className="text-sm hover:opacity-70" onClick={() => openConnectionsModal("following")}>
              <strong>{profile.followingCount?.toLocaleString() || 0}</strong> following
            </button>
          </div>

          <div className="text-sm">
            {profile.fullName && <p className="font-semibold">{profile.fullName}</p>}
            {profile.bio && <p className="whitespace-pre-line text-ig-dark mt-1">{profile.bio}</p>}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ig-blue hover:underline block mt-1"
              >
                {profile.website}
              </a>
            )}
            {profile.isPrivate && (
              <p className="mt-2 text-xs text-ig-gray inline-flex items-center gap-1">
                <Lock size={12} /> Private account
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {isOwn && profile.isPrivate && followRequests.length > 0 && (
        <div className="border border-ig-border rounded-xl p-4 mb-6">
          <p className="font-semibold text-sm mb-3">Follow requests</p>
          <div className="space-y-3">
            {followRequests.map((req) => (
              <div key={req._id} className="flex items-center justify-between gap-3">
                <Link to={`/${req.follower.username}`} className="flex items-center gap-3">
                  <Avatar src={req.follower.profilePicture?.url} alt={req.follower.username} size="sm" />
                  <div>
                    <p className="text-sm font-semibold">{req.follower.username}</p>
                    {req.follower.fullName && <p className="text-xs text-ig-gray">{req.follower.fullName}</p>}
                  </div>
                </Link>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 text-xs font-semibold bg-ig-blue text-white rounded"
                    onClick={() => handleAcceptRequest(req.follower._id)}
                  >
                    Accept
                  </button>
                  <button
                    className="px-3 py-1 text-xs font-semibold bg-ig-hover text-ig-dark rounded"
                    onClick={() => handleRejectRequest(req.follower._id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-ig-border flex justify-center gap-12 mb-1">
        {[
          { id: "posts", icon: Grid, label: "POSTS" },
          { id: "reels", icon: Film, label: "REELS" },
          ...(isOwn ? [{ id: "saved", icon: Bookmark, label: "SAVED" }] : []),
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 py-3 border-t-2 text-xs font-semibold tracking-wider -mt-px transition-colors ${
              tab === id ? "border-ig-dark text-ig-dark" : "border-transparent text-ig-gray hover:text-ig-dark"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "posts" && !effectiveCanView && (
        <div className="text-center py-16">
          <Lock className="mx-auto mb-2" size={28} />
          <p className="font-semibold text-lg">This account is private</p>
          <p className="text-ig-gray text-sm mt-1">Follow this account to see posts.</p>
        </div>
      )}

      {tab === "posts" && effectiveCanView && (
        <>
          {posts.length === 0 && !postsLoading ? (
            <div className="text-center py-16">
              <p className="font-semibold text-lg">No posts yet</p>
              {isOwn && <p className="text-ig-gray text-sm mt-1">Share your first photo or video.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-px">
              {posts.map((post, i) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="aspect-square bg-ig-border overflow-hidden cursor-pointer hover:brightness-90 transition-all relative"
                  onClick={() => setActivePostId(post._id)}
                >
                  {post.media[0]?.type === "video" ? (
                    <video src={post.media[0]?.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={post.media[0]?.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center gap-4 text-white opacity-0 hover:opacity-100">
                    <span className="text-sm font-semibold">♥ {post.likeCount || 0}</span>
                    <span className="text-sm font-semibold">💬 {post.commentCount || 0}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {hasMorePosts && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              {postsLoading && (
                <div className="w-6 h-6 border-2 border-ig-border border-t-ig-blue rounded-full animate-spin" />
              )}
            </div>
          )}
        </>
      )}

      {tab === "reels" && (
        <>
          {reels.length === 0 && !postsLoading ? (
            <div className="text-center py-16 text-ig-gray">
              <p className="font-semibold">No reels yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-px">
              {reels.map((reel, i) => (
                <motion.div
                  key={reel._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedReel(reel)}
                  className="aspect-[9/16] bg-black relative group cursor-pointer overflow-hidden"
                >
                  <video
                    src={reel.video?.url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  ></video>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <svg className="w-6 h-6 text-white fill-white" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {hasMoreReels && (
            <div ref={sentinelRef} className="py-8 text-center">
              {postsLoading && (
                <div className="w-6 h-6 border-2 border-ig-border border-t-ig-blue rounded-full animate-spin mx-auto" />
              )}
            </div>
          )}
        </>
      )}

      {tab === "saved" && isOwn && (
        <>
          {savedPosts.length === 0 && !postsLoading ? (
            <div className="text-center py-16">
              <p className="font-semibold text-lg">No saved posts</p>
              <p className="text-ig-gray text-sm mt-1">Posts you save will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-px">
              {savedPosts.map((post, i) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="aspect-square bg-ig-border overflow-hidden cursor-pointer hover:brightness-90 transition-all relative"
                  onClick={() => setActivePostId(post._id)}
                >
                  {post.media?.[0]?.type === "video" ? (
                    <video src={post.media?.[0]?.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={post.media?.[0]?.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {hasMoreSaved && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              {postsLoading && (
                <div className="w-6 h-6 border-2 border-ig-border border-t-ig-blue rounded-full animate-spin" />
              )}
            </div>
          )}
        </>
      )}

      {showEdit && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onUpdated={(u) => setProfile((prev) => ({ ...prev, ...u }))}
        />
      )}

      {modalType && (
        <UserListModal
          title={modalType === "followers" ? "Followers" : "Following"}
          users={modalUsers}
          loading={modalLoading}
          onClose={() => setModalType(null)}
        />
      )}

      {activePostId && (
        <PostDetailModal postId={activePostId} onClose={() => setActivePostId(null)} />
      )}

      {selectedReel && (
        <ReelModal reel={selectedReel} onClose={() => setSelectedReel(null)} />
      )}
    </div>
  );
}
