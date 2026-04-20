const User = require("../models/User");
const Post = require("../models/Post");
const Reel = require("../models/Reel");
const Follow = require("../models/Follow");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const { sendSuccess } = require("../utils/apiResponse");
const {
  getCachedAnalytics,
  cacheAnalytics,
} = require("../redis/redisHelpers");

const toDayKey = (date) => date.toISOString().slice(0, 10);

const buildDayLabels = (days) => {
  const labels = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    labels.push(toDayKey(d));
  }

  return labels;
};

const mapSeriesByDay = (labels, aggregateDocs) => {
  const byDay = new Map();
  aggregateDocs.forEach((doc) => byDay.set(doc._id, doc.count));
  return labels.map((key) => byDay.get(key) || 0);
};

const formatCohortLabel = (isoWeek) => {
  const [year, week] = isoWeek.split("-W");
  return `W${week} ${year}`;
};

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const getDashboardAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const rangeDays = Math.min(Math.max(parseInt(req.query.days || "30", 10), 7), 90);

    const cacheKey = `${rangeDays}d`;
    const cached = await getCachedAnalytics(String(userId), cacheKey);
    if (cached) {
      return sendSuccess(
        res,
        {
          ...cached,
          cache: {
            ...(cached.cache || {}),
            hit: true,
            ttlSeconds: 300,
          },
        },
        "Analytics fetched from cache"
      );
    }

    const now = new Date();
    const since = new Date(now);
    since.setDate(now.getDate() - rangeDays + 1);
    since.setHours(0, 0, 0, 0);

    const prevSince = new Date(since);
    prevSince.setDate(prevSince.getDate() - rangeDays);

    const labels = buildDayLabels(rangeDays);

    const [userDoc, postDocs, reelDocs] = await Promise.all([
      User.findById(userId)
        .select("createdAt followerCount followingCount postCount")
        .lean(),
      Post.find({ author: userId }).select("_id likeCount commentCount createdAt").lean(),
      Reel.find({ author: userId }).select("_id likeCount commentCount viewCount createdAt").lean(),
    ]);

    const postIds = postDocs.map((post) => post._id);
    const reelIds = reelDocs.map((reel) => reel._id);

    const postTargetMatch = postIds.length
      ? [{ targetType: "Post", targetId: { $in: postIds } }]
      : [];
    const reelTargetMatch = reelIds.length
      ? [{ targetType: "Reel", targetId: { $in: reelIds } }]
      : [];
    const engagementTargetOr = [...postTargetMatch, ...reelTargetMatch];

    const [
      postGrowthAgg,
      reelGrowthAgg,
      followerGrowthAgg,
      likesByDayAgg,
      commentsByDayAgg,
      totalLikesReceived,
      totalCommentsReceived,
      likesLastRange,
      commentsLastRange,
      currentLikeUsers,
      currentCommentUsers,
      previousLikeUsers,
      previousCommentUsers,
      followerCohortAgg,
    ] = await Promise.all([
      Post.aggregate([
        { $match: { author: userId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      Reel.aggregate([
        { $match: { author: userId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      Follow.aggregate([
        {
          $match: {
            following: userId,
            status: "accepted",
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      engagementTargetOr.length
        ? Like.aggregate([
            {
              $match: {
                $or: engagementTargetOr,
                createdAt: { $gte: since },
              },
            },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
              },
            },
          ])
        : [],
      engagementTargetOr.length
        ? Comment.aggregate([
            {
              $match: {
                $or: engagementTargetOr,
                createdAt: { $gte: since },
              },
            },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
              },
            },
          ])
        : [],
      engagementTargetOr.length ? Like.countDocuments({ $or: engagementTargetOr }) : 0,
      engagementTargetOr.length ? Comment.countDocuments({ $or: engagementTargetOr }) : 0,
      engagementTargetOr.length
        ? Like.countDocuments({
            $or: engagementTargetOr,
            createdAt: { $gte: since },
          })
        : 0,
      engagementTargetOr.length
        ? Comment.countDocuments({
            $or: engagementTargetOr,
            createdAt: { $gte: since },
          })
        : 0,
      engagementTargetOr.length
        ? Like.distinct("user", {
            $or: engagementTargetOr,
            createdAt: { $gte: since },
          })
        : [],
      engagementTargetOr.length
        ? Comment.distinct("author", {
            $or: engagementTargetOr,
            createdAt: { $gte: since },
          })
        : [],
      engagementTargetOr.length
        ? Like.distinct("user", {
            $or: engagementTargetOr,
            createdAt: { $gte: prevSince, $lt: since },
          })
        : [],
      engagementTargetOr.length
        ? Comment.distinct("author", {
            $or: engagementTargetOr,
            createdAt: { $gte: prevSince, $lt: since },
          })
        : [],
      Follow.aggregate([
        {
          $match: {
            following: userId,
            status: "accepted",
            createdAt: {
              $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 12),
            },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%G-W%V", date: "$createdAt" } },
            users: { $push: "$follower" },
            size: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const followersGained = mapSeriesByDay(labels, followerGrowthAgg);
    const postsCreated = mapSeriesByDay(labels, postGrowthAgg);
    const reelsCreated = mapSeriesByDay(labels, reelGrowthAgg);
    const likesReceived = mapSeriesByDay(labels, likesByDayAgg);
    const commentsReceived = mapSeriesByDay(labels, commentsByDayAgg);

    const currentEngagedUsersSet = new Set([
      ...currentLikeUsers.map(String),
      ...currentCommentUsers.map(String),
    ]);
    const previousEngagedUsersSet = new Set([
      ...previousLikeUsers.map(String),
      ...previousCommentUsers.map(String),
    ]);

    let returningUsers = 0;
    previousEngagedUsersSet.forEach((id) => {
      if (currentEngagedUsersSet.has(id)) returningUsers += 1;
    });

    const retentionRate = previousEngagedUsersSet.size
      ? Number(((returningUsers / previousEngagedUsersSet.size) * 100).toFixed(1))
      : 0;

    const cohortRows = followerCohortAgg.map((row) => {
      const cohortUsers = row.users.map(String);
      const activeUsers = cohortUsers.reduce(
        (count, id) => (currentEngagedUsersSet.has(id) ? count + 1 : count),
        0
      );

      return {
        cohort: formatCohortLabel(row._id),
        size: row.size,
        activeUsers,
        retentionRate: row.size ? Number(((activeUsers / row.size) * 100).toFixed(1)) : 0,
      };
    });

    const totalViewsReceived = reelDocs.reduce((sum, reel) => sum + (reel.viewCount || 0), 0);
    const engagementRate = userDoc?.followerCount
      ? Number((((likesLastRange + commentsLastRange) / userDoc.followerCount) * 100).toFixed(1))
      : 0;

    const followersGainedTotal = followersGained.reduce((sum, value) => sum + value, 0);
    const allContentDocs = [
      ...postDocs.map((post) => ({
        id: String(post._id),
        kind: "post",
        createdAt: post.createdAt,
        likes: post.likeCount || 0,
        comments: post.commentCount || 0,
        views: 0,
      })),
      ...reelDocs.map((reel) => ({
        id: String(reel._id),
        kind: "reel",
        createdAt: reel.createdAt,
        likes: reel.likeCount || 0,
        comments: reel.commentCount || 0,
        views: reel.viewCount || 0,
      })),
    ];

    const contentCount = allContentDocs.length;
    const totalInteractions = totalLikesReceived + totalCommentsReceived;
    const avgInteractionsPerContent = contentCount
      ? Number((totalInteractions / contentCount).toFixed(1))
      : 0;
    const avgLikesPerPost = postDocs.length
      ? Number(
          (
            postDocs.reduce((sum, post) => sum + (post.likeCount || 0), 0) / postDocs.length
          ).toFixed(1)
        )
      : 0;
    const avgCommentsPerPost = postDocs.length
      ? Number(
          (
            postDocs.reduce((sum, post) => sum + (post.commentCount || 0), 0) / postDocs.length
          ).toFixed(1)
        )
      : 0;

    const dayBuckets = Array.from({ length: 7 }, (_, day) => ({ day, count: 0 }));
    allContentDocs.forEach((item) => {
      const day = new Date(item.createdAt).getDay();
      dayBuckets[day].count += 1;
    });
    dayBuckets.sort((a, b) => b.count - a.count);
    const bestPublishingDay = dayBuckets[0]?.count
      ? {
          day: WEEKDAY_NAMES[dayBuckets[0].day],
          publishedCount: dayBuckets[0].count,
        }
      : {
          day: "-",
          publishedCount: 0,
        };

    const activePublishingDays = new Set(allContentDocs.map((item) => toDayKey(new Date(item.createdAt))));
    const publishingConsistencyRate = Number(
      ((activePublishingDays.size / rangeDays) * 100).toFixed(1)
    );

    const topPosts = [...postDocs]
      .sort(
        (a, b) =>
          (b.likeCount || 0) + (b.commentCount || 0) - ((a.likeCount || 0) + (a.commentCount || 0))
      )
      .slice(0, 3)
      .map((post) => ({
        id: String(post._id),
        kind: "post",
        likes: post.likeCount || 0,
        comments: post.commentCount || 0,
        score: (post.likeCount || 0) + (post.commentCount || 0),
        createdAt: post.createdAt,
      }));

    const topReels = [...reelDocs]
      .sort(
        (a, b) =>
          (b.likeCount || 0) + (b.commentCount || 0) + (b.viewCount || 0) -
          ((a.likeCount || 0) + (a.commentCount || 0) + (a.viewCount || 0))
      )
      .slice(0, 3)
      .map((reel) => ({
        id: String(reel._id),
        kind: "reel",
        likes: reel.likeCount || 0,
        comments: reel.commentCount || 0,
        views: reel.viewCount || 0,
        score: (reel.likeCount || 0) + (reel.commentCount || 0) + (reel.viewCount || 0),
        createdAt: reel.createdAt,
      }));

    const analytics = {
      rangeDays,
      overview: {
        followers: userDoc?.followerCount || 0,
        following: userDoc?.followingCount || 0,
        posts: postDocs.length,
        reels: reelDocs.length,
        totalLikesReceived,
        totalCommentsReceived,
        totalViewsReceived,
      },
      growth: {
        labels,
        followersGained,
        postsCreated,
        reelsCreated,
      },
      engagement: {
        labels,
        likesReceived,
        commentsReceived,
        likesLastRange,
        commentsLastRange,
        engagementRate,
      },
      retention: {
        currentEngagedUsers: currentEngagedUsersSet.size,
        previousEngagedUsers: previousEngagedUsersSet.size,
        returningUsers,
        retentionRate,
      },
      cohorts: cohortRows,
      personalInsights: {
        followersGainedTotal,
        avgInteractionsPerContent,
        avgLikesPerPost,
        avgCommentsPerPost,
        bestPublishingDay,
        activePublishingDays: activePublishingDays.size,
        publishingConsistencyRate,
        contentMix: {
          posts: postDocs.length,
          reels: reelDocs.length,
        },
        topContent: {
          posts: topPosts,
          reels: topReels,
        },
      },
      cache: {
        hit: false,
        ttlSeconds: 300,
      },
      generatedAt: new Date().toISOString(),
    };

    await cacheAnalytics(String(userId), cacheKey, analytics, 300);

    return sendSuccess(res, analytics, "Analytics fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardAnalytics,
};
