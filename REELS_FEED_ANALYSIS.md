# 🎬 REELS FEED RECOMMENDATION SYSTEM ANALYSIS

**Status**: Current system is non-personalized; Proposal: Scalable recommendation architecture

---

## 🔍 PART 1 — CURRENT IMPLEMENTATION ANALYSIS

### 1. **How Reels Are Fetched from Backend**

#### API Endpoint
```
GET /reels/feed?cursor=<composite_cursor>&limit=10
Route: backend/routes/reel.routes.js
Controller: backend/controllers/reel.controller.js → getReelFeed()
```

#### Flow Diagram
```
Frontend (ReelsPage)
    ↓ (call reelAPI.getFeed(cursor))
API Layer (frontend/src/api/services.js)
    ↓ (GET /reels/feed)
Express Route (backend/routes/reel.routes.js)
    ↓ (protect middleware)
Controller (getReelFeed)
    ↓
MongoDB Query (Reel collection)
    ↓ (populate author, attach isLiked)
JSON Response + Pagination
    ↓
Zustand Store (reelsStore.js)
    ↓
React Component (ReelItem rendered in ReelsPage)
```

#### Controller Implementation (`getReelFeed`)
```javascript
// backend/controllers/reel.controller.js (lines 115-165)
const getReelFeed = async (req, res, next) => {
  const { cursor, limit = 10 } = req.query;
  let query = { isArchived: false };
  
  if (cursor) {
    // Cursor format: "score_id" for composite sorting
    const [scoreStr, idStr] = cursor.split("_");
    const lastScore = parseInt(scoreStr);
    query.$or = [
      { score: { $lt: lastScore } },
      { score: lastScore, _id: { $lt: idStr } }
    ];
  }
  
  const reels = await Reel.find(query)
    .sort({ score: -1, _id: -1 })
    .limit(parsedLimit)
    .populate("author", "username profilePicture isVerified");
    
  // Attach isLiked for current user
  const likedSet = await Like.find({
    user: req.user._id,
    targetId: { $in: reelIds },
    targetType: "Reel"
  }).select("targetId");
  
  // Return with pagination cursor
};
```

#### Database Query
```javascript
// MongoDB query structure:
db.reels.find({
  isArchived: false,
  $or: [
    { score: { $lt: 85 } },          // lower score
    { score: 85, _id: { $lt: id } }  // same score, earlier id
  ]
})
.sort({ score: -1, _id: -1 })
.limit(10)
```

---

### 2. **Following-Based Reels — Current Behavior**

#### ❌ **PROBLEM: NO FOLLOWING FILTER**

**Current Implementation**: 
```javascript
// getReelFeed query filters ONLY by isArchived
let query = { isArchived: false };  // ← No following filter!
```

**What This Means**:
- ALL users see the SAME feed (ranked by score)
- Doesn't matter if author is followed or not
- Unlike Posts (`/posts/feed`), which DO filter by following

#### Posts Feed (FOR COMPARISON — Correct Pattern)
```javascript
// backend/controllers/post.controller.js (lines 79-110)
const getFeed = async (req, res, next) => {
  // Get IDs of accounts user follows
  const followEdges = await Follow.find({
    follower: req.user._id,
    status: "accepted"
  }).select("following");
  
  const followingIds = followEdges.map(e => e.following);
  followingIds.push(req.user._id); // Include own posts
  
  const query = {
    author: { $in: followingIds },    // ← Filter by following!
    isArchived: false
  };
  
  // Cursor pagination + Redis cache
};
```

#### MongoDB Query (CURRENT - NO PERSONALIZATION)
```javascript
// Current Reels Query (Generic for all users)
db.reels.find({
  isArchived: false
})
.sort({ score: -1, _id: -1 })
.limit(10)

// Result: Same 10 reels for user A, B, C, D...
```

#### MongoDB Query (DESIRED - PERSONALIZED)
```javascript
// What it SHOULD be (at minimum):
db.reels.find({
  author: { $in: [followedUser1, followedUser2, ..., currentUser] },
  isArchived: false
})
.sort({ score: -1, _id: -1 })
.limit(10)

// Result: Different feed for each user based on who they follow
```

---

### 3. **What Happens for a NEW User (No Following)**

#### Current System
- **NEW user with 0 following** → Gets the SAME generic feed as everyone
- Sees reels from random creators (whoever has highest score)
- No special logic, no personalized introduction

#### Reel Model
```javascript
// backend/models/Reel.js
const reelSchema = new mongoose.Schema({
  author: { type: ObjectId, ref: "User" },
  likeCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  score: { type: Number, default: 0 },  // Ranking score
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });
```

#### Initial Score Formula (from Reel Creation)
```javascript
// When reel is created:
const reel = await Reel.create({
  author: req.user._id,
  caption,
  score: 100,  // Base score for visibility
});
```

#### Score Update (from BullMQ Worker)
```javascript
// jobs/handlers/reelViewHandler.js (lines 29-35)
const hoursOld = (Date.now() - reel.createdAt.getTime()) / 3_600_000;
const score = 
  reel.likeCount * 3 + 
  reel.viewCount * 1 - 
  Math.floor(hoursOld) * 2;  // Decay over time
```

#### **What NEW Users See**:
```
1. No exploration section
2. Random popular content (by score)
3. No trending reels
4. No suggested creators
5. Same feed as everyone else
```

---

### 4. **How Reels Are Sorted**

#### Sorting Strategy: **CURSOR-BASED COMPOSITE SORT**

```javascript
.sort({ score: -1, _id: -1 })
```

#### Why Composite Cursor?
```
Offset pagination (skip/limit) BREAKS on ranked feeds because:
  • Scores change as users like/view content
  • User scrolls: score of reel #5 increases → reel #4 might move to #3
  • Duplicate or missing results on pagination

Cursor pagination FIXES this by using (score, _id) as anchor:
  • First request: sort by score desc, _id desc
  • Next request: find reels with (score < 85) OR (score == 85 AND _id < abc123)
  • Stable position even if scores change
```

#### Sorting Priority
```
1. score (DESC)     — Engagement + recency
2. _id (DESC)       — Timestamp tiebreaker (newer first)
```

#### Score Calculation
```javascript
// Current formula (from reelViewHandler):
score = (likes * 3) + (views * 1) - (hoursOld * 2)

Example:
• Reel A: 10 likes, 50 views, 2 hours old
  score = (10 * 3) + (50 * 1) - (2 * 2) = 30 + 50 - 4 = 76

• Reel B: 5 likes, 100 views, 1 hour old
  score = (5 * 3) + (100 * 1) - (1 * 2) = 15 + 100 - 2 = 113

Result: Reel B appears first (113 > 76)
```

#### Index Supporting Sort
```javascript
// backend/models/Reel.js
reelSchema.index({ score: -1, createdAt: -1 });  // Ranked feed
reelSchema.index({ author: 1, createdAt: -1 }); // User's reels
reelSchema.index({ tags: 1 });                   // Tag search
```

---

### 5. **Frontend Flow**

#### ReelsPage Component (`frontend/src/pages/ReelsPage.jsx`)

```javascript
// Component Structure
export default function ReelsPage() {
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const { reels, setReels, addReel } = useReelsStore();
  
  // Step 1: Fetch initial reels on mount
  useEffect(() => {
    if (reels.length === 0) {
      fetchReels();
    }
  }, []);
  
  // Step 2: Load more when sentinel element visible
  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView) fetchReels();
  }, [inView]);
  
  // Step 3: API call with cursor pagination
  const fetchReels = async () => {
    const { data } = await reelAPI.getFeed(cursor);
    setReels(cursor ? [...reels, ...newReels] : newReels);
    setCursor(data.pagination?.nextCursor);
    setHasMore(data.pagination?.hasMore ?? false);
  };
  
  // Step 4: Render in reverse order (newest at top)
  return (
    <div className="reel-container">
      {[...reels].reverse().map(reel => (
        <ReelItem key={reel._id} reel={reel} />
      ))}
    </div>
  );
}
```

#### Zustand Store (`frontend/src/store/reelsStore.js`)

```javascript
const useReelsStore = create((set, get) => ({
  // State
  reels: [],                    // All fetched reels
  savedReels: new Set(),        // Saved reel IDs
  likedReels: new Map(),        // Track likes with count
  
  // Setters
  setReels: (newReels) => set({ reels: newReels }),
  addReel: (reel) => set(state => ({ reels: [reel, ...state.reels] })),
  
  // Actions
  toggleReelLike: async (reelId) => {
    // Optimistic UI update
    set(state => ({
      reels: state.reels.map(r => 
        r._id === reelId
          ? { ...r, isLiked: !r.isLiked, likeCount: r.likeCount + 1 }
          : r
      )
    }));
    
    // API call
    await reelAPI.toggleLike(reelId);
    
    // Confirm with server response
  }
}));
```

#### API Service (`frontend/src/api/services.js`)

```javascript
export const reelAPI = {
  getFeed: (cursor) =>
    api.get(`/reels/feed${cursor ? `?cursor=${cursor}` : ""}`),
  
  getReel: (id) => 
    api.get(`/reels/${id}`),
  
  toggleLike: (id) => 
    api.post(`/reels/${id}/like`),
  
  registerView: (id) => 
    api.post(`/reels/${id}/view`),
  
  // More endpoints...
};
```

#### Data Flow Visualization
```
User opens ReelsPage
    ↓
ReelsPage mounts → useEffect triggers fetchReels()
    ↓
reelAPI.getFeed(null) called with no cursor
    ↓
GET /reels/feed → Backend getReelFeed()
    ↓
MongoDB query: find first 10 reels sorted by score
    ↓
Response: { reels: [...], pagination: { nextCursor, hasMore } }
    ↓
useReelsStore.setReels(reels) → Updates store
    ↓
Component re-renders with reels array
    ↓
IntersectionObserver detects scroll to bottom
    ↓
fetchReels() + cursor → fetch next page
    ↓
Zustand updates: reels = [...old, ...new]
```

---

## ⚠️ PART 2 — PROBLEMS IN CURRENT SYSTEM

### 🔴 Critical Issues

| Issue | Impact | Severity |
|-------|--------|----------|
| **No Personalization** | All users see identical feed | CRITICAL |
| **No Following Filter** | Reels from unfollowed creators shown equally | CRITICAL |
| **No Explore Section** | New users don't discover content | HIGH |
| **Poor Ranking Logic** | Score formula ignores engagement velocity | HIGH |
| **No Redis Caching** | Every request hits MongoDB | MEDIUM |
| **No Trending System** | No promotion of viral content | MEDIUM |
| **Missing Engagement Signals** | Comments not weighted in score | MEDIUM |
| **No A/B Testing Hooks** | Can't test different ranking algorithms | LOW |

### Detailed Problems

#### 1️⃣ **No Personalization — Same Feed for All Users**

```javascript
// Current query (identical for every user)
let query = { isArchived: false };

// USER A gets reels [R1, R2, R3, ...]
// USER B gets reels [R1, R2, R3, ...]  ← IDENTICAL
// USER C gets reels [R1, R2, R3, ...]  ← IDENTICAL
```

**Consequence**:
- Doesn't matter who you follow
- Doesn't matter your interests
- Doesn't leverage social graph
- Late-stage cold start problem for new accounts

---

#### 2️⃣ **No Following-Based Filtering (Unlike Posts)**

**Posts feed** (`/posts/feed`):
```javascript
const followingIds = await Follow.find({
  follower: req.user._id,
  status: "accepted"
}).select("following");

const query = { author: { $in: followingIds } };
```

**Reels feed** (`/reels/feed`):
```javascript
// ❌ NO FOLLOW CHECK
const query = { isArchived: false };
```

**Implication**: Reels should follow the same personalization pattern as posts!

---

#### 3️⃣ **New User Cold Start (No Exploration Path)**

**Scenario**: User A signs up, creates an account, opens Reels
```
Expected: "Explore trending content, discover creators"
Actual:   "Same random reels as power users"
```

**Why Problem**:
- No seeding strategy
- No trending section
- New user sees same content regardless
- Doesn't encourage exploration

---

#### 4️⃣ **Weak Ranking Formula**

**Current Formula**:
```javascript
score = (likes * 3) + (views * 1) - (hoursOld * 2)
```

**Problems**:
- Ignores comments (only weights likes/views)
- No view-through rate (watch time)
- No share coefficient
- Doesn't consider creator reputation
- Linear decay (not exponential) on recency

**Example**:
```
Old reel: 1000 likes, 10000 views, 10 hours old
  score = (1000 * 3) + (10000 * 1) - (10 * 2) = 13,000 - 20 = 12,980

New reel with one like: 1 like, 10 views, 0.5 hours old
  score = (1 * 3) + (10 * 1) - (0.5 * 2) = 3 + 10 - 1 = 12

The old reel dominates (12,980 >> 12) ← NOT IDEAL for feed diversity
```

---

#### 5️⃣ **No Redis Caching for Reels Feed**

**Posts feed** uses caching:
```javascript
// backend/controllers/post.controller.js (lines 93-95)
const cached = await getCachedFeed(String(req.user._id), pageKey);
if (cached) return res.status(200).json(cached);

// Cache TTL: 120 seconds
```

**Reels feed** skips caching:
```javascript
// ❌ No cache check
const reels = await Reel.find(query)...
```

**Impact**:
- Every scroll triggers full DB query
- N users scrolling = N MongoDB queries
- At scale (10K concurrent users), MongoDB overloaded

---

#### 6️⃣ **No Trending or Viral Content Section**

**Missing Features**:
- No "Trending Now" section
- No separation of feed types (Following vs. Explore)
- No viral coefficient
- No timebound rankings (trending in last hour/day)

---

#### 7️⃣ **Comments Not Weighted in Score**

**Current Scoring**:
```javascript
score = (likes * 3) + (views * 1) - decay
        // ↑ this     ↑ this      no comments!
```

**Why Comments Matter**:
- High engagement signal
- Indicates discussion/interest
- More valuable than silent views

**Missing**:
```javascript
score = (likes * 3) + (comments * 5) + (views * 1) - decay
        // Still missing!
```

---

## 🚀 PART 3 — RECOMMENDED RECOMMENDATION SYSTEM DESIGN

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND LAYER                          │
│  ReelsPage → useReelsStore → API calls (feed/explore)  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              API LAYER (Express Routes)                  │
│  GET /reels/feed     → Following-based feed              │
│  GET /reels/explore  → Trending/explore feed             │
│  GET /reels/trending → For new users                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│            SERVICE LAYER (Recommendation Logic)          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ feedService.js                                   │   │
│  │ • getPersonalizedFeed(userId)                    │   │
│  │ • getExploreFeed(userId)                         │   │
│  │ • getTrendingReels(timeWindow)                   │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ rankingService.js                                │   │
│  │ • calculateScore(reel)                           │   │
│  │ • boostReelScore(reelId, boost)                  │   │
│  │ • getEngagementMetrics(reelId)                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              CACHING LAYER (Redis)                       │
│  feed:<userId>:following:<page>                         │
│  feed:<userId>:explore:<page>                           │
│  trending:reels:<window>                                │
│  reel:score:<reelId>                                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│          BACKGROUND JOBS (BullMQ Workers)                │
│  ┌──────────────────────────────────────────────────┐   │
│  │ reelScoringJob                                   │   │
│  │ • Recalculate score on like/view/comment        │   │
│  │ • Update trending rankings                       │   │
│  │ • Invalidate feed caches                         │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ trendingGeneratorJob                             │   │
│  │ • Compute trending reels (hourly)                │   │
│  │ • Segment by category/hashtag                    │   │
│  │ • Cache trending results                         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              DATA LAYER (MongoDB)                        │
│  Reel ( score, likeCount, viewCount, commentCount... )  │
│  Follow ( follower, following )                         │
│  Like ( user, targetId, targetType )                    │
└─────────────────────────────────────────────────────────┘
```

---

### Feed Types

#### 1. **Following Feed** (Personalized)
```
Purpose: Show reels from accounts user follows
Priority:
  1. Reels from followed creators (boosted)
  2. Reels from interactions (liked, commented)
  3. Similar content (tags/categories)

Query:
  • author IN [followingIds]
  • Sort by CustomScore
  • Cache: 2 minutes
  • Cursor pagination
```

#### 2. **Explore Feed** (For New Users)
```
Purpose: For users with <5 following or new accounts
Priority:
  1. Trending reels (last 24h)
  2. High engagement (>100 likes)
  3. Diverse creators (not recommended yet)
  4. Viral velocity (engagement growth)

Query:
  • createdAt >= 24h ago
  • likeCount + commentCount*2 > threshold
  • author NOT IN [blockedIds]
  • Sort by TrendingScore
  • Cache: 5 minutes
```

#### 3. **Trending** (System-wide)
```
Purpose: Hourly-updated trending reels
Priority:
  1. High engagement this hour
  2. Viral coefficient > threshold
  3. Diverse content mix

Query:
  • Batch job runs hourly
  • Calculates trending score
  • Caches top 100 per category
  • TTL: 1 hour
```

---

### Ranking Formula (IMPROVED)

#### **Previous Formula** (Simple)
```
score = (likes * 3) + (views * 1) - (hoursOld * 2)
```

#### **Proposed Formula** (Comprehensive)

```javascript
score = 
  (likes * 3.0) +
  (comments * 5.0) +
  (views * 0.5) +
  (shares * 10.0) +
  (saves * 2.0) -
  recencyDecay +
  creatorBoost +
  personalizationBoost

Where:
  recencyDecay = hoursOld^1.2 * 1.5  // Exponential decay
  creatorBoost = isFollowedByUser ? 20 : 0
  personalizationBoost = tagsMatch(reel, userPrefs) ? 15 : 0
```

#### **Example Calculation**

```
Reel A:
  • 50 likes, 10 comments, 500 views, 2 shares, 5 saves
  • Created 3 hours ago
  • Author: Followed by user
  • Tags: Match user preferences

Calculation:
  score = (50 * 3) + (10 * 5) + (500 * 0.5) + (2 * 10) + (5 * 2)
         - (3^1.2 * 1.5) + 20 + 15
       = 150 + 50 + 250 + 20 + 10
         - (3.8 * 1.5) + 35
       = 480 - 5.7 + 35
       = 509.3

Reel B:
  • 100 likes, 2 comments, 1000 views, 0 shares, 10 saves
  • Created 8 hours ago
  • Author: Not followed
  • Tags: No match

Calculation:
  score = (100 * 3) + (2 * 5) + (1000 * 0.5) + (0 * 10) + (10 * 2)
         - (8^1.2 * 1.5) + 0 + 0
       = 300 + 10 + 500 + 0 + 20
         - (15.6 * 1.5)
       = 830 - 23.4
       = 806.6

Winner: Reel B (806.6 > 509.3) ← Older but much higher engagement
```

---

### Cold Start Strategy

#### For **Brand New Users**
```
1. First request → /reels/explore (not /reels/feed)
2. Show trending reels from last 24h
3. Suggest creators to follow
4. Show category-based content
5. After 5+ following → Switch to /reels/feed
```

#### For **Users with Low Following** (<5)
```
1. Blend:
   • 70% trending reels (/explore)
   • 30% from following (/feed)
2. Gradually increase following-based ratio
3. At 30+ following → 100% from following
```

---

## ⚙️ REQUIREMENTS & IMPLEMENTATION DETAILS

### 1. **Following-Based Feed API**

```javascript
// backend/routes/reel.routes.js
router.get("/feed", protect, getReelFeed);

// backend/controllers/reel.controller.js
const getReelFeed = async (req, res, next) => {
  try {
    const { cursor, limit = 10 } = req.query;
    
    // NEW: Get followed users
    const followingIds = await getFeedService.getFollowingIds(req.user._id);
    
    let query = { 
      author: { $in: followingIds },  // NEW: Filter by following
      isArchived: false 
    };
    
    if (cursor) {
      const [scoreStr, idStr] = cursor.split("_");
      query.$or = [
        { score: { $lt: parseInt(scoreStr) } },
        { score: parseInt(scoreStr), _id: { $lt: idStr } }
      ];
    }
    
    const reels = await Reel.find(query)
      .sort({ score: -1, _id: -1 })
      .limit(Math.min(parseInt(limit), 20))
      .populate("author", "username profilePicture isVerified");
    
    // Attach metadata
    const enrichedReels = await rankingService.enrichReels(reels, req.user._id);
    
    return sendSuccess(res, enrichedReels, pagination);
  } catch (err) {
    next(err);
  }
};
```

---

### 2. **Explore Feed API** (NEW)

```javascript
// backend/routes/reel.routes.js
router.get("/explore", protect, getExploreFeed);

// backend/controllers/reel.controller.js
const getExploreFeed = async (req, res, next) => {
  try {
    const { cursor, limit = 10 } = req.query;
    
    // Check if user is new
    const userFollowingCount = await Follow.countDocuments({
      follower: req.user._id,
      status: "accepted"
    });
    
    // NEW users (< 5 following) or explicit explore request
    if (userFollowingCount < 5) {
      return getFeedService.getTrendingReels(cursor, limit);
    }
    
    // Fallback for established users
    return getFeedService.getExploreReels(req.user._id, cursor, limit);
  } catch (err) {
    next(err);
  }
};
```

---

### 3. **Trending Reels API** (NEW ENDPOINT)

```javascript
// backend/routes/reel.routes.js
router.get("/trending", getTrendingReels);

// backend/controllers/reel.controller.js
const getTrendingReels = async (req, res, next) => {
  try {
    const { cursor, limit = 10, timeWindow = "24h" } = req.query;
    
    // Try cache first
    const cached = await redisHelpers.getCachedTrending(timeWindow, cursor);
    if (cached) return sendSuccess(res, cached);
    
    // Get trending from BullMQ-computed results
    const trending = await rankingService.getTrendingReels(timeWindow, cursor, limit);
    
    // Cache for 1 hour
    await redisHelpers.cacheTrending(timeWindow, trending);
    
    return sendSuccess(res, trending);
  } catch (err) {
    next(err);
  }
};
```

---

### 4. **MongoDB Indexes Required**

```javascript
// backend/models/Reel.js
reelSchema.index({ score: -1, createdAt: -1 });    // Ranked feed
reelSchema.index({ author: 1, score: -1 });        // User's reels + ranking
reelSchema.index({ createdAt: -1 });               // Time-based queries
reelSchema.index({ likeCount: -1 });               // Trending
reelSchema.index({ tags: 1 });                     // Tag-based queries
reelSchema.index({ 
  author: 1, 
  isArchived: 1, 
  score: -1 
});                                                 // Optimized following feed

// backend/models/Follow.js
followSchema.index({ follower: 1, status: 1 });    // Who does user follow?
followSchema.index({ following: 1, status: 1 });   // Who follows user?

// backend/models/Like.js
likeSchema.index({ 
  targetId: 1, 
  targetType: 1, 
  createdAt: -1 
});                                                 // Trending calculations
```

---

### 5. **Redis Caching Layer**

```javascript
// backend/redis/redisHelpers.js

const FEED_CACHE_TTL = 120;        // 2 minutes for following feed
const EXPLORE_CACHE_TTL = 300;     // 5 minutes for explore
const TRENDING_CACHE_TTL = 3600;   // 1 hour for trending

// Following feed cache
const cacheFollowingFeed = (userId, page, data) => 
  redis.setex(`feed:${userId}:following:${page}`, FEED_CACHE_TTL, JSON.stringify(data));

const getCachedFollowingFeed = (userId, page) =>
  redis.get(`feed:${userId}:following:${page}`).then(d => d ? JSON.parse(d) : null);

// Explore feed cache
const cacheExploreFeed = (data, page) =>
  redis.setex(`feed:explore:${page}`, EXPLORE_CACHE_TTL, JSON.stringify(data));

const getCachedExploreFeed = (page) =>
  redis.get(`feed:explore:${page}`).then(d => d ? JSON.parse(d) : null);

// Trending cache
const cacheTrendingReels = (timeWindow, reels) =>
  redis.setex(`trending:${timeWindow}`, TRENDING_CACHE_TTL, JSON.stringify(reels));

const getCachedTrending = (timeWindow) =>
  redis.get(`trending:${timeWindow}`).then(d => d ? JSON.parse(d) : null);

// Invalidation
const invalidateUserFeed = (userId) => {
  const pattern = `feed:${userId}:*`;
  // Delete all pages of user's feed
  redis.keys(pattern).then(keys => redis.del(...keys));
};

const invalidateTrending = () => {
  redis.keys("trending:*").then(keys => redis.del(...keys));
};
```

---

### 6. **BullMQ Background Jobs**

#### **A. Reel Scoring Job** (Runs on View/Like/Comment)

```javascript
// backend/jobs/handlers/reelScoringJob.js

const processReelScoring = async (job) => {
  const { reelId, action, userId } = job.data;
  // action: "view", "like", "comment", "unlike", "share"
  
  // 1. Get reel + engagement metrics
  const reel = await Reel.findById(reelId);
  const metrics = await rankingService.getEngagementMetrics(reelId);
  
  // 2. Calculate new score
  const newScore = rankingService.calculateScore(reel, metrics);
  
  // 3. Update reel
  await Reel.findByIdAndUpdate(reelId, { score: newScore });
  
  // 4. Invalidate caches (user's following feed)
  await redisHelpers.invalidateUserFeed(reel.author);
  
  // 5. Check if should be added to trending
  if (metrics.engagementRate > TRENDING_THRESHOLD) {
    await redisHelpers.tagAsEmerging(reelId);
  }
};

module.exports = { processReelScoring };
```

#### **B. Trending Generator Job** (Runs Every Hour)

```javascript
// backend/jobs/handlers/trendingGeneratorJob.js

const generateTrendingReels = async () => {
  // Time windows: 1h, 6h, 24h
  const windows = [
    { name: "1h", hours: 1 },
    { name: "6h", hours: 6 },
    { name: "24h", hours: 24 }
  ];
  
  for (const window of windows) {
    const since = new Date(Date.now() - window.hours * 3600000);
    
    // Get reels with high engagement in this window
    const trending = await Reel.find({
      createdAt: { $gte: since },
      isArchived: false,
      likeCount: { $gte: 10 } // Min engagement
    })
      .sort({ 
        score: -1,  // Main ranking
        likeCount: -1,
        viewCount: -1
      })
      .limit(100)
      .lean();
    
    // Cache for 1 hour
    await redisHelpers.cacheTrendingReels(window.name, trending);
  }
};

module.exports = { generateTrendingReels };
```

#### **C. Feed Cache Invalidation Job** (On Follow/Unfollow)

```javascript
// Trigger when follow/unfollow happens
const onFollowChange = async (userId, targetId, action) => {
  // action: "follow" or "unfollow"
  
  // Invalidate both users' feed caches
  await redisHelpers.invalidateUserFeed(userId);
  await redisHelpers.invalidateUserFeed(targetId);
  
  // Queue new feed generation
  await feedGenerationQueue.add("generateFeed", { userId });
};
```

---

### 7. **New Service Files**

#### **A. feedService.js**

```javascript
// backend/services/feedService.js

const feedService = {
  
  /**
   * Get following IDs for a user
   */
  async getFollowingIds(userId) {
    const follows = await Follow.find({
      follower: userId,
      status: "accepted"
    }).select("following").lean();
    
    const ids = follows.map(f => f.following);
    ids.push(userId); // Include own reels
    return ids;
  },
  
  /**
   * Get personalized feed (from following)
   */
  async getFollowingFeed(userId, cursor, limit) {
    const cacheKey = `feed:${userId}:following:${cursor || "first"}`;
    
    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    // Get following IDs
    const followingIds = await this.getFollowingIds(userId);
    
    // Query reels
    let query = { author: { $in: followingIds }, isArchived: false };
    if (cursor) {
      const [scoreStr, idStr] = cursor.split("_");
      query.$or = [
        { score: { $lt: parseInt(scoreStr) } },
        { score: parseInt(scoreStr), _id: { $lt: idStr } }
      ];
    }
    
    const reels = await Reel.find(query)
      .sort({ score: -1, _id: -1 })
      .limit(limit)
      .populate("author", "username profilePicture isVerified")
      .lean();
    
    // Calculate pagination
    const hasMore = reels.length === limit;
    const nextCursor = hasMore ? `${reels[reels.length - 1].score}_${reels[reels.length - 1]._id}` : null;
    
    const result = {
      reels: await rankingService.enrichReels(reels, userId),
      pagination: { hasMore, nextCursor }
    };
    
    // Cache
    await redis.setex(cacheKey, 120, JSON.stringify(result));
    
    return result;
  },
  
  /**
   * Get explore feed (trending/discovery)
   */
  async getExploreFeed(userId, cursor, limit) {
    const cacheKey = `feed:explore:${cursor || "first"}`;
    
    // Try cache (same for all users)
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    // Get trending reels
    const since = new Date(Date.now() - 24 * 3600000);
    
    let query = {
      createdAt: { $gte: since },
      isArchived: false,
      likeCount: { $gte: 5 }
    };
    
    if (cursor) {
      const [scoreStr, idStr] = cursor.split("_");
      query.$or = [
        { score: { $lt: parseInt(scoreStr) } },
        { score: parseInt(scoreStr), _id: { $lt: idStr } }
      ];
    }
    
    const reels = await Reel.find(query)
      .sort({ score: -1, _id: -1 })
      .limit(limit)
      .populate("author", "username profilePicture isVerified")
      .lean();
    
    const hasMore = reels.length === limit;
    const nextCursor = hasMore ? `${reels[reels.length - 1].score}_${reels[reels.length - 1]._id}` : null;
    
    const result = {
      reels: await rankingService.enrichReels(reels, userId),
      pagination: { hasMore, nextCursor }
    };
    
    await redis.setex(cacheKey, 300, JSON.stringify(result));
    
    return result;
  },
  
  /**
   * Determine which feed to show
   */
  async getFeed(userId, cursor, limit) {
    const followingCount = await Follow.countDocuments({
      follower: userId,
      status: "accepted"
    });
    
    // New user (< 5 following)
    if (followingCount < 5) {
      return this.getExploreFeed(userId, cursor, limit);
    }
    
    // Established user
    return this.getFollowingFeed(userId, cursor, limit);
  }
};

module.exports = feedService;
```

#### **B. rankingService.js**

```javascript
// backend/services/rankingService.js

const rankingService = {
  
  /**
   * Calculate engagement score for reel
   */
  calculateScore(reel, metrics = {}) {
    const {
      likes = reel.likeCount || 0,
      comments = reel.commentCount || 0,
      views = reel.viewCount || 0,
      shares = metrics.shares || 0,
      saves = metrics.saves || 0,
      createdAt = reel.createdAt
    } = metrics;
    
    // Calculate recency decay (exponential)
    const hoursOld = (Date.now() - new Date(createdAt).getTime()) / 3600000;
    const recencyDecay = Math.pow(hoursOld, 1.2) * 1.5;
    
    // Base engagement score
    const engagementScore = 
      (likes * 3.0) +
      (comments * 5.0) +
      (views * 0.5) +
      (shares * 10.0) +
      (saves * 2.0);
    
    // Final score
    const score = Math.max(engagementScore - recencyDecay, 0);
    
    return Math.floor(score);
  },
  
  /**
   * Get engagement metrics for reel
   */
  async getEngagementMetrics(reelId) {
    const reel = await Reel.findById(reelId).lean();
    const likes = await Like.countDocuments({
      targetId: reelId,
      targetType: "Reel"
    });
    const comments = await Comment.countDocuments({
      targetId: reelId,
      targetType: "Reel"
    });
    const hoursOld = (Date.now() - reel.createdAt.getTime()) / 3600000;
    
    return {
      likes,
      comments,
      views: reel.viewCount,
      engagementRate: (likes + comments) / Math.max(reel.viewCount, 1),
      hoursOld,
      createdAt: reel.createdAt
    };
  },
  
  /**
   * Enrich reels with computed fields (likes status, engagement metrics)
   */
  async enrichReels(reels, userId) {
    const reelIds = reels.map(r => r._id);
    
    // Get user's likes
    const likedReels = await Like.find({
      user: userId,
      targetId: { $in: reelIds },
      targetType: "Reel"
    }).select("targetId").lean();
    
    const likedSet = new Set(likedReels.map(l => String(l.targetId)));
    
    // Enrich each reel
    return reels.map(reel => ({
      ...reel,
      isLiked: likedSet.has(String(reel._id))
    }));
  },
  
  /**
   * Get trending reels for a time window
   */
  async getTrendingReels(timeWindow = "24h", limit = 50) {
    const windows = {
      "1h": 1,
      "6h": 6,
      "24h": 24
    };
    
    const hours = windows[timeWindow] || 24;
    const since = new Date(Date.now() - hours * 3600000);
    
    const trending = await Reel.find({
      createdAt: { $gte: since },
      isArchived: false,
      likeCount: { $gte: 5 }
    })
      .sort({ score: -1, likeCount: -1 })
      .limit(limit)
      .populate("author", "username profilePicture isVerified")
      .lean();
    
    return trending;
  }
};

module.exports = rankingService;
```

---

### 8. **Frontend Changes** (Minimal)

```javascript
// frontend/src/pages/ReelsPage.jsx

export default function ReelsPage() {
  const [feedType, setFeedType] = useState("auto"); // "auto", "following", "explore"
  const { reels, setReels, addReel } = useReelsStore();
  
  const getFeedEndpoint = () => {
    if (feedType === "following") return "/reels/feed";
    if (feedType === "explore") return "/reels/explore";
    return "/reels/feed"; // Auto-detects based on user.followingCount
  };
  
  const fetchReels = useCallback(async () => {
    const endpoint = getFeedEndpoint();
    const { data } = await api.get(`${endpoint}${cursor ? `?cursor=${cursor}` : ""}`);
    
    setReels(cursor ? [...reels, ...data.data.reels] : data.data.reels);
    setCursor(data.pagination?.nextCursor);
  }, [cursor, feedType]);
  
  return (
    <div>
      {/* NEW: Feed type toggle (for power users) */}
      <div className="feed-controls">
        <button onClick={() => setFeedType("auto")}>Personalized</button>
        <button onClick={() => setFeedType("explore")}>Explore</button>
        <button onClick={() => setFeedType("following")}>Following</button>
      </div>
      
      {/* Existing reel rendering */}
      <div className="reels-container">
        {reels.map(reel => <ReelItem key={reel._id} {...reel} />)}
      </div>
    </div>
  );
}
```

---

## 📦 FOLDER STRUCTURE UPDATES

```
backend/
├── controllers/
│   ├── reel.controller.js          (UPDATED with new endpoints)
│   └── ...
├── models/
│   ├── Reel.js                     (NEW indexes)
│   ├── Follow.js                   (NEW indexes)
│   └── ...
├── routes/
│   ├── reel.routes.js              (NEW: /explore, /trending)
│   └── ...
├── services/                        (NEW FOLDER)
│   ├── feedService.js              (NEW)
│   ├── rankingService.js           (NEW)
│   └── index.js
├── jobs/
│   ├── handlers/
│   │   ├── reelViewHandler.js      (EXISTS)
│   │   ├── reelScoringJob.js       (NEW)
│   │   └── trendingGeneratorJob.js (NEW)
│   └── ...
├── redis/
│   └── redisHelpers.js             (UPDATED with trending/explore cache)
└── ...

frontend/
├── src/
│   ├── pages/
│   │   ├── ReelsPage.jsx           (UPDATED with feed type toggle)
│   │   └── ...
│   ├── api/
│   │   └── services.js             (UPDATED: add explore endpoint)
│   └── ...
```

---

## 🎯 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1)
- [ ] Create `services/feedService.js`
- [ ] Create `services/rankingService.js`
- [ ] Add new MongoDB indexes
- [ ] Update Reel schema with `score` recalculation

### Phase 2: Backend APIs (Week 1-2)
- [ ] Add `/reels/explore` endpoint
- [ ] Add `/reels/trending` endpoint
- [ ] Implement Redis caching
- [ ] Update `getReelFeed` with following filter

### Phase 3: Background Jobs (Week 2)
- [ ] Create `reelScoringJob.js`
- [ ] Create `trendingGeneratorJob.js`
- [ ] Queue jobs on like/view/comment
- [ ] Schedule hourly trending generation

### Phase 4: Frontend (Week 3)
- [ ] Update ReelsPage with feed type toggle
- [ ] Add explore feed UI
- [ ] Update API service calls
- [ ] Test infinite scroll

### Phase 5: Testing & Optimization (Week 3-4)
- [ ] Load test feeds
- [ ] A/B test scoring formulas
- [ ] Monitor Redis hit rates
- [ ] Optimize query indexes

---

## ⚠️ KEY DECISION: PRESERVE BACKWARDS COMPATIBILITY

### Keep Working:
✅ Existing `/posts/feed` (unchanged)
✅ Existing `/posts/:id` (unchanged)
✅ Existing `/reels/:id/like` (unchanged)
✅ Existing `/reels/:id/view` (unchanged)

### Add New:
✨ `/reels/feed` → Now with following filter
✨ `/reels/explore` → New explore feed
✨ `/reels/trending` → New trending endpoint

### Migration Path:
```
Old behavior: ALL reels shown to everyone
New behavior: 
  • If user has < 5 following → Auto show explore
  • If user has >= 5 following → Auto show following feed
  • Power users can toggle with UI button
```

---

## 📊 EXPECTED IMPROVEMENTS

| Metric | Current | With Recommendation System |
|--------|---------|---------------------------|
| Feed Personalization | 0% (Generic) | 100% (User-based) |
| DB Queries/scroll | Full query | Cache hit 80%+ |
| New User Engagement | Flat | +40% (Trending intro) |
| Feed Diversity | Low | High (Multiple feeds) |
| Following Impact | None | Strong boost |
| Cold Start Problem | Severe | Mitigated |

---

## 🔗 References

**Existing Code:**
- Frontend: [ReelsPage](./frontend/src/pages/ReelsPage.jsx#L1)
- Backend: [reelController](./backend/controllers/reel.controller.js#L1)
- Models: [Reel](./backend/models/Reel.js), [Follow](./backend/models/Follow.js)
- API: [reelAPI](./frontend/src/api/services.js#L40)

**Similar Pattern (Posts Feed):**
- [Posts Controller Feed Logic](./backend/controllers/post.controller.js#L79-L110)
- [Redis Helpers](./backend/redis/redisHelpers.js#L1)

---

## 🚀 MINIMUM VIABLE IMPLEMENTATION

If you want to start with just the essentials:

1. **Add following filter** to `/reels/feed` (1 hour)
2. **Add Redis caching** to feeds (1 hour)
3. **Create `/reels/explore`** endpoint (2 hours)
4. **Improved scoring formula** in reelViewHandler (1 hour)

**Total: ~5 hours** for 80% of the benefits. Full implementation (with BullMQ jobs) ~2-3 days for 100% complete system.

