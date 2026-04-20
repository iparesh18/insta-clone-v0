require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
const ai = new GoogleGenAI({ apiKey });

const cleanHashtag = (tag = "") => tag.replace(/^#+/, "").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();

const stripDataUrlPrefix = (value = "") => value.replace(/^data:[^;]+;base64,/, "");

const extractHashtagsFromCaption = (caption = "") => {
  const tags = caption.match(/#\w+/g) || [];
  return tags.map((tag) => cleanHashtag(tag)).filter(Boolean);
};

const buildHashtagsFromContext = ({ prompt = "", location = "", mediaType = "image" }) => {
  const keywordTags = toSlug(`${prompt} ${location}`)
    .split(" ")
    .filter((word) => word.length >= 4)
    .slice(0, 5)
    .map(cleanHashtag);

  const typeTags = mediaType === "video"
    ? ["reel", "video", "vibes"]
    : mediaType === "carousel"
      ? ["carousel", "photo_dump", "moments"]
      : ["photo", "lifestyle", "instadaily"];

  return [...new Set([...keywordTags, ...typeTags])].slice(0, 8);
};

const tryParseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
};

const parseJsonFromText = (text = "") => {
  const trimmed = text.trim();

  const direct = tryParseJson(trimmed);
  if (direct && typeof direct === "object") return direct;
  if (typeof direct === "string") {
    const nested = tryParseJson(direct.trim());
    if (nested && typeof nested === "object") return nested;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    const extracted = tryParseJson(match[0]);
    if (extracted && typeof extracted === "object") return extracted;
  }

  return null;
};

const toSlug = (text = "") =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildLocalFallback = ({ prompt = "", location = "", mediaType = "image" }) => {
  const cleanPrompt = String(prompt || "").trim();
  const cleanLocation = String(location || "").trim();

  const baseCaption = cleanPrompt
    ? cleanPrompt
    : mediaType === "video"
      ? "Short clip, big vibes"
      : mediaType === "carousel"
        ? "Swipe through these moments"
        : "Captured this moment";

  const caption = `${baseCaption}${cleanLocation ? ` in ${cleanLocation}` : ""} ✨`;

  const hashtags = buildHashtagsFromContext({
    prompt: cleanPrompt,
    location: cleanLocation,
    mediaType,
  });
  return { caption, hashtags };
};

const parseRetryAfterSeconds = (message = "") => {
  const match = String(message).match(/retry in\s+([\d.]+)s/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? Math.ceil(value) : null;
};

const buildPrompt = ({ prompt = "", location = "", mediaType = "" }) => {
  const safePrompt = String(prompt || "").trim();
  const safeLocation = String(location || "").trim();
  const safeMediaType = String(mediaType || "").trim();

  return [
    "You are a social media assistant.",
    "Generate one Instagram caption and 8 relevant hashtags.",
    "Rules:",
    "- Return ONLY valid JSON",
    "- JSON format: {\"caption\":\"...\",\"hashtags\":[\"tag1\",\"tag2\"]}",
    "- caption max 220 characters",
    "- hashtags must be plain words without #",
    "- no markdown, no explanation",
    `User idea: ${safePrompt || "general lifestyle post"}`,
    `Location: ${safeLocation || "none"}`,
    `Media type: ${safeMediaType || "image"}`,
  ].join("\n");
};

const generateCaptionAndHashtags = async ({ prompt, location, mediaType, base64ImageFile = "", mimeType = "image/jpeg" }) => {
  if (!apiKey) {
    const err = new Error("Gemini API key is not configured");
    err.statusCode = 500;
    throw err;
  }
  const model = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();

  const contents = [];
  if (base64ImageFile) {
    contents.push({
      inlineData: {
        mimeType,
        data: stripDataUrlPrefix(base64ImageFile),
      },
    });
  }
  contents.push({ text: buildPrompt({ prompt, location, mediaType }) });

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: `You are a professional social-media content creator.
Return ONLY valid JSON in this exact shape:
{"caption":"short caption","hashtags":["tag1","tag2", "tag3"]}
Rules:
- Caption must be short, catchy, and human.
- Keep caption around 5-15 words.
- Add 4-8 relevant hashtags.
- Hashtags must NOT include # symbol.
- No markdown and no extra keys.`,
      temperature: 0.8,
      maxOutputTokens: 300,
    },
  });

  const text = String(response?.text || "").trim();

  let parsed = parseJsonFromText(text);
  if (!parsed && text.startsWith("{")) {
    const recovered = parseJsonFromText(`${text}}`);
    if (recovered) parsed = recovered;
  }

  let caption = String(parsed?.caption || "").trim();
  let hashtags = Array.isArray(parsed?.hashtags)
    ? parsed.hashtags.map(cleanHashtag).filter(Boolean).slice(0, 12)
    : [];

  if (!caption && text) {
    caption = text;
    hashtags = extractHashtagsFromCaption(caption).slice(0, 12);
  }

  // If model returned JSON-like text as caption, parse once more and clean output.
  if (caption.startsWith("{") && caption.includes("\"caption\"")) {
    const reparsed = parseJsonFromText(caption);
    if (reparsed?.caption) {
      caption = String(reparsed.caption).trim();
      hashtags = Array.isArray(reparsed.hashtags)
        ? reparsed.hashtags.map(cleanHashtag).filter(Boolean).slice(0, 12)
        : hashtags;
    }
  }

  // Remove accidental hashtag text from caption body if present.
  caption = caption.replace(/\s+#\w+(\s+#\w+)*/g, "").trim();

  if (hashtags.length === 0) {
    hashtags = buildHashtagsFromContext({ prompt, location, mediaType });
  }

  if (!caption && hashtags.length === 0) {
    const err = new Error("Failed to generate caption");
    err.statusCode = 502;
    throw err;
  }

  return { caption, hashtags };
};

const generateCaptionAndHashtagsSafe = async (payload) => {
  try {
    return await generateCaptionAndHashtags(payload);
  } catch (error) {
    const message = String(error?.message || "");
    const isQuota =
      error?.status === 429 ||
      error?.statusCode === 429 ||
      /resource_exhausted|quota|too many requests|429/i.test(message);

    if (!isQuota) throw error;

    const retryAfterSeconds = parseRetryAfterSeconds(message);
    const quotaError = new Error(
      retryAfterSeconds
        ? `AI quota exceeded. Please retry in ${retryAfterSeconds}s or enable billing in Google AI Studio.`
        : "AI quota exceeded. Please retry shortly or enable billing in Google AI Studio."
    );
    quotaError.statusCode = 429;
    quotaError.retryAfterSeconds = retryAfterSeconds;
    quotaError.isQuotaExceeded = true;
    throw quotaError;
  }
};

module.exports = { generateCaptionAndHashtags: generateCaptionAndHashtagsSafe, buildLocalFallback };
