# Instagram Clone v2

Production-grade Instagram-inspired social platform focused on **real-time systems, async processing, and scalable backend design**.

---

## Tech Used

**Frontend:** React, Vite, Zustand, Tailwind CSS, Axios  
**Backend:** Node.js, Express, MongoDB, Mongoose  
**Realtime:** Socket.IO  
**Performance Layer:** Redis (cache + queue + presence)  
**Async Processing:** BullMQ (workers)  
**Media:** ImageKit  
**Auth & Email:** JWT, httpOnly cookies, Nodemailer (SMTP)  
**AI:** Gemini API (caption + hashtag generation)  
**Infra:** Docker, Vercel, Render  

---

## Features (Core)

- Authentication + Email Verification  
- Profile & Account Settings (avatar, privacy toggle)  
- Posts (create, like, comment, save)  
- Reels (upload, view, engage)  
- Stories (24h expiry)  
- Follow System (public/private requests)  
- Real-time Chat (messages, typing, read receipts)  
- Real-time Notifications  
- Search & Discovery  
- Share Feature  
- Analytics Dashboard  
- AI Caption & Hashtag Generation  

---

## Advanced Features (How They Work)

### 1. Async Reels Processing
User action → API → job added to Redis queue → worker processes → DB update  

Heavy engagement logic is moved out of request cycle, keeping API fast under load.

---

### 2. BullMQ Worker System
API acts as producer → pushes jobs  
Worker acts as consumer → processes jobs concurrently  
Includes retries and backoff for failures  

Prevents blocking of main server and allows independent scaling.

---

### 3. Redis Performance Layer
- Feed responses cached with TTL  
- Analytics cached to avoid repeated aggregation  
- Presence stored in Redis (online / last seen)  
- Used as queue backend for BullMQ  

Reduces DB load and improves response time.

---

### 4. Real-time Architecture
Socket.IO handles:
- Chat messages  
- Notifications  
- Typing indicators  
- Online status  

Fallback polling ensures delivery if socket fails.

---

### 5. TTL-based Cleanup
Stories and notifications have expiry timestamps  
MongoDB TTL index automatically deletes expired data  

Removes need for cron jobs and keeps collections small.

---

### 6. Cursor-based Pagination
Uses cursor instead of skip/limit  

Maintains consistent performance for large datasets.

---

### 7. Edge Collection Design
Likes, follows, comments stored in separate collections  

Avoids large document growth and improves query efficiency.

---

### 8. API + Worker Separation
API handles requests  
Worker handles async jobs  

Allows scaling both independently and isolates failures.

---

## How This Differs from Typical Clones

| Area | Typical Clone | This Project |
|------|-------------|-------------|
| Architecture | Monolithic | API + Worker split |
| Feed | Direct DB queries | Redis cached |
| Reels | Sync updates | Async queue processing |
| Chat | Polling | Real-time sockets |
| Notifications | Basic API | Real-time + fallback |
| Cleanup | Manual/cron | TTL auto cleanup |
| Scaling | Limited | Horizontally scalable |

---

## Summary

- Event-driven real-time system  
- Async processing using queues  
- Redis as multi-purpose performance layer  
- Scalable backend architecture with worker separation  