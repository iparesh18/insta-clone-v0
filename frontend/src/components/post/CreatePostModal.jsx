/**
 * components/post/CreatePostModal.jsx
 */

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImagePlus, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { postAPI } from "@/api/services";

const STEPS = { SELECT: 0, CAPTION: 1, POSTING: 2 };

export default function CreatePostModal({ onClose }) {
  const [step, setStep] = useState(STEPS.SELECT);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileRef = useRef();

  const handleFiles = (selected) => {
    const arr = Array.from(selected).slice(0, 10);
    setFiles(arr);
    setPreviews(arr.map((f) => URL.createObjectURL(f)));
    setStep(STEPS.CAPTION);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStep(STEPS.POSTING);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("media", f));
      fd.append("caption", caption);
      fd.append("location", location);
      await postAPI.create(fd);
      toast.success("Post shared!");
      onClose();
    } catch {
      setStep(STEPS.CAPTION);
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });

  const handleGenerateCaption = async () => {
    if (!files.length) return;

    setGenerating(true);
    try {
      const mediaType = files.length > 1 ? "carousel" : files[0]?.type?.startsWith("video") ? "video" : "image";
      let base64ImageFile = "";
      let mimeType = "image/jpeg";

      const firstFile = files[0];
      if (firstFile && firstFile.type?.startsWith("image/")) {
        base64ImageFile = await fileToBase64(firstFile);
        mimeType = firstFile.type;
      }

      const response = await postAPI.generateCaption({
        prompt: caption,
        location,
        mediaType,
        base64ImageFile,
        mimeType,
      });

      const fullCaption = response?.data?.data?.fullCaption || "";
      setCaption(fullCaption);
      toast.success("Caption generated");
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to generate caption";
      toast.error(message);
    } finally {
      setGenerating(false);
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
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-ig-dark rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border">
            {step === STEPS.CAPTION ? (
              <button onClick={() => setStep(STEPS.SELECT)}>
                <ArrowLeft size={20} />
              </button>
            ) : (
              <div className="w-6" />
            )}
            <span className="font-semibold text-sm">
              {step === STEPS.SELECT ? "Create new post" : step === STEPS.POSTING ? "Sharing…" : "New post"}
            </span>
            {step === STEPS.CAPTION ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="text-ig-blue text-sm font-semibold disabled:opacity-50"
              >
                Share
              </button>
            ) : (
              <button onClick={onClose}><X size={20} /></button>
            )}
          </div>

          {/* Body */}
          {step === STEPS.SELECT && (
            <div
              className="flex flex-col items-center justify-center py-20 gap-4
                         cursor-pointer hover:bg-ig-bg transition-colors"
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
            >
              <ImagePlus size={48} className="text-ig-gray" />
              <p className="text-xl">Drag photos and videos here</p>
              <button className="ig-btn-primary max-w-xs text-sm">
                Select from computer
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          )}

          {step === STEPS.CAPTION && (
            <div className="flex flex-col md:flex-row max-h-[70vh]">
              {/* Preview */}
              <div className="w-full md:w-64 aspect-square bg-black flex-shrink-0">
                {files[0]?.type?.startsWith("video") ? (
                  <video
                    src={previews[0]}
                    className="w-full h-full object-cover"
                    controls
                    muted
                  />
                ) : (
                  <img
                    src={previews[0]}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {/* Caption form */}
              <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
                <button
                  type="button"
                  onClick={handleGenerateCaption}
                  disabled={generating || loading}
                  className="self-start px-3 py-1.5 rounded-lg text-sm font-medium border border-ig-border hover:bg-ig-bg transition-colors disabled:opacity-50"
                >
                  {generating ? "Generating..." : "AI Generate caption + hashtags"}
                </button>
                <textarea
                  placeholder="Write a caption…"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={2200}
                  rows={5}
                  className="w-full resize-none text-sm focus:outline-none"
                />
                <span className="text-xs text-ig-gray self-end">
                  {caption.length}/2,200
                </span>
                <input
                  className="ig-input text-sm"
                  placeholder="Add location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === STEPS.POSTING && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-ig-border border-t-ig-blue
                              rounded-full animate-spin" />
              <p className="text-sm text-ig-gray">Sharing your post…</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}



