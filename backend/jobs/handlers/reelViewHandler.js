/**
 * jobs/handlers/reelViewHandler.js
 *
 * Asynchronously increments view counts and recomputes the ranking
 * score for a reel. Decoupling this from the HTTP request allows the
 * API to respond instantly while the DB write happens in the background.
 *
 * RANKING FORMULA
 * ───────────────
 * score = (likes * 3) + (views * 1) - hourDecay
 * hourDecay = hoursOld * 2  (penalises old content)
 *
 * This is a simplified Wilson-score-inspired ranking. In production
 * you'd incorporate shares, saves, and watch-time percentage.
 */

const Reel = require("../../models/Reel");
const logger = require("../../utils/logger");

const processReelView = async (job) => {
  const { reelId, userId } = job.data; // userId for future dedup logic

  const reel = await Reel.findByIdAndUpdate(
    reelId,
    { $inc: { viewCount: 1 } },
    { new: true }
  );

  if (!reel) {
    logger.warn(`[reelViewHandler] Reel ${reelId} not found`);
    return;
  }

  // Recompute ranking score
  const hoursOld = (Date.now() - reel.createdAt.getTime()) / 3_600_000;
  const score =
    reel.likeCount * 3 + reel.viewCount * 1 - Math.floor(hoursOld) * 2;

  await Reel.findByIdAndUpdate(reelId, { score: Math.max(score, 0) });

  logger.info(
    `[reelViewHandler] Reel ${reelId} | views: ${reel.viewCount + 1} | score: ${score}`
  );
};

module.exports = { processReelView };
