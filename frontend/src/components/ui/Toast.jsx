/**
 * components/ui/Toast.jsx
 * Global toast notification component with auto-dismiss
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, MessageCircle } from "lucide-react";
import useNotificationStore from "@/store/notificationStore";

function ToastItem({ toast }) {
  const removeToast = useNotificationStore((s) => s.removeToast);

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
      case "newMessage":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "info":
      case "newMessage":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getTextColor = () => {
    switch (toast.type) {
      case "success":
        return "text-green-800";
      case "error":
        return "text-red-800";
      case "info":
      case "newMessage":
        return "text-blue-800";
      default:
        return "text-gray-800";
    }
  };

  const getMessage = () => {
    if (toast.type === "newMessage") {
      return `New message from ${toast.username}`;
    }
    return toast.message;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -20, x: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
                   ${getBackgroundColor()} ${getTextColor()}`}
    >
      {getIcon()}

      <div className="flex-1">
        <p className="text-sm font-medium">{getMessage()}</p>
        {toast.submessage && (
          <p className="text-xs opacity-75 mt-1">{toast.submessage}</p>
        )}
      </div>

      <button
        onClick={() => removeToast(toast.id)}
        className="ml-2 p-1 hover:bg-black/10 rounded-full transition-colors
                   flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const toasts = useNotificationStore((s) => s.toasts);

  return (
    <div
      className="fixed top-4 right-4 z-50 pointer-events-none
                 flex flex-col gap-2 max-w-sm"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
