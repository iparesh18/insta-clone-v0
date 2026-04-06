# 📸 Instagram Clone — Production-Grade MERN Stack

A full-stack Instagram clone built with Node.js, Express, MongoDB, Redis, BullMQ, Socket.io, React (Vite), Tailwind CSS, Framer Motion, and ImageKit.

---

## 📁 Project Structure

```
instagram-clone/
├── backend/
│   ├── config/          # DB + ImageKit initialisation
│   ├── controllers/     # Request handlers (MVC)
│   ├── jobs/
│   │   ├── worker.js    # Standalone BullMQ worker process
│   │   └── handlers/    # Email / ReelView / Notification processors
│   ├── middlewares/     # Auth, rate-limiter, upload, error handler
│   ├── models/          # Mongoose schemas with indexes
│   ├── queues/          # BullMQ queue definitions
│   ├── redis/           # Redis client + helpers (OTP, cache, presence)
│   ├── routes/          # Express routers
│   ├── socket/          # Socket.io manager (chat + presence)
│   ├── utils/           # JWT, logger, ImageKit upload, API response
│   ├── app.js           # Express app factory
│   └── server.js        # HTTP server bootstrap
│
└── frontend/
    └── src/
        ├── api/         # Axios instance + domain service modules
        ├── components/
        │   ├── layout/  # MainLayout (sidebar), AuthLayout
        │   ├── post/    # PostCard, CreatePostModal, Skeleton
        │   ├── reel/    # ReelItem (IntersectionObserver + ReactPlayer)
        │   ├── story/   # StoriesBar (react-insta-stories)
        │   ├── profile/ # SuggestedUsers
        │   └── ui/      # Avatar
        ├── hooks/       # useDebounce
        ├── pages/       # Route-level page components
        ├── store/       # Zustand (auth + socket)
        └── utils/       # Date formatting
```

---

## 🧱 Architecture Decisions

### Edge Collections (Follow & Like)
Instead of embedding arrays in User documents:

| Problem with arrays | Edge collection solution |
|---|---|
| 16 MB document limit | Each relationship = 1 small document |
| Write contention on hot docs | Atomic upsert per edge |
| Slow $slice pagination | Compound index → O(log n) lookup |
| No metadata on relationship | `status`, `createdAt` on edge |

### Cursor-Based Pagination
Offset/skip pagination breaks on ranked feeds (scores change while scrolling).
All feed APIs use `_id`-based cursors (posts/stories) or `(score, _id)` composite cursors (reels).

### BullMQ for View Counts
Reel view registration is fire-and-forget via BullMQ. The HTTP response returns in < 5ms; the worker increments the view count and recomputes the ranking score asynchronously.

### Redis Layers
| Layer | Usage |
|---|---|
| OTP storage | `setex` with 5-minute TTL |
| Feed cache | 2-minute cache per user per cursor page |
| Online presence | `setex` with 60s TTL, refreshed on heartbeat |
| Rate limiting | express-rate-limit (in-process for single instance) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas (or local mongod)
- Redis (local or Redis Cloud)
- ImageKit account
- Gmail app password (for Nodemailer)

### Backend

```bash
cd backend
cp .env.example .env        # fill in all values
npm install
npm run dev                 # API server on :5000
node jobs/worker.js         # BullMQ worker (separate terminal)
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # Vite dev server on :5173
```

---

## 🔑 Environment Variables

### Backend (.env)

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Access token signing secret (≥ 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (≥ 32 chars) |
| `JWT_ACCESS_EXPIRE` | Access token TTL (default `15m`) |
| `JWT_REFRESH_EXPIRE` | Refresh token TTL (default `7d`) |
| `REDIS_URL` | Redis connection URL |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public key |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private key |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit URL endpoint |
| `EMAIL_HOST` | SMTP host (e.g. `smtp.gmail.com`) |
| `EMAIL_PORT` | SMTP port (`587` for TLS) |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASS` | SMTP password / app password |
| `CLIENT_URL` | Frontend origin (e.g. `http://localhost:5173`) |
| `OTP_EXPIRE_SECONDS` | OTP TTL in seconds (default `300`) |

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register + queue OTP email |
| POST | `/api/v1/auth/verify-otp` | Verify OTP, issue tokens |
| POST | `/api/v1/auth/login` | Login with email + password |
| POST | `/api/v1/auth/refresh-token` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/forgot-password` | Send reset email |
| POST | `/api/v1/auth/reset-password/:token` | Reset password |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/users/:username` | Public profile |
| PUT | `/api/v1/users/me` | Update profile (multipart) |
| GET | `/api/v1/users/search?q=` | Full-text search |
| POST | `/api/v1/users/:id/follow` | Follow / send request |
| DELETE | `/api/v1/users/:id/follow` | Unfollow |
| GET | `/api/v1/users/:id/followers` | Followers (cursor paginated) |
| GET | `/api/v1/users/:id/following` | Following (cursor paginated) |
| GET | `/api/v1/users/follow-requests` | Pending follow requests |
| POST | `/api/v1/users/follow-requests/:id/accept` | Accept request |
| POST | `/api/v1/users/follow-requests/:id/reject` | Reject request |

### Posts
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/posts` | Create post (multipart, max 10 files) |
| GET | `/api/v1/posts/feed` | Home feed (cursor paginated) |
| GET | `/api/v1/posts/:id` | Single post |
| DELETE | `/api/v1/posts/:id` | Delete own post |
| POST | `/api/v1/posts/:id/like` | Toggle like |
| GET | `/api/v1/posts/:id/likes` | Who liked |
| GET | `/api/v1/posts/user/:userId` | User's posts grid |

### Reels
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/reels` | Upload reel (video + thumbnail) |
| GET | `/api/v1/reels/feed` | Ranked feed (composite cursor) |
| GET | `/api/v1/reels/:id` | Single reel |
| POST | `/api/v1/reels/:id/view` | Register view (async BullMQ) |
| POST | `/api/v1/reels/:id/like` | Toggle like |
| DELETE | `/api/v1/reels/:id` | Delete own reel |

### Stories
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/stories` | Create story (TTL 24h) |
| GET | `/api/v1/stories/feed` | Stories from following (grouped) |
| POST | `/api/v1/stories/:id/view` | Mark viewed |
| DELETE | `/api/v1/stories/:id` | Delete own story |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/chat/conversations` | Conversation list |
| GET | `/api/v1/chat/:userId` | Message history (cursor paginated) |
| POST | `/api/v1/chat/:userId` | Send message (REST fallback) |
| PATCH | `/api/v1/chat/:userId/read` | Mark messages read |

---

## 🔌 Socket.io Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `chat:send` | `{ receiverId, text, mediaUrl? }` | Send a message |
| `chat:typing` | `{ receiverId, isTyping }` | Typing indicator |
| `chat:read` | `{ senderId }` | Mark messages as read |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `chat:receive` | `Message` | New incoming message |
| `chat:sent` | `Message` | Confirm message delivered |
| `chat:typing` | `{ senderId, isTyping }` | Remote typing indicator |
| `chat:read_receipt` | `{ readBy, roomId }` | Messages were read |
| `chat:error` | `{ message }` | Send error |
| `user:online` | `{ userId }` | User came online |
| `user:offline` | `{ userId }` | User went offline |

---

## 🐳 Docker (optional)

```bash
# From project root
docker compose up --build
```

---

## 📦 Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Use PM2: `pm2 start server.js --name api` + `pm2 start jobs/worker.js --name worker`
3. Use Redis Cloud / ElastiCache
4. Use MongoDB Atlas M10+

### Frontend
```bash
cd frontend && npm run build
# Deploy /dist to Vercel, Netlify, or Nginx
```

---

## 🏗️ Scaling Considerations

| Concern | Current | Production upgrade |
|---|---|---|
| Socket routing | In-memory Map | Redis adapter (`@socket.io/redis-adapter`) |
| Rate limiting | In-process | Redis-backed (`rate-limit-redis`) |
| Media CDN | ImageKit | Already CDN-backed ✓ |
| DB indexes | Defined in schemas | Review with `explain()` |
| Worker scaling | Single process | Multiple workers with BullMQ concurrency |
| Feed algorithm | Follow-based | ML ranking with feature store |

---

## 📜 License
MIT
