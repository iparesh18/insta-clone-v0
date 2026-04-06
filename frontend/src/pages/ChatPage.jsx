/**
 * pages/ChatPage.jsx
 * Real-time one-to-one chat using Socket.io.
 */

import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Check, CheckCheck, Circle } from "lucide-react";
import { chatAPI } from "@/api/services";
import useAuthStore from "@/store/authStore";
import useSocketStore from "@/store/socketStore";
import useNotificationStore from "@/store/notificationStore";
import Avatar from "@/components/ui/Avatar";
import { formatDistanceToNow } from "@/utils/date";

export default function ChatPage() {
  const { userId } = useParams();
  const { user: me } = useAuthStore();
  const { socket } = useSocketStore();
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const setChatActivity = useNotificationStore((s) => s.setChatActivity);
  const clearChatActivity = useNotificationStore((s) => s.clearChatActivity);
  const setUserOnlineStatus = useNotificationStore((s) => s.setUserOnlineStatus);
  const getUserOnlineStatus = useNotificationStore((s) => s.getUserOnlineStatus);

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userOnline, setUserOnline] = useState(false);
  const [userLastSeen, setUserLastSeen] = useState(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  // Load conversations list
  useEffect(() => {
    chatAPI.getConversations().then(({ data }) =>
      setConversations(data.data.conversations)
    ).catch(() => {});
  }, []);

  // Set chat activity when entering/leaving conversation
  useEffect(() => {
    if (userId) {
      setChatActivity(userId);
    } else {
      clearChatActivity();
    }
    
    return () => {
      clearChatActivity();
    };
  }, [userId, setChatActivity, clearChatActivity]);

  // Load messages for selected conversation AND mark notifications as read
  useEffect(() => {
    if (!userId) return;
    chatAPI.getMessages(userId).then(({ data }) => {
      setMessages(data.data.messages);
      setOtherUser(data.data.otherUser || null);
    }).catch(() => {});
    chatAPI.markAsRead(userId).catch(() => {});
    
    // Mark notifications as read in global store
    markAsRead(userId);
  }, [userId, markAsRead]);

  // Update online status from notification store
  useEffect(() => {
    if (!userId) return;
    const status = getUserOnlineStatus(userId);
    setUserOnline(status.online);
    setUserLastSeen(status.lastSeen);
  }, [userId, getUserOnlineStatus]);

  // Socket events
  useEffect(() => {
    if (!socket || !userId) return;

    const handleReceive = (msg) => {
      if (msg.sender._id === userId || msg.sender === userId) {
        setMessages((prev) => [...prev, msg]);
        chatAPI.markAsRead(userId).catch(() => {});
        socket.emit("chat:read", { senderId: userId });
      }
    };

    const handleSent = (msg) => {
      setMessages((prev) => {
        const withoutOptimistic = [...prev].filter((m) => !m.optimistic);
        return [...withoutOptimistic, msg];
      });
    };

    const handleTyping = ({ senderId, isTyping: t }) => {
      if (senderId === userId) setIsTyping(t);
    };

    socket.on("chat:receive", handleReceive);
    socket.on("chat:sent", handleSent);
    socket.on("chat:typing", handleTyping);

    return () => {
      socket.off("chat:receive", handleReceive);
      socket.off("chat:sent", handleSent);
      socket.off("chat:typing", handleTyping);
    };
  }, [socket, userId]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const msgText = text.trim();
    setText("");

    // Optimistic message
    const optimistic = {
      _id: Date.now(),
      sender: { _id: me._id, username: me.username, profilePicture: me.profilePicture },
      text: msgText,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    if (socket?.connected) {
      socket.emit("chat:send", { receiverId: userId, text: msgText });
      return;
    }

    // REST fallback when socket is disconnected
    try {
      const { data } = await chatAPI.sendMessage(userId, { text: msgText });
      setMessages((prev) => {
        const withoutOptimistic = [...prev].filter((m) => !m.optimistic);
        return [...withoutOptimistic, data.data.message];
      });
    } catch {
      // noop: axios interceptor handles user-visible error
    }
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!socket) return;
    if (!typing) {
      setTyping(true);
      socket.emit("chat:typing", { receiverId: userId, isTyping: true });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setTyping(false);
      socket.emit("chat:typing", { receiverId: userId, isTyping: false });
    }, 1500);
  };

  // No conversation selected — show list
  if (!userId) {
    return (
      <div className="flex flex-col h-screen max-w-3xl mx-auto border-x border-ig-border">
        <div className="px-6 py-5 border-b border-ig-border">
          <h2 className="font-bold text-xl">{me?.username}</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-ig-gray">
              <p className="font-semibold text-lg text-ig-dark">Your messages</p>
              <p className="text-sm">Send private photos and messages to a friend.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <Link
                key={conv._id}
                to={`/chat/${conv.otherUser?._id}`}
                className="flex items-center gap-3 px-6 py-3 hover:bg-ig-hover transition-colors"
              >
                <Avatar src={conv.otherUser?.profilePicture?.url}
                        alt={conv.otherUser?.username} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{conv.otherUser?.username}</p>
                  <p className="text-xs text-ig-gray truncate">
                    {conv.lastMessage?.text || "Media"}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-ig-blue text-white text-xs
                                   flex items-center justify-center font-bold">
                    {conv.unreadCount}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto border-x border-ig-border">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-ig-border">
        <Link to="/chat" className="md:hidden">
          <ArrowLeft size={20} />
        </Link>
        {otherUser && (
          <>
            <Avatar src={otherUser.profilePicture?.url} alt={otherUser.username} size="sm" />
            <div className="flex-1">
              <p className="font-semibold text-sm">{otherUser.username}</p>
              {isTyping ? (
                <motion.p 
                  className="text-xs text-ig-gray flex items-center gap-1"
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                >
                  typing
                  <span className="flex gap-0.5">
                    <motion.span
                      animate={{ opacity: [0.4, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                      className="w-1 h-1 bg-ig-gray rounded-full"
                    />
                    <motion.span
                      animate={{ opacity: [0.4, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      className="w-1 h-1 bg-ig-gray rounded-full"
                    />
                    <motion.span
                      animate={{ opacity: [0.4, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      className="w-1 h-1 bg-ig-gray rounded-full"
                    />
                  </span>
                </motion.p>
              ) : (
                <p className="text-xs text-ig-gray flex items-center gap-1">
                  {userOnline ? (
                    <>
                      <Circle size={6} className="fill-green-500 text-green-500" />
                      Active now
                    </>
                  ) : userLastSeen ? (
                    <>
                      Active {formatDistanceToNow(new Date(userLastSeen))} ago
                    </>
                  ) : (
                    "Offline"
                  )}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMine = String(msg.sender?._id || msg.sender) === String(me?._id);
            return (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex ${isMine ? "flex-row-reverse" : "flex-row"} gap-2 items-end max-w-[70%]`}>
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm
                      ${isMine
                        ? "bg-ig-blue text-white rounded-br-sm"
                        : "bg-ig-hover text-ig-dark rounded-bl-sm"
                      } ${msg.optimistic ? "opacity-70" : ""}`}
                  >
                    {msg.text}
                  </div>
                  {/* Message status icons for my messages */}
                  {isMine && (
                    <div className="text-xs text-ig-gray">
                      {msg.optimistic ? (
                        <span>◌</span>
                      ) : msg.seen ? (
                        <CheckCheck size={14} className="text-blue-400" title="Seen" />
                      ) : msg.delivered ? (
                        <CheckCheck size={14} className="text-ig-gray" title="Delivered" />
                      ) : (
                        <Check size={14} className="text-ig-gray" title="Sent" />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-3 px-4 py-3 border-t border-ig-border"
      >
        <Avatar src={me?.profilePicture?.url} alt={me?.username} size="sm" />
        <input
          className="flex-1 border border-ig-border rounded-full px-4 py-2 text-sm
                     focus:outline-none focus:border-ig-gray"
          placeholder="Message…"
          value={text}
          onChange={handleTyping}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="text-ig-blue font-semibold text-sm disabled:opacity-40"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
