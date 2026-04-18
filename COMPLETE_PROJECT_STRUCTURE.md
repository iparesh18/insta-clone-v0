# 📁 Complete Project Structure - Instagram Clone v2

## Root Directory Level

```
instagram-clone-v2/
├── backend/               (Node.js + Express API)
├── frontend/              (React + Vite)
├── docker-compose.yml     (Docker orchestration)
├── README.md              (Project documentation)
├── FEATURE.md             (Feature list)
├── REELS_FEED_ANALYSIS.md (Reel feed analysis)
└── COMPLETE_PROJECT_STRUCTURE.md (This file)
```

---

## 🔧 BACKEND - Complete Structure

```
backend/
├── 📄 app.js                           # Express app setup & middleware config
├── 📄 server.js                        # Server entry point
├── 📄 package.json                     # Dependencies & scripts
├── 📄 package-lock.json                # Locked versions
├── 📄 Dockerfile                       # Docker image
├── 📄 .env                             # Environment variables
│
├── 📁 config/                          # Configuration files
│   ├── 📄 db.js                        # MongoDB connection
│   └── 📄 imagekit.js                  # ImageKit CDN setup
│
├── 📁 models/                          # MongoDB Schemas
│   ├── 📄 User.js                      # User schema (username, email, profile)
│   ├── 📄 Post.js                      # Post schema (caption, media, likes)
│   ├── 📄 Like.js                      # Like schema (postId, userId)
│   ├── 📄 Comment.js                   # Comment schema (text, author, postId)
│   ├── 📄 Follow.js                    # Follow schema (follower, following)
│   ├── 📄 Reel.js                      # Reel schema (video, views, likes)
│   ├── 📄 Story.js                     # Story schema (image, expiring)
│   ├── 📄 Message.js                   # Message schema (chat messages, roomId)
│   ├── 📄 Notification.js              # Notification schema (like, comment, follow)
│   └── 📄 Share.js                     # Share schema (shared content links)
│
├── 📁 controllers/                     # Business logic
│   ├── 📄 auth.controller.js           # Login, register, logout, token refresh
│   ├── 📄 user.controller.js           # Profile, follow, suggestions, search
│   ├── 📄 post.controller.js           # Create, update, delete posts
│   ├── 📄 reel.controller.js           # Create, delete reels, view tracking
│   ├── 📄 story.controller.js          # Create, delete stories
│   ├── 📄 chat.controller.js           # Messages, conversations, delete chat
│   ├── 📄 notification.controller.js   # Fetch, mark read notifications
│   ├── 📄 search.controller.js         # Search users, posts, reels, hashtags
│   └── 📄 share.controller.js          # Share posts/reels functionality
│
├── 📁 routes/                          # API Endpoints
│   ├── 📄 auth.routes.js               # /api/v1/auth (POST /login, /register)
│   ├── 📄 user.routes.js               # /api/v1/users (follow, profile, suggestions)
│   ├── 📄 post.routes.js               # /api/v1/posts (CRUD, like, comment, save)
│   ├── 📄 reel.routes.js               # /api/v1/reels (CRUD, like, view)
│   ├── 📄 story.routes.js              # /api/v1/stories (CRUD, view)
│   ├── 📄 chat.routes.js               # /api/v1/chat (messages, delete conversation)
│   ├── 📄 notification.routes.js       # /api/v1/notifications (fetch, mark read)
│   ├── 📄 search.routes.js             # /api/v1/search (global search)
│   └── 📄 share.routes.js              # /api/v1/share (share functionality)
│
├── 📁 middlewares/                     # Middleware functions
│   ├── 📄 auth.js                      # protect() - JWT verification
│   ├── 📄 errorHandler.js              # Global error handling
│   ├── 📄 upload.js                    # Multer file upload handling
│   ├── 📄 rateLimiter.js               # Rate limiting (prevent spam)
│   └── 📄 imageCompression.js          # Image compression before upload
│
├── 📁 utils/                           # Helper utilities
│   ├── 📄 apiResponse.js               # sendSuccess(), sendError() helpers
│   ├── 📄 jwt.js                       # generateToken(), verifyToken()
│   ├── 📄 logger.js                    # Logging utilities
│   └── 📄 uploadToImageKit.js          # Upload files to ImageKit CDN
│
├── 📁 redis/                           # Redis cache helpers
│   ├── 📄 redisClient.js               # Redis connection & setup
│   └── 📄 redisHelpers.js              # Cache-aside pattern helpers
│
├── 📁 queues/                          # BullMQ job queues
│   └── 📄 index.js                     # Queue instances (notification, email)
│
├── 📁 jobs/                            # Background job processing
│   ├── 📄 worker.js                    # Main worker process (listens to queues)
│   │
│   └── 📁 handlers/                    # Queue job handlers
│       ├── 📄 notificationHandler.js   # Process notification jobs
│       └── 📄 reelViewHandler.js       # Process reel view tracking
│
├── 📁 socket/                          # WebSocket (Socket.io)
│   └── 📄 socketManager.js             # Socket.io event handlers (chat, notifications)
│
├── 📁 logs/                            # Application logs
│   └── (log files generated at runtime)
│
└── 📁 tmp/                             # Temporary files
    └── 📁 uploads/                     # Temporary file uploads (before CDN sync)
        ├── 1775388014118-44547582-miyamoto.jpg
        ├── 1775388002955-27773818-miyamoto.jpg
        ├── 1775387794262-219176690-a7e90dd7938852e3d34a4d72af6165e1.jpg
        ├── 1775387779463-570678388-miyamoto-musashi-anime-clouds-portrait-manga-hd-wallpaper-preview.jpg
        ├── 1775387749340-998114320-miyamoto.jpg
        ├── 1775378330976-663855002-316702.mp4
        └── 1775378298313-89558327-316702.mp4
```

---

## 🎨 FRONTEND - Complete Structure

```
frontend/
├── 📄 index.html                       # Entry HTML file
├── 📄 package.json                     # Dependencies & scripts
├── 📄 package-lock.json                # Locked versions
├── 📄 vite.config.js                   # Vite bundler config
├── 📄 tailwind.config.js               # TailwindCSS theming
├── 📄 postcss.config.js                # PostCSS plugins
├── 📄 Dockerfile                       # Docker image
│
├── 📁 src/
│   ├── 📄 main.jsx                     # React entry point
│   ├── 📄 App.jsx                      # Main app component & routing
│   ├── 📄 index.css                    # Global styles
│   │
│   ├── 📁 api/                         # API communication
│   │   ├── 📄 axios.js                 # Axios instance with interceptors
│   │   └── 📄 services.js              # API methods (authAPI, userAPI, postAPI, etc.)
│   │
│   ├── 📁 components/                  # Reusable React components
│   │   │
│   │   ├── 📁 layout/                  # Layout wrappers
│   │   │   ├── 📄 AuthLayout.jsx       # Layout for login/register pages
│   │   │   ├── 📄 MainLayout.jsx       # Main app layout with sidebar & navbar
│   │   │   └── 📄 Breadcrumbs.jsx      # Breadcrumb navigation component
│   │   │
│   │   ├── 📁 ui/                      # Common UI components
│   │   │   ├── 📄 Avatar.jsx           # User avatar component
│   │   │   ├── 📄 Toast.jsx            # Toast notifications
│   │   │   └── 📄 SettingsModal.jsx    # Settings/preferences modal
│   │   │
│   │   ├── 📁 post/                    # Post related components
│   │   │   ├── 📄 CreatePostModal.jsx  # Create new post modal
│   │   │   ├── 📄 PostCard.jsx         # Post display card
│   │   │   ├── 📄 PostCardSkeleton.jsx # Loading skeleton for posts
│   │   │   ├── 📄 PostDetailModal.jsx  # Detailed post view modal
│   │   │   └── 📄 ShareModal.jsx       # Share post modal
│   │   │
│   │   ├── 📁 reel/                    # Reel (short video) components
│   │   │   ├── 📄 CreateReelModal.jsx  # Create reel modal
│   │   │   ├── 📄 ReelItem.jsx         # Single reel display
│   │   │   ├── 📄 ReelModal.jsx        # Full screen reel view
│   │   │   └── 📄 ReelCommentSheet.jsx # Reel comments bottom sheet
│   │   │
│   │   ├── 📁 story/                   # Story components
│   │   │   └── 📄 StoriesBar.jsx       # Stories carousel/bar
│   │   │
│   │   ├── 📁 search/                  # Search components
│   │   │   └── 📄 SearchBar.jsx        # Search input with autocomplete
│   │   │
│   │   ├── 📁 profile/                 # Profile components
│   │   │   └── 📄 SuggestedUsers.jsx   # Suggested users to follow
│   │   │
│   │   └── 📁 chat/                    # Chat components (if separate from pages)
│   │       └── (Chat UI in ChatPage.jsx)
│   │
│   ├── 📁 pages/                       # Page/Route components
│   │   ├── 📄 HomePage.jsx             # Home feed page
│   │   ├── 📄 ExplorePage.jsx          # Explore/discover page
│   │   ├── 📄 ReelsPage.jsx            # Reels/shorts page
│   │   ├── 📄 ChatPage.jsx             # Messages/chat page
│   │   ├── 📄 NotificationPage.jsx     # Notifications page
│   │   ├── 📄 ProfilePage.jsx          # User profile page
│   │   ├── 📄 SearchPage.jsx           # Search results page
│   │   ├── 📄 SharedFeedPage.jsx       # Feed of shared posts
│   │   ├── 📄 LoginPage.jsx            # Login page
│   │   ├── 📄 RegisterPage.jsx         # Registration page
│   │   └── 📄 NotFoundPage.jsx         # 404 page
│   │
│   ├── 📁 store/                       # Zustand state management
│   │   ├── 📄 authStore.js             # Auth state (user, login, logout)
│   │   ├── 📄 socketStore.js           # Socket.io connection state
│   │   ├── 📄 notificationStore.js     # Notifications state
│   │   ├── 📄 postsStore.js            # Posts cache state
│   │   ├── 📄 reelsStore.js            # Reels cache state
│   │   └── 📄 themeStore.js            # Theme preferences (dark/light)
│   │
│   ├── 📁 hooks/                       # Custom React hooks
│   │   ├── 📄 useDebounce.js           # Debounce hook for search
│   │   └── 📄 useNotificationListener.js # Notification listener hook
│   │
│   └── 📁 utils/                       # Utility functions
│       └── 📄 date.js                  # Date formatting utilities
```

---

## 📊 File Count Summary

### Backend Files Count
- **Config**: 2 files
- **Models**: 10 files  
- **Controllers**: 9 files
- **Routes**: 9 files
- **Middlewares**: 5 files
- **Utils**: 4 files
- **Redis**: 2 files
- **Queues**: 1 file
- **Jobs**: 3 files (1 worker + 2 handlers)
- **Socket**: 1 file
- **Root**: 4 files (app.js, server.js, package.json, Dockerfile, .env)
- **Total Backend Source Files**: ~59 files

### Frontend Files Count
- **Pages**: 11 files
- **Components**: 23 files (across 7 categories)
- **Store**: 6 files
- **API**: 2 files
- **Hooks**: 2 files
- **Utils**: 1 file
- **Root**: 6 files (index.html, vite.config.js, tailwind.config.js, postcss.config.js, package.json, Dockerfile)
- **Total Frontend Source Files**: ~51 files

---

## 🔗 Key Relationships

### Authentication Flow
```
LoginPage → Auth API → auth.controller → User Model → JWT Utils → Socket Auth
```

### Post Creation Flow
```
CreatePostModal → Post API → Multer Upload → ImageKit CDN → post.controller → Post Model → Queue → Notification
```

### Real-Time Chat Flow
```
ChatPage → Socket.io → socketManager → Message Model → Chat Controller → Notification Queue
```

### Feed Display Flow
```
HomePage → Posts API → post.controller → Query Posts + Follow → Redis Cache → UI
```

### Reel Video Flow
```
CreateReelModal → Upload → ImageKit → reel.controller → Reel Model → View Tracking → Queue Worker
```

---

## 📦 Database Models Relationships

```
┌─────────────────────────────────────────────┐
│              USER                           │
├─────────────────────────────────────────────┤
│ _id, username, email, password              │
│ fullName, bio, profilePicture               │
│ followers[], following[]                    │
└──────────────┬──────────────────────────────┘
               │
        ┌──────┴──────┬──────────┬──────────┐
        ↓             ↓          ↓          ↓
    ┌──────┐   ┌────────┐  ┌─────┐  ┌─────────┐
    │ POST │   │ REEL   │  │STORY│  │ MESSAGE │
    └──────┘   └────────┘  └─────┘  └─────────┘
        │           │         │          │
        ├─→ LIKE   ·├─→ LIKE  │          │
        ├─→ COMMENT ├─→COMMENT│          │
        └─→ COMMENT │         │          │
                    └─→ VIEW  │          │
                              │          │
                        ┌─────┴──────┐   │
                        │ STORY      │   │
                        │ (ephemeral)│   │
                        └────────────┘   │
                              
    ┌──────────────────────────────────────────┐
    │          NOTIFICATION                    │
    │ recipient, actor, type, relatedId, isRead│
    └──────────────────────────────────────────┘

    ┌──────────────────────────────────────────┐
    │          FOLLOW                          │
    │ follower, following, createdAt           │
    └──────────────────────────────────────────┘
```

---

## 🚀 Entry Points

### Backend Server
- **Start**: `node backend/server.js`
- **Main File**: `backend/server.js`
- **Port**: 5000 (default)

### Backend Worker
- **Start**: `node backend/jobs/worker.js`
- **Purpose**: Process background jobs (notifications, etc.)

### Frontend Dev Server
- **Start**: `npm run dev` (from frontend)
- **Port**: 5173 (default Vite)
- **Build**: `npm run build`

### Docker
- **Compose**: `docker-compose up`
- **Services**: backend, frontend, mongodb, redis

---

## 🔐 Environment Variables (Backend .env)

```
# Database
MONGO_URI=mongodb://...

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d

# Redis
REDIS_URL=redis://localhost:6379

# ImageKit CDN
IMAGEKIT_URL_ENDPOINT=https://...
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key

# Server
PORT=5000
NODE_ENV=development
```

---

## 📝 Notes

### Why This Structure?

1. **Separation of Concerns**
   - Models = Data structure
   - Controllers = Business logic
   - Routes = API endpoints
   - Middlewares = Cross-cutting concerns

2. **Scalability**
   - Jobs + Worker = Async processing
   - Redis = Caching layer
   - Socket.io = Real-time updates

3. **Frontend Organization**
   - Pages = Route-level components
   - Components = Reusable units
   - Store = Global state
   - API = Data fetching layer

4. **Security**
   - Auth middleware protects routes
   - JWT tokens for session
   - Rate limiting prevents abuse
   - Input validation at controller level

---

## ✅ All Files Listed Above

**Total Backend Files**: ~59  
**Total Frontend Files**: ~51  
**Total Project Files**: ~110+ (excluding node_modules and logs)

This structure supports:
- ✅ User authentication (JWT + passwords)
- ✅ Post/Reel/Story creation and management
- ✅ Like, Comment, Follow systems
- ✅ Real-time chat (Socket.io)
- ✅ Notifications
- ✅ Search functionality
- ✅ Feed ranking and pagination
- ✅ Background job processing
- ✅ Image CDN integration
- ✅ Responsive UI with React

