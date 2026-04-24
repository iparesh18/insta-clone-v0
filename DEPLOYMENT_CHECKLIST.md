# 🚀 Quick Deployment Checklist: Render + Vercel

## Phase 1: Prerequisites (Do This First!)

### 1. Generate Web Push VAPID Keys (One-time)
```bash
cd backend
npx web-push generate-vapid-keys
```
**Save these keys somewhere safe** - you'll need them for both backend and frontend.

### 2. Create Required Accounts & Services
- [ ] **MongoDB Atlas** - https://www.mongodb.com/cloud/atlas
  - Create cluster
  - Create database user (username + password)
  - Get connection string: `mongodb+srv://username:password@cluster.xxxxx.mongodb.net/instagram`

- [ ] **Redis Cloud** - https://redis.com/try-free/ (OR use Render Redis addon)
  - Create database
  - Get connection string: `redis://username:password@host:port`

- [ ] **ImageKit** - https://imagekit.io
  - Sign up
  - Get: Public Key, Private Key, URL Endpoint

- [ ] **Gmail App Password** - https://myaccount.google.com/apppasswords
  - Enable 2FA on Google Account
  - Generate App Password for Mail
  - Save the password

- [ ] **Google Gemini API Key** - https://aistudio.google.com/app/apikeys
  - Create API key
  - Enable Gemini API in Google Cloud Console

---

## Phase 2: Deploy Backend to Render

### Step 1: Connect Repository
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select `instagram-clone-v2` repository
5. Authorize GitHub access

### Step 2: Configure Render Service

**Basic Settings:**
```
Service Name: instagram-clone-backend
Repository: your-repo/instagram-clone-v2
Branch: main
Runtime: Node
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

### Step 3: Add Environment Variables

Click "Advanced" → "Add Environment Variable"

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | `mongodb+srv://username:password@cluster.xxxxx.mongodb.net/instagram` |
| `REDIS_URL` | `redis://username:password@host:port` |
| `CLIENT_URL` | `https://your-frontend-url.vercel.app` |
| `JWT_SECRET` | Generate strong random: `openssl rand -base64 32` |
| `JWT_EXPIRE` | `7d` |
| `IMAGEKIT_PUBLIC_KEY` | Your ImageKit public key |
| `IMAGEKIT_PRIVATE_KEY` | Your ImageKit private key |
| `IMAGEKIT_URL_ENDPOINT` | `https://ik.imagekit.io/your_id` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Your Gmail App Password |
| `SMTP_FROM` | `noreply@yourdomain.com` |
| `APP_URL` | `https://your-frontend-url.vercel.app` |
| `GEMINI_API_KEY` | Your Gemini API key |
| `VAPID_PUBLIC_KEY` | Your VAPID public key |
| `VAPID_PRIVATE_KEY` | Your VAPID private key |
| `VAPID_SUBJECT` | `mailto:your-email@example.com` |

### Step 4: Deploy
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. **Save the URL** → Something like: `https://instagram-clone-backend.onrender.com`

### Step 5: Verify Backend is Working
- Visit: `https://your-backend-url.onrender.com/api/v1` (should show 404 or error)
- Check logs for any errors

---

## Phase 3: Deploy Frontend to Vercel

### Step 1: Connect Repository
1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Select `instagram-clone-v2` repository

### Step 2: Configure Project

**Build Settings:**
```
Framework: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Node.js Version: 18.x or higher
```

### Step 3: Add Environment Variables

Click "Environment Variables" and add:

| Variable | Value |
|----------|-------|
| `VITE_VAPID_PUBLIC_KEY` | Your VAPID public key |

### Step 4: Update Backend URL (if using explicit URL)

If you want to use explicit backend URL instead of relative paths, add:

| Variable | Value |
|----------|-------|
| `VITE_BACKEND_URL` | `https://your-backend-url.onrender.com/api/v1` |

Then update `frontend/src/api/axios.js`:
```javascript
baseURL: process.env.VITE_BACKEND_URL || "/api/v1"
```

### Step 5: Deploy
1. Click "Deploy"
2. Wait for build (3-5 minutes)
3. **Save the Frontend URL** → Something like: `https://instagram-clone.vercel.app`

### Step 6: Update Backend CORS
1. Go back to Render dashboard
2. Update `CLIENT_URL` env variable to your Vercel URL
3. Trigger a redeploy

---

## Phase 4: Post-Deployment Testing

### Backend Checks:
- [ ] Backend URL is accessible
- [ ] MongoDB is connected (check logs)
- [ ] Redis is connected (check logs)
- [ ] No errors in Render logs

### Frontend Checks:
- [ ] Frontend builds without errors
- [ ] Frontend is accessible at Vercel URL
- [ ] Can login (API calls work)
- [ ] Push notifications enabled (console should show subscription attempts)
- [ ] Image uploads work

### Full Integration Test:
1. Go to frontend URL
2. Register new account
3. Verify email
4. Login
5. Create a post with image
6. Check if image uploaded to ImageKit
7. Enable push notifications
8. Check if notifications work

---

## 🔗 Links You'll Need

| Service | Link |
|---------|------|
| MongoDB Atlas | https://cloud.mongodb.com |
| Redis Cloud | https://redis.com/try-free |
| ImageKit | https://imagekit.io |
| Gmail App Passwords | https://myaccount.google.com/apppasswords |
| Google Gemini API | https://aistudio.google.com/app/apikeys |
| Render Dashboard | https://dashboard.render.com |
| Vercel Dashboard | https://vercel.com/dashboard |
| Web Push VAPID Generator | https://tools.w3cub.com/vapid-keygen |

---

## ⚠️ Important Notes

### If Backend Won't Start:
1. Check all env variables are set correctly
2. Test MongoDB connection string locally
3. Test Redis connection string locally
4. Check logs in Render dashboard

### If Frontend Won't Load Backend:
1. Verify `CLIENT_URL` is set correctly in backend
2. Verify CORS is enabled (check app.js)
3. Check browser console for CORS errors
4. Verify backend URL is correct in frontend

### If Push Notifications Don't Work:
1. Verify `VITE_VAPID_PUBLIC_KEY` is set on frontend
2. Verify both VAPID keys match between services
3. Check service worker is loading
4. Browser permission for notifications is granted

---

## 📝 Environment Variables Summary

### Backend Needs:
```
✓ NODE_ENV, PORT
✓ MONGO_URI, REDIS_URL
✓ CLIENT_URL, APP_URL
✓ JWT_SECRET, JWT_EXPIRE
✓ IMAGEKIT (public key, private key, endpoint)
✓ SMTP (host, port, user, pass, from)
✓ GEMINI_API_KEY
✓ VAPID (public key, private key, subject)
```

### Frontend Needs:
```
✓ VITE_VAPID_PUBLIC_KEY
✓ VITE_BACKEND_URL (optional, uses /api/v1 by default)
```

---

**🎉 Once all checks pass, your app is live!**

---

## 📞 Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Backend deployment fails | Check build logs, verify `backend` has `package.json` |
| Frontend build fails | Verify Node version 18+, check `package.json` in frontend |
| CORS errors | Update `CLIENT_URL` in backend, check app.js CORS settings |
| Emails not sending | Verify Gmail App Password, SMTP settings correct |
| Push notifications fail | Check VAPID keys, service worker loading |
| MongoDB connection fails | Verify connection string, IP whitelist MongoDB Atlas |
| Redis connection fails | Verify connection string, URL format correct |
| Images not uploading | Verify ImageKit keys and URL endpoint |
