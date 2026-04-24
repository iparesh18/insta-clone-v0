# Instagram Clone V2 - Production-Oriented Social Platform

A full-stack Instagram-inspired social media platform built with a production mindset.

This project goes beyond basic CRUD and focuses on real-world engineering concerns such as:
- real-time messaging and presence,
- background job processing,
- cache-first reads,
- media optimization,
- API hardening,
- containerized deployment,
- and modular architecture for horizontal scaling.

It is suitable as a portfolio project for backend/full-stack roles where system design and scalability matter.

---

## 1) Product Scope

### Core Social Features
- Authentication with JWT and protected routes
- Posts, reels, stories, comments, likes, saves, shares
- Follow system (including private-account style access control)
- Direct messaging with real-time delivery
- Notification system with queue-based processing
- Search across users/content
- Analytics dashboard for creator-style insights

### Advanced UX Features
- Typing indicators
- Delivered/seen message status
- Online/last-seen presence
- Smart notification behavior in chat context
- Account settings and account deletion flow

### GenAI Feature
- AI caption + hashtag generator using Gemini API
- Supports image-aware captioning (base64 image input)
- Handles quota exhaustion with a safe fallback generator

---

## 2) High-Level Architecture

### Frontend
- React + Vite SPA
- Zustand for client state
- Axios for API communication
- Socket.IO client for real-time events
- TailwindCSS + Radix primitives for UI composition

### Backend API
- Node.js + Express REST API
- Mongoose data access on MongoDB
- Redis for low-latency cache and presence state
- Socket.IO server for real-time messaging/presence
- BullMQ queues for asynchronous jobs

### Worker Layer
- Dedicated worker process consumes BullMQ queues
- Handles notification and reel-view jobs independently from API process
- Allows independent scaling of background throughput

### Infrastructure
- Docker Compose setup for local orchestration
- Services: frontend, backend, worker, MongoDB, Redis

---

## 3) Scalability Strategy (How This App Scales)

This codebase includes practical scaling patterns used in production systems.

### A) Read Scalability via Redis Caching
- Feed responses are cached per user/page with TTL
- Analytics responses are cached with TTL
- Cache invalidation hooks are present for consistency-sensitive flows

Impact:
- reduces repeated heavy queries,
- improves p95 response times for hot endpoints,
- lowers MongoDB load under concurrent traffic.

### B) Real-Time Scalability via Socket.IO + Redis Presence
- Real-time chat, typing, read receipts, and online status
- Presence state stored in Redis with expiration and heartbeat refresh
- Personal rooms and chat rooms used for targeted event fanout

Impact:
- avoids polling,
- minimizes unnecessary network chatter,
- keeps real-time state fast and centralized.

### C) Throughput Scalability via Queue-Based Async Processing
- BullMQ queues isolate non-critical async workloads
- Separate worker process runs with tuned concurrency
- Retries + backoff configured for resilience

Impact:
- API remains responsive during spikes,
- background tasks are retried safely,
- worker replicas can be scaled independently.

### D) Media Scalability via Compression + External Object Storage
- Image compression middleware (Sharp) before upload
- Media stored on ImageKit (offloads app server and database)

Impact:
- lower bandwidth and storage costs,
- faster media delivery,
- better UX on slow networks.

### E) API Hardening for Production Traffic
- Helmet for secure headers
- CORS with credentials control
- Global and route-specific rate limiting
- Request validation with express-validator
- Centralized error handling and structured logging

Impact:
- safer APIs,
- predictable failure handling,
- better observability and operability.

### F) Process-Level Scalability
- Stateless API design allows horizontal API scaling
- Worker process separated from request-serving process
- Dockerized services simplify local and cloud deployment parity

---

## 4) Tech Stack and Why It Was Chosen

### Frontend
- React 18: component model and ecosystem maturity
- Vite: fast dev server and build performance
- Zustand: lightweight state management for app-level state
- Socket.IO client: reliable real-time transport and reconnection
- TailwindCSS + Radix UI: rapid, accessible UI development

### Backend
- Node.js + Express: high productivity for API and real-time workloads
- MongoDB + Mongoose: flexible schema evolution for social features
- Redis + ioredis: low-latency cache and ephemeral state
- BullMQ: robust Redis-backed job queueing
- Socket.IO: bidirectional real-time communication
- Sharp: server-side media optimization
- ImageKit: media CDN/storage abstraction
- Winston + Morgan: logging and request visibility

### AI/ML
- Google Gemini API via @google/genai SDK
- Structured generation for caption + hashtags
- Fallback behavior for quota exhaustion to preserve UX

---

## 5) Project Structure

- frontend: React app (pages, components, hooks, store, API client)
- backend: Express API, models, controllers, routes, middlewares
- backend/jobs: queue worker and handlers
- backend/queues: BullMQ queue definitions
- backend/redis: Redis client + cache/presence helpers
- backend/socket: Socket.IO manager and real-time events
- docker-compose.yml: local multi-service orchestration

---

## 6) Key Engineering Highlights for Resume

- Designed a modular social platform architecture with clear separation between API, real-time layer, and worker layer.
- Implemented cache-first patterns with Redis for feed and analytics endpoints.
- Built real-time chat with typing indicators, message states, and online/last-seen presence tracking.
- Introduced queue-based async processing with BullMQ and dedicated workers for non-blocking request handling.
- Optimized media ingestion pipeline using Sharp compression and ImageKit offload.
- Added AI-assisted caption + hashtag generation with graceful fallback strategy for quota failures.
- Hardened APIs using validation, rate limiting, secure middleware, and centralized error handling.

---

## 7) Running Locally

### Option 1: Docker Compose (Recommended)

1. Create backend environment file at backend/.env
2. Add required environment variables (sample below)
3. Start all services:

```bash
docker compose up --build
```

4. Open app at:
- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/health

### Option 2: Run Services Manually

1. Start MongoDB and Redis
2. Backend:

```bash
cd backend
npm install
npm run dev
```

3. Worker (new terminal):

```bash
cd backend
npm run worker
```

4. Frontend:

```bash
cd frontend
npm install
npm run dev
```

---

## 8) Environment Variables (Backend)

Create backend/.env with values for your environment.

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

MONGO_URI=mongodb://localhost:27017/instagram_clone
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
JWT_ACCESS_EXPIRE=7d
JWT_REFRESH_EXPIRE=7d

IMAGEKIT_PUBLIC_KEY=replace_me
IMAGEKIT_PRIVATE_KEY=replace_me
IMAGEKIT_URL_ENDPOINT=replace_me

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=replace_me
SMTP_PASS=replace_me
SMTP_FROM=replace_me
APP_URL=http://localhost:5173

GEMINI_API_KEY=replace_me
GEMINI_MODEL=gemini-2.5-flash

VAPID_PUBLIC_KEY=replace_me
VAPID_PRIVATE_KEY=replace_me
VAPID_SUBJECT=mailto:replace_me@example.com
```

Security note:
Never commit real secrets to version control. Use environment-specific secret managers in production.

---

## 9) API Surface (Summary)

Main API base: /api/v1

- /auth: register, login, logout, me
- /verify: email verification flows
- /users: profile, follow graph, suggestions, settings
- /posts: feed, create, like, save, comments, AI caption generation
- /reels: upload, feed, interactions
- /stories: create/view/delete
- /chat: conversations, messages, read states
- /share: share posts/reels
- /search: global search
- /notifications: list/read
- /analytics: dashboard metrics

---

## 10) Testing and Quality

- Validation-focused tests with Jest + Supertest
- Request validation layer for all major routes
- Centralized error middleware for uniform API failures

Recommended next upgrades:
- CI pipeline with test + lint + build gates
- load testing (k6/Artillery) for feed/chat endpoints
- Redis key strategy using scan-friendly invalidation patterns at larger key volume

---

## 11) Deployment Notes

For production deployment:
- run API and worker as separate services,
- use managed MongoDB and Redis,
- place API behind reverse proxy/load balancer,
- enable structured log shipping and metrics,
- configure autoscaling policies for API and worker separately.

---

## 12) Resume Pitch (Short Version)

Built a production-oriented Instagram-style platform using React, Node.js, MongoDB, Redis, Socket.IO, and BullMQ. Implemented cache-first feed reads, real-time chat/presence, queue-based background processing, media optimization pipeline, analytics APIs, and AI-powered caption generation with graceful fallback behavior.
