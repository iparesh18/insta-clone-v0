import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, X } from "lucide-react";
import { postAPI } from "@/api/services";
import Avatar from "@/components/ui/Avatar";
import useAuthStore from "@/store/authStore";

export default function PostDetailModal({ postId, onClose }) {
  const { user } = useAuthStore();
  const [post, setPost] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [postRes, likesRes, commentsRes] = await Promise.all([
          postAPI.getPost(postId),
          postAPI.getLikes(postId),
          postAPI.getComments(postId),
        ]);

        if (!mounted) return;

        const p = postRes.data.data.post;
        const postLiked = !!postRes.data.data.isLiked;
        const likeUsers = likesRes.data.data.users || [];
        const commentRows = commentsRes.data.data.comments || [];

        setPost(p);
        setLiked(postLiked);
        setLikeCount(typeof p.likeCount === "number" ? p.likeCount : likeUsers.length);
        setLikes(likeUsers);
        setComments(commentRows);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [postId]);

  const currentMedia = useMemo(() => post?.media?.[0], [post]);

  const handleToggleLike = async () => {
    if (!post) return;
    const wasLiked = liked;
    const optimisticCount = wasLiked ? Math.max(0, likeCount - 1) : likeCount + 1;
    setLiked(!wasLiked);
    setLikeCount(optimisticCount);

    try {
      const likeRes = await postAPI.toggleLike(post._id);
      const likedFromApi = !!likeRes.data.data?.liked;
      const countFromApi =
        typeof likeRes.data.data?.likeCount === "number"
          ? likeRes.data.data.likeCount
          : optimisticCount;
      setLiked(likedFromApi);
      setLikeCount(countFromApi);
      const likesRes = await postAPI.getLikes(post._id);
      setLikes(likesRes.data.data.users || []);
    } catch {
      setLiked(wasLiked);
      setLikeCount(likeCount);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || !post) return;

    setSubmitting(true);
    try {
      const { data } = await postAPI.addComment(post._id, text);
      setComments((prev) => [data.data.comment, ...prev]);
      setPost((prev) => ({ ...prev, commentCount: (prev.commentCount || 0) + 1 }));
      setCommentText("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!post) return;

    const prevComments = comments;
    setComments((prev) => prev.filter((c) => String(c._id) !== String(commentId)));
    setPost((prev) => ({ ...prev, commentCount: Math.max(0, (prev.commentCount || 1) - 1) }));

    try {
      await postAPI.deleteComment(post._id, commentId);
    } catch {
      setComments(prevComments);
      setPost((prev) => ({ ...prev, commentCount: (prev.commentCount || 0) + 1 }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border">
          <h3 className="font-semibold">Post</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-ig-gray">Loading...</div>
        ) : !post ? (
          <div className="p-10 text-center text-sm text-ig-gray">Post not found.</div>
        ) : (
          <div className="grid md:grid-cols-[1fr_420px]">
            <div className="bg-black min-h-[420px] flex items-center justify-center">
              {currentMedia?.type === "video" ? (
                <video src={currentMedia?.url} className="w-full h-full object-contain" controls playsInline />
              ) : (
                <img src={currentMedia?.url} alt="Post" className="w-full h-full object-contain" />
              )}
            </div>

            <div className="flex flex-col h-[75vh]">
              <div className="p-4 border-b border-ig-border flex items-center gap-3">
                <Avatar src={post.author?.profilePicture?.url} alt={post.author?.username} size="sm" />
                <Link to={`/${post.author?.username}`} className="text-sm font-semibold">{post.author?.username}</Link>
              </div>

              <div className="p-4 border-b border-ig-border">
                <button onClick={handleToggleLike} className="inline-flex items-center gap-2 text-sm font-semibold">
                  <Heart size={18} className={liked ? "fill-red-500 text-red-500" : "text-ig-dark"} />
                  {likeCount} likes
                </button>
                <div className="mt-3">
                  <p className="text-xs text-ig-gray mb-2">Liked by</p>
                  <div className="max-h-24 overflow-y-auto space-y-2">
                    {likes.length === 0 ? (
                      <p className="text-xs text-ig-gray">No likes yet</p>
                    ) : (
                      likes.map((u) => (
                        <Link key={u._id} to={`/${u.username}`} className="flex items-center gap-2 text-sm">
                          <Avatar src={u.profilePicture?.url} alt={u.username} size="xs" />
                          <span>{u.username}</span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 flex-1 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
                  <MessageCircle size={16} />
                  Comments ({post.commentCount || 0})
                </div>
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-ig-gray">No comments yet.</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c._id} className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                        <Avatar src={c.author?.profilePicture?.url} alt={c.author?.username} size="xs" />
                        <p className="text-sm">
                          <Link to={`/${c.author?.username}`} className="font-semibold mr-1">{c.author?.username}</Link>
                          {c.text}
                        </p>
                        </div>
                        {String(c.author?._id) === String(user?._id) && (
                          <button
                            className="text-xs text-red-500 hover:underline"
                            onClick={() => handleDeleteComment(c._id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form onSubmit={handleAddComment} className="p-4 border-t border-ig-border flex gap-2">
                <input
                  className="ig-input text-sm"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button className="text-ig-blue text-sm font-semibold" disabled={submitting || !commentText.trim()}>
                  Post
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
