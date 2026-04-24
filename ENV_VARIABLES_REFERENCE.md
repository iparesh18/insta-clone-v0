# Environment Variables: Development vs Production

## Quick Reference: What Changes Between Dev & Production

---

## Backend Environment Variables Changes

### 1. **NODE_ENV** - Environment Mode
```
Development:  NODE_ENV=development
Production:   NODE_ENV=production
```

### 2. **PORT** - Server Port
```
Development:  PORT=5000 (or omit, defaults to 5000)
Production:   Leave empty or use 10000
              (Render assigns dynamic port automatically)
```

### 3. **MONGO_URI** - Database Connection
```
Development:  MONGO_URI=mongodb://localhost:27017/instagram
              (Local MongoDB with docker-compose)

Production:   MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/instagram?retryWrites=true&w=majority
              (MongoDB Atlas - remote cloud database)
```

### 4. **REDIS_URL** - Cache & Queue Connection
```
Development:  REDIS_URL=redis://localhost:6379
              (Local Redis with docker-compose)

Production:   REDIS_URL=redis://username:password@redis-hostname:port/0
              (Redis Cloud or Render Redis addon)
```

### 5. **CLIENT_URL** - Frontend URL (CORS)
```
Development:  CLIENT_URL=http://localhost:5173
              (Local frontend dev server)

Production:   CLIENT_URL=https://instagram-clone.vercel.app
              (Your Vercel deployment URL)
```

### 6. **APP_URL** - Frontend URL (Email Links)
```
Development:  APP_URL=http://localhost:5173
              (Local frontend)

Production:   APP_URL=https://instagram-clone.vercel.app
              (Same as CLIENT_URL for production)
```

### 7. **JWT_SECRET** - Authentication Secret
```
Development:  JWT_SECRET=dev-secret-key
              (Simple key for local testing)

Production:   JWT_SECRET=<strong-random-32+ chars>
              Generate: openssl rand -base64 32
```

### 8. **JWT_EXPIRE** - Token Expiration
```
Development:  JWT_EXPIRE=7d
              (1 week for convenience)

Production:   JWT_EXPIRE=7d
              (Same, or adjust to your needs)
```

### 9. **IMAGEKIT_PUBLIC_KEY** - Image Upload Service
```
Development:  IMAGEKIT_PUBLIC_KEY=your-dev-public-key
              (From ImageKit dashboard)

Production:   IMAGEKIT_PUBLIC_KEY=your-prod-public-key
              (Same service, same keys used)
```

### 10. **IMAGEKIT_PRIVATE_KEY** - Image Upload Service
```
Development:  IMAGEKIT_PRIVATE_KEY=your-dev-private-key

Production:   IMAGEKIT_PRIVATE_KEY=your-prod-private-key
```

### 11. **IMAGEKIT_URL_ENDPOINT** - Image URL Base
```
Development:  IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

Production:   IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
              (Same endpoint)
```

### 12. **SMTP_HOST** - Email Service
```
Development:  SMTP_HOST=smtp.gmail.com
              (Gmail SMTP)

Production:   SMTP_HOST=smtp.gmail.com
              (Same or your email provider)
```

### 13. **SMTP_PORT** - Email Service Port
```
Development:  SMTP_PORT=587
              (TLS - standard for Gmail)

Production:   SMTP_PORT=587
              (Same)
```

### 14. **SMTP_USER** - Email Account
```
Development:  SMTP_USER=your-email@gmail.com
              (Gmail account)

Production:   SMTP_USER=your-email@gmail.com
              (Same account or production email)
```

### 15. **SMTP_PASS** - Email Password
```
Development:  SMTP_PASS=your-app-password
              (Gmail App Password - NOT regular password)

Production:   SMTP_PASS=your-app-password
              (Same App Password)
```

### 16. **SMTP_FROM** - Email From Address
```
Development:  SMTP_FROM=noreply@yourdomain.com
              (Can be any email)

Production:   SMTP_FROM=noreply@yourdomain.com
              (Should be verified email)
```

### 17. **GEMINI_API_KEY** - AI Caption Generation
```
Development:  GEMINI_API_KEY=your-api-key
              (From Google AI Studio)

Production:   GEMINI_API_KEY=your-api-key
              (Same key or separate production key)
```

### 18. **VAPID_PUBLIC_KEY** - Web Push Notifications
```
Development:  VAPID_PUBLIC_KEY=<generated-key>
              (Generated once with web-push)

Production:   VAPID_PUBLIC_KEY=<same-generated-key>
              (MUST be same in frontend & backend)
```

### 19. **VAPID_PRIVATE_KEY** - Web Push Notifications
```
Development:  VAPID_PRIVATE_KEY=<generated-key>
              (Generated once with web-push)

Production:   VAPID_PRIVATE_KEY=<same-generated-key>
              (MUST be same in frontend & backend)
```

### 20. **VAPID_SUBJECT** - Web Push Notifications
```
Development:  VAPID_SUBJECT=mailto:your-email@example.com

Production:   VAPID_SUBJECT=mailto:your-email@example.com
              (Same)
```

---

## Frontend Environment Variables Changes

### 1. **VITE_VAPID_PUBLIC_KEY** - Web Push
```
Development:  VITE_VAPID_PUBLIC_KEY=<generated-key>
              (Same as backend VAPID_PUBLIC_KEY)

Production:   VITE_VAPID_PUBLIC_KEY=<same-key>
              (MUST match backend)
```

### 2. **VITE_BACKEND_URL** - API Base URL (Optional)
```
Development:  VITE_BACKEND_URL=http://localhost:5000
              OR leave empty (uses relative /api/v1)

Production:   VITE_BACKEND_URL=https://instagram-clone-backend.onrender.com/api/v1
              OR leave empty (frontend on same origin)
```

---

## Summary Table: What Changes?

| Variable | Dev | Prod | Reason |
|----------|-----|------|--------|
| NODE_ENV | `development` | `production` | Environment detection |
| PORT | `5000` | Dynamic (Render) | Render assigns port |
| MONGO_URI | `localhost:27017` | `mongodb+srv://...` | Remote vs local DB |
| REDIS_URL | `localhost:6379` | Cloud/Render | Remote vs local cache |
| CLIENT_URL | `localhost:5173` | Vercel URL | CORS domain changes |
| APP_URL | `localhost:5173` | Vercel URL | Email links domain |
| JWT_SECRET | Simple | Strong random | Security in production |
| IMAGEKIT_* | Same | Same | No changes |
| SMTP_* | Same | Same | No changes (same service) |
| GEMINI_API_KEY | Same | Same | No changes |
| VAPID_* | Same | Same | No changes (must match!) |
| VITE_VAPID_PUBLIC_KEY | Same | Same | Must match backend |
| VITE_BACKEND_URL | `localhost:5000` | Render URL | API endpoint changes |

---

## What Does NOT Change?

✓ **IMAGEKIT** keys - same for all environments
✓ **SMTP** credentials - same email service
✓ **GEMINI_API_KEY** - same API key
✓ **VAPID keys** - must be identical across all environments
✓ **JWT_EXPIRE** - same expiration time

---

## What DOES Change?

✓ **NODE_ENV** - development → production
✓ **MONGO_URI** - local → cloud (MongoDB Atlas)
✓ **REDIS_URL** - local → cloud (Redis Cloud/Render)
✓ **CLIENT_URL** - localhost:5173 → vercel.app
✓ **APP_URL** - localhost:5173 → vercel.app
✓ **JWT_SECRET** - simple → strong random
✓ **VITE_BACKEND_URL** - localhost:5000 → render.com
✓ **PORT** - 5000 → dynamic (Render)

---

## Migration Checklist

### Before Deploying to Production:

- [ ] Generate strong JWT_SECRET with: `openssl rand -base64 32`
- [ ] Create MongoDB Atlas cluster
- [ ] Create Redis Cloud instance OR use Render Redis addon
- [ ] Deploy backend to Render
- [ ] Get backend URL from Render
- [ ] Deploy frontend to Vercel
- [ ] Get frontend URL from Vercel
- [ ] Update CLIENT_URL in backend to Vercel URL
- [ ] Update APP_URL in backend to Vercel URL
- [ ] Update VITE_BACKEND_URL in frontend (if using explicit URL)
- [ ] Trigger redeploy on Render & Vercel
- [ ] Test all features (auth, posts, notifications, etc.)

---

## Quick Copy-Paste Templates

### Backend - Production .env
```
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/instagram
REDIS_URL=redis://username:password@host:port/0
CLIENT_URL=https://your-vercel-url.vercel.app
APP_URL=https://your-vercel-url.vercel.app
JWT_SECRET=<generated-strong-key>
JWT_EXPIRE=7d
IMAGEKIT_PUBLIC_KEY=<your-key>
IMAGEKIT_PRIVATE_KEY=<your-key>
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
GEMINI_API_KEY=<your-key>
VAPID_PUBLIC_KEY=<your-key>
VAPID_PRIVATE_KEY=<your-key>
VAPID_SUBJECT=mailto:your@example.com
```

### Frontend - Production .env
```
VITE_VAPID_PUBLIC_KEY=<your-key>
VITE_BACKEND_URL=https://your-render-url.onrender.com/api/v1
```

---

**✅ Ready to deploy!**
