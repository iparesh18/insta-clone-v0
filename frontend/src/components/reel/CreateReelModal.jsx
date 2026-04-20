import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Clapperboard, X } from "lucide-react";
import toast from "react-hot-toast";
import { reelAPI } from "@/api/services";

const STEPS = { SELECT: 0, DETAILS: 1, POSTING: 2 };

export default function CreateReelModal({ onClose, onCreated }) {
  const [step, setStep] = useState(STEPS.SELECT);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setStep(STEPS.DETAILS);
  };

  const handleSubmit = async () => {
    if (!videoFile) return;

    setLoading(true);
    setStep(STEPS.POSTING);
    try {
      const fd = new FormData();
      fd.append("video", videoFile);
      fd.append("caption", caption);

      const { data } = await reelAPI.create(fd);
      console.log("📱 Reel creation response full:", data);
      console.log("📱 data.data:", data.data);
      console.log("📱 data.data?.reel:", data.data?.reel);
      
      if (!data.data?.reel) {
        console.error("❌ No reel in response!");
        throw new Error("No reel returned from server");
      }
      
      const createdReel = data.data.reel;
      console.log("🎥 Calling onCreated with reel:", createdReel);
      onCreated?.(createdReel);
      
      toast.success("Reel uploaded!");
      onClose();
    } catch (error) {
      console.error("Reel creation error:", error);
      console.error("Error response:", error?.response?.data);
      setStep(STEPS.DETAILS);
      if (!error?.response?.data?.message) {
        toast.error(error.message || "Failed to upload reel");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-ig-dark rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border">
            {step === STEPS.DETAILS ? (
              <button onClick={() => setStep(STEPS.SELECT)}>
                <ArrowLeft size={20} />
              </button>
            ) : (
              <div className="w-6" />
            )}

            <span className="font-semibold text-sm">
              {step === STEPS.SELECT ? "Create reel" : step === STEPS.POSTING ? "Uploading..." : "Reel details"}
            </span>

            {step === STEPS.DETAILS ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="text-ig-blue text-sm font-semibold disabled:opacity-50"
              >
                Share
              </button>
            ) : (
              <button onClick={onClose}>
                <X size={20} />
              </button>
            )}
          </div>

          {step === STEPS.SELECT && (
            <div
              className="flex flex-col items-center justify-center py-16 gap-4 cursor-pointer hover:bg-ig-bg"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
            >
              <Clapperboard size={48} className="text-ig-gray" />
              <p className="text-lg">Drag a video here</p>
              <button className="ig-btn-primary max-w-xs text-sm">Select video</button>
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}

          {step === STEPS.DETAILS && (
            <div className="flex flex-col md:flex-row max-h-[70vh]">
              <div className="w-full md:w-64 aspect-[9/16] bg-black flex-shrink-0">
                <video src={videoPreview} className="w-full h-full object-cover" controls muted />
              </div>
              <div className="flex-1 p-4 space-y-3">
                <textarea
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={2200}
                  rows={6}
                  className="w-full resize-none text-sm focus:outline-none"
                />
                <p className="text-xs text-ig-gray text-right">{caption.length}/2,200</p>
              </div>
            </div>
          )}

          {step === STEPS.POSTING && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-ig-border border-t-ig-blue rounded-full animate-spin" />
              <p className="text-sm text-ig-gray">Uploading your reel...</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}



