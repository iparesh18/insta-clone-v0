# Push Notifications Setup & Testing Guide

**Status**: ✅ Frontend & Backend Fully Integrated - Ready to Test

---

## Prerequisites

- ✅ Backend running (`npm run dev`)
- ✅ Email configured in `.env` (SMTP_*)
- Dependencies to install: `web-push`, `nodemailer`

---

## Step 1: Install Dependencies

### Backend
```bash
cd backend
npm install web-push nodemailer
```

### Frontend
No new dependencies needed (uses native Web Push API)

---

## Step 2: Generate VAPID Keys

VAPID keys are encryption keys that allow your server to send push notifications. Generate them once:

```bash
cd backend
npx web-push generate-vapid-keys
```

**Output:**
```
Public Key:  BFKk0sXKHI3dKmMXo5fsNrmQaOavz1234567890...
Private Key: R5KqnO2T3nVgW4xYz123456789abcdefg...
```

**Copy both keys** - you'll need them in the next step.

---

## Step 3: Configure Backend `.env`

Update `backend/.env`:

```env
# Web Push Configuration
VAPID_PUBLIC_KEY=BFKk0sXKHI3dKmMXo5fsNrmQaOavz1234567890...
VAPID_PRIVATE_KEY=R5KqnO2T3nVgW4xYz123456789abcdefg...
VAPID_SUBJECT=mailto:iparesh18@gmail.com
```

---

## Step 4: Configure Frontend `.env`

Update `frontend/.env`:

```env
# Frontend URLs
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000

# Web Push - Use SAME public key as backend
VITE_VAPID_PUBLIC_KEY=BFKk0sXKHI3dKmMXo5fsNrmQaOavz1234567890...
```

---

## Step 5: Start Both Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Check log for:**
```
✓ Web Push notifications configured
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## Step 6: Test Push Notifications

### Option A: Automatic Test (Easiest)

1. **Open browser** → `http://localhost:5173`
2. **Login** to your account
3. **Browser will silently enable push notifications** (if permission was granted before)
4. **Check browser console** (F12 → Console) for:
   ```
   ✓ Service Worker registered
   ✓ Subscribed to push notifications
   ```

**If you see this**, push notifications are working! ✅

### Option B: Manual Test via Browser Console

1. **Open DevTools** (F12) → Console tab
2. **Paste this code:**

```javascript
// Check if already subscribed
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    if (sub) {
      console.log('✓ Already subscribed');
      console.log('Subscription:', JSON.stringify(sub.toJSON(), null, 2));
    } else {
      console.log('Not subscribed - attempting subscription...');
      subscribeNow();
    }
  });
});

// Function to subscribe
async function subscribeNow() {
  const reg = await navigator.serviceWorker.ready;
  const publicKey = document.querySelector('[data-vapid]')?.dataset.vapid || 
                    'BFKk0sXKHI3...'; // Use your VAPID public key
  
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });
  
  console.log('✓ Subscribed:', subscription.toJSON());
  
  // Send to backend
  const res = await fetch('http://localhost:5000/api/v1/users/push-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ subscription: subscription.toJSON() })
  });
  
  console.log('Backend response:', await res.json());
}

// Helper function
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

3. **Hit Enter** to run the code
4. **Allow notifications** when browser asks
5. **Check output** - should show "✓ Subscribed"

---

## Step 7: Test Push Send

### Backend Test Script

Create `backend/test-push.js`:

```javascript
require('dotenv').config();
const webpush = require('web-push');
const User = require('./models/User');
const mongoose = require('mongoose');

async function testPush() {
  // Connect to database
  await mongoose.connect(process.env.MONGO_URI);
  
  // Set VAPID
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  // Get first user with push tokens
  const user = await User.findOne({ 
    pushTokens: { $exists: true, $ne: [] } 
  });

  if (!user || user.pushTokens.length === 0) {
    console.log('No users with push subscriptions found');
    process.exit(0);
  }

  console.log(`Sending test push to user: ${user.username}`);

  // Parse subscription (stored as JSON string)
  const subscription = JSON.parse(user.pushTokens[0]);

  const payload = JSON.stringify({
    title: '🔥 Test Notification!',
    body: 'Push notifications are working!',
    icon: '/logo.png',
    badge: '/badge.png',
    tag: 'test-notification',
    data: {
      type: 'test',
      timestamp: new Date().toISOString()
    }
  });

  try {
    await webpush.sendNotification(subscription, payload);
    console.log('✓ Test notification sent!');
    console.log('Check your browser - should see a notification!');
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('✗ Subscription expired - remove from database');
    } else {
      console.error('✗ Error sending push:', error.message);
    }
  }

  process.exit(0);
}

testPush();
```

**Run it:**
```bash
cd backend
node test-push.js
```

**Result:**
- ✓ Check browser for notification
- ✓ Notification should appear even if app is closed!

---

## Step 8: Test Real Events

### Test With App Actions

Open **2 browser windows**:

**Window 1:** Logged in as User A
**Window 2:** Logged in as User B (with push subscribed)

### Test Like Notification
1. User A posts/reels something
2. User B likes the post
3. **Expected:** User B gets:
   - ✓ Real-time Socket.io notification (in-app badge)
   - ✓ Browser push notification (even if browser tab closed)

### Test Comment Notification  
1. User A posts something
2. User B comments: "Great post!"
3. **Expected:** User A gets:
   - ✓ Real-time Socket.io notification
   - ✓ Browser push notification

### Test Mention Notification
1. User A posts something
2. User B comments: "Great work @user_a!"
3. **Expected:** User A gets:
   - ✓ "mention" type Socket.io notification
   - ✓ Browser push notification saying "mentioned you"

---

## Enable Manual Push Notification Settings

If you want users to manually control push notifications:

1. Create settings page with `PushNotificationToggle` component:

```jsx
import PushNotificationToggle from '@/components/ui/PushNotificationToggle';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <PushNotificationToggle />
      </div>
    </div>
  );
}
```

2. Add route in `App.jsx`:
```jsx
<Route path="/settings" element={<SettingsPage />} />
```

---

## Architecture Overview

```
User Allow Notifications
    ↓
Service Worker Registered (/public/service-worker.js)
    ↓
Push Manager Subscribe
    ↓
Get Subscription Object
    ↓
Send to Backend (POST /api/v1/users/push-subscription)
    ↓
Backend stores in User.pushTokens
    ↓
Event Happens (like, comment, mention)
    ↓
Backend fetches User.pushTokens
    ↓
webpush.sendNotification(subscription, payload)
    ↓
Push Service Endpoint (Google/Mozilla/Microsoft)
    ↓
Browser receives push event
    ↓
Service Worker catches "push" event
    ↓
Displays notification
    ↓
User clicks → navigates to post/profile
```

---

## Frontend Components Added

### 1. `PushNotificationManager.jsx`
- Auto-initializes push on app load
- Silently subscribes if permission granted
- Placed in App.jsx, runs once

### 2. `PushNotificationToggle.jsx`
- UI component for settings page
- Enable/disable button
- Shows subscription status
- Handles permission requests

### 3. `usePushNotification()` Hook (Updated)
- Fixed imports (`useAuthStore` instead of `useAuth`)
- All methods exported: `subscribe`, `unsubscribe`, `requestPermission`
- Error handling included

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "Push notification not supported" | Browser doesn't support Web Push | Use Chrome, Firefox, Safari 16+, Edge |
| Service worker 404 error | File not in public folder | Ensure `frontend/public/service-worker.js` exists |
| "VITE_VAPID_PUBLIC_KEY not configured" | Frontend .env missing key | Add VAPID public key to `frontend/.env` |
| Keys don't match error | Public/private key mismatch | Ensure keys match between backend & frontend |
| Subscription fails silently | Permission denied | User need to allow notifications in browser |
| Test push not received | Subscription expired | Run test-push.js again after re-subscribing |
| Still no notifications | VAPID keys invalid | Regenerate with `npx web-push generate-vapid-keys` |

---

## Quick Checklist

- [ ] `npm install web-push nodemailer` in backend
- [ ] Generated VAPID keys with `npx web-push generate-vapid-keys`
- [ ] Added VAPID_PUBLIC_KEY to `backend/.env`
- [ ] Added VAPID_PRIVATE_KEY to `backend/.env`
- [ ] Added VAPID_SUBJECT to `backend/.env`
- [ ] Added VITE_VAPID_PUBLIC_KEY to `frontend/.env` (same public key)
- [ ] Backend running with `npm run dev`
- [ ] Log shows "✓ Web Push notifications configured"
- [ ] Frontend running with `npm run dev`
- [ ] Logged in and subscription created (check console)
- [ ] Created `test-push.js` and ran successfully
- [ ] Received test notification in browser
- [ ] Tested like/comment/mention events
- [ ] Push notifications working end-to-end ✅

---

## What Happens Next

When a user likes/comments/mentions:

1. **Backend creates notification** in MongoDB
2. **Fetches user.pushTokens** array
3. **For each subscription**, sends push via web-push library
4. **Browser receives push event** in service worker
5. **Displays system notification** (works even if tab is closed!)
6. **User clicks** → service worker navigates to relevant post

---

## Production Deployment

For production, remember:

1. **HTTPS Required** - Web Push API only works on HTTPS
2. **VAPID Keys** - Keep private key secret (same as JWT secret)
3. **Service Worker Path** - Must be served from root (`/service-worker.js`)
4. **Database Migration** - No migration needed (schema already updated)

---

**You're all set! Push notifications are ready to test.** 🚀

