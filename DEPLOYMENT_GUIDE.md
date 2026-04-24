# Deployment Guide: Render (Backend) + Vercel (Frontend)

## 📋 Project Environment Variables Scan

### **Backend Environment Variables Needed:**
```
NODE_ENV=production
PORT=10000                          # Render assigns dynamic port, but configure as fallback
MONGO_URI=                          # MongoDB Atlas connection string
REDIS_URL=                          # Redis URL (for sessions, caching, queues)
CLIENT_URL=                         # Frontend URL (for CORS)
JWT_SECRET=                         # JWT secret key
JWT_EXPIRE=                         # JWT expiration (e.g., 7d)
IMAGEKIT_PUBLIC_KEY=                # ImageKit public key
IMAGEKIT_PRIVATE_KEY=               # ImageKit private key
IMAGEKIT_URL_ENDPOINT=              # ImageKit URL endpoint
SMTP_HOST=                          # SMTP host (e.g., smtp.gmail.com)
SMTP_PORT=                          # SMTP port (587 for TLS, 465 for SSL)
SMTP_USER=                          # Email account
SMTP_PASS=                          # Email password (Gmail: use App Password)
SMTP_FROM=                          # From email address
APP_URL=                            # Backend URL (for verification links)
GEMINI_API_KEY=                     # Google Gemini API key (for AI captions)
VAPID_PUBLIC_KEY=                   # Web Push VAPID public key
VAPID_PRIVATE_KEY=                  # Web Push VAPID private key
VAPID_SUBJECT=                      # VAPID subject (your email: mailto:your@email.com)
```

### **Frontend Environment Variables Needed:**
```
VITE_VAPID_PUBLIC_KEY=              # Web Push VAPID public key (same as backend)
```

---

## 🚀 Deployment Order

### **STEP 1: Backend Deployment (Render)**
### **STEP 2: Frontend Deployment (Vercel)**

---

## 📦 STEP 1: Deploy Backend to Render

### 1.1 Prerequisites
- MongoDB Atlas account with a database
- Redis Cloud account (or use Render's Redis addon)
- ImageKit account (for image uploads)
- Gmail account with App Password
- Google Gemini API key
- Web Push VAPID keys

### 1.2 Generate Web Push VAPID Keys (if not already done)
```bash
cd backend
npx web-push generate-vapid-keys
```
Save the keys - you'll need them for both backend and frontend.

### 1.3 Create Render Account & Connect Repository
1. Go to https://render.com
2. Sign up and connect your GitHub repository
3. Create a new Web Service

### 1.4 Render Configuration

#### **Basic Settings:**
- **Name:** instagram-clone-backend
- **Repository:** Your GitHub repo
- **Branch:** main
- **Root Directory:** `backend`
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`

#### **Environment Variables** (in Render Dashboard):
Add these in the "Environment" section:

```
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/instagram?retryWrites=true&w=majority
REDIS_URL=redis://username:password@redis-host:port/0
CLIENT_URL=https://your-frontend-vercel-url.vercel.app
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRE=7d
IMAGEKIT_PUBLIC_KEY=your-imagekit-public-key
IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-imagekit-id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
APP_URL=https://your-frontend-vercel-url.vercel.app
GEMINI_API_KEY=your-google-gemini-api-key
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@gmail.com
```

#### **Port Configuration:**
- Render assigns a dynamic PORT via environment variable
- Remove/Override PORT in env if needed (Render defaults to 10000)
- The code already uses: `const PORT = process.env.PORT || 5000;`

#### **Deploy:**
1. Click "Deploy"
2. Wait for build to complete
3. Note your Render URL: `https://your-service-name.onrender.com`

---

## 🌐 STEP 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account & Connect Repository
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import your project

### 2.2 Vercel Configuration

#### **Basic Settings:**
- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

#### **Environment Variables** (in Vercel Dashboard):
Add these in the "Environment Variables" section:

```
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

#### **Update Backend API URL:**
Since frontend uses relative paths (`/api/v1`), configure the proxy:
- Frontend dev uses: `vite.config.js` proxy to `http://localhost:5000`
- Production will use the backend URL from Render automatically if you configure reverse proxy

**Alternative: Update axios.js for production**
If you need explicit backend URL in production, modify `frontend/src/api/axios.js`:

```javascript
const api = axios.create({
  baseURL: process.env.VITE_BACKEND_URL || "/api/v1",
  withCredentials: true,
  timeout: 300000,
});
```

Then add to Vercel env vars:
```
VITE_BACKEND_URL=https://your-render-backend-url.onrender.com/api/v1
```

#### **Deploy:**
1. Click "Deploy"
2. Wait for build to complete
3. Your frontend is live at the Vercel URL

---

## 🔐 Environment Variables Reference

### **MongoDB Atlas Setup:**
```
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/instagram?retryWrites=true&w=majority
```
- Create cluster at https://www.mongodb.com/cloud/atlas
- Create user with username/password
- Get connection string from "Connect" button

### **Redis Setup:**
Option 1: Use Render's Redis addon (easiest)
```
Connect in Render dashboard → Add-ons → Redis
REDIS_URL will be provided automatically
```

Option 2: Use Redis Cloud
```
Go to https://redis.com/try-free/
Create database and copy the connection string
REDIS_URL=redis://username:password@redis-host:port/0
```

### **ImageKit Setup:**
1. Sign up at https://imagekit.io
2. Go to Settings → Developer Options
3. Copy:
   - **Public Key**
   - **Private Key**
   - **URL Endpoint** (format: https://ik.imagekit.io/your_id)

### **Gmail App Password (for SMTP):**
1. Enable 2-Factor Authentication on Google Account
2. Go to https://myaccount.google.com/apppasswords
3. Generate "Mail" app password
4. Use this as `SMTP_PASS`

### **Google Gemini API Key:**
1. Go to https://aistudio.google.com/app/apikeys
2. Create API key
3. Enable Gemini API in Google Cloud Console

### **Web Push VAPID Keys:**
Generate once locally, then use everywhere:
```bash
npx web-push generate-vapid-keys
```

---

## 🔗 After Deployment: Update CORS & URLs

### Update Backend CORS:
In Render dashboard, ensure `CLIENT_URL` env var points to your Vercel URL

### Update Frontend API Calls:
The frontend should automatically use relative paths `/api/v1` which will resolve to the same domain in production.

**For explicit backend URL in production:**
```
VITE_BACKEND_URL=https://your-render-service.onrender.com/api/v1
```

---

## ✅ Deployment Checklist

### Before Deploying:
- [ ] All environment variables copied correctly
- [ ] MongoDB cluster created and user configured
- [ ] Redis instance running
- [ ] ImageKit account set up
- [ ] Gmail App Password generated
- [ ] Gemini API key generated
- [ ] VAPID keys generated
- [ ] GitHub repository is public or deploy keys configured

### After Backend Deployment:
- [ ] Backend URL is accessible
- [ ] `/api/v1` endpoints respond
- [ ] MongoDB connection works
- [ ] Redis connection works

### After Frontend Deployment:
- [ ] Frontend builds without errors
- [ ] Push notification key is configured
- [ ] Frontend can reach backend (no CORS errors)
- [ ] Login works
- [ ] Image uploads work

---

## 🐛 Troubleshooting

### **Backend won't start on Render:**
1. Check build logs for errors
2. Verify all env variables are set
3. Check MongoDB connection string
4. Verify Redis is accessible

### **Frontend build fails:**
1. Check that `VITE_VAPID_PUBLIC_KEY` is set
2. Verify Node version is 18+ (set in Vercel)
3. Clear npm cache: `npm cache clean --force`

### **CORS errors in production:**
1. Update `CLIENT_URL` in backend env vars to match Vercel URL
2. Verify the URL is correct (https://, no trailing slash)
3. Check `app.js` CORS configuration

### **Push notifications not working:**
1. Verify `VITE_VAPID_PUBLIC_KEY` is set on frontend
2. Verify `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` match between frontend and backend
3. Check service worker is registered (in `public/service-worker.js`)

### **Emails not sending:**
1. Verify Gmail App Password is correct (not regular password)
2. Check SMTP port (587 for TLS, 465 for SSL)
3. Verify `SMTP_FROM` is the same as `SMTP_USER`

---

## 📝 Create .env Files for Local Reference

### **Backend `.env` (for local development):**
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/instagram
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:5173
JWT_SECRET=dev-secret-key-min-32-characters
JWT_EXPIRE=7d
IMAGEKIT_PUBLIC_KEY=xxx
IMAGEKIT_PRIVATE_KEY=xxx
IMAGEKIT_URL_ENDPOINT=xxx
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@example.com
APP_URL=http://localhost:5173
GEMINI_API_KEY=xxx
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:your@example.com
```

### **Frontend `.env.local` (for local development):**
```
VITE_VAPID_PUBLIC_KEY=xxx
```

---

## 🚨 Important Security Notes

1. **Never commit `.env` files** to GitHub
2. **Use strong JWT_SECRET** (min 32 characters, random)
3. **Regenerate secrets** for production vs development
4. **Use environment variables** in Render/Vercel dashboards, not hardcoded
5. **Rotate API keys** regularly
6. **Use HTTPS** only in production (both Render and Vercel provide this)

---

**Your deployment is now complete! 🎉**
