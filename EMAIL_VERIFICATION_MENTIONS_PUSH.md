# Email Verification, Mentions & Push Notifications Implementation Guide

## Overview

This guide covers the implementation and setup of three important features:
1. **Email Verification** - Prevents bot accounts and validates user email addresses
2. **User Mentions** - Allow @username mentions in comments with notifications
3. **Push Notifications** - Send web push notifications to keep users engaged

---

## 1. Email Verification

### Current Implementation Status
- ✅ **Schema**: User model updated with email verification fields
- ✅ **Authentication**: Modified registration flow to require email verification
- ✅ **Email Service**: Created nodemailer-based email sending service
- ✅ **Verification Endpoints**: Created token verification and resend endpoints
- ⏳ **Setup Required**: Need to install nodemailer and configure SMTP credentials

### What Changed

#### Backend Models
- **User Model** (`backend/models/User.js`)
  - Added: `emailVerificationToken` - Hashed token sent in verification link
  - Added: `emailVerificationExpires` - When the token expires (24 hours)
  - Added: `emailVerifiedAt` - Timestamp when email was verified

#### Auth Controller
- **Registration Flow** (`backend/controllers/auth.controller.js`)
  - Changed: `isVerified: true` → `isVerified: false`
  - Now: Generates verification token and sends email
  - Users cannot login until email is verified

- **Login Check** (`backend/controllers/auth.controller.js`)
  - Added: `emailVerifiedAt` check before allowing login
  - Returns `403` if email not verified

#### Services & Routes
- **Email Service** (`backend/services/emailService.js`) - NEW
  - Sends verification emails with clickable links
  - Sends password reset emails
  - Supports nodemailer SMTP configuration
  
- **Verification Controller** (`backend/controllers/verification.controller.js`) - NEW
  - POST `/verify-email/:token` - Verify email with token
  - POST `/resend-verification` - Resend verification email with rate limiting

- **Verification Routes** (`backend/routes/verification.routes.js`) - NEW
  - Registered in `app.js` under `/api/v1/verify`

### Setup Instructions

#### 1. Install nodemailer
```bash
cd backend
npm install nodemailer
```

#### 2. Configure Environment Variables
Add to `.env`:
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com              # or your email provider's SMTP host
SMTP_PORT=587                          # 587 for TLS, 465 for SSL
SMTP_USER=your-email@gmail.com        # Your email address
SMTP_PASS=your-app-password           # Use App Password, not regular password
SMTP_FROM=noreply@instagram-clone.com # Email to send from

# Frontend URL (for verification links)
APP_URL=http://localhost:5173         # Frontend URL in dev, production URL in prod
```

#### 3. Gmail Setup (if using Gmail)
1. Enable 2-Step Verification on your Google Account
2. Generate an App Password at: https://myaccount.google.com/apppasswords
3. Use the generated 16-character password in `SMTP_PASS`
4. Note: Use regular password for local dev, App Password for production

#### 4. Frontend Integration (Optional)

Create email verification page at `src/pages/VerifyEmailPage.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { services } from '../api/services';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        await services.post(`/verify/verify-email/${token}`);
        setStatus('success');
      } catch (err) {
        setStatus('error');
      }
    };
    verifyEmail();
  }, [token]);

  if (status === 'loading') return <div>Verifying email...</div>;
  if (status === 'success') return <div>Email verified! Redirecting to login...</div>;
  return <div>Verification failed. <a href="/resend">Resend email</a></div>;
}
```

Add route:
```jsx
<Route path="/verify-email/:token" element={<VerifyEmailPage />} />
```

### API Endpoints

**Register (Modified)**
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "fullName": "John Doe"
}

Response (201):
{
  "success": true,
  "data": {
    "email": "john@example.com",
    "username": "john_doe"
  },
  "message": "Account created! Please check your email to verify your account."
}
```

**Verify Email**
```
POST /api/v1/verify/verify-email/:token

Response (200):
{
  "success": true,
  "data": {
    "username": "john_doe",
    "email": "john@example.com"
  },
  "message": "Email verified successfully! You can now log in."
}
```

**Resend Verification Email**
```
POST /api/v1/verify/resend-verification
Content-Type: application/json

{
  "email": "john@example.com"
}

Response (200):
{
  "success": true,
  "data": { "email": "john@example.com" },
  "message": "Verification email sent! Check your inbox."
}

Error if already verified (404):
{
  "success": false,
  "message": "User not found or already verified"
}
```

### Testing Email Verification

1. Start backend: `npm run dev`
2. Register new account via API (email won't work locally during dev)
3. Check email for verification link
4. Click link or POST to `/api/v1/verify/verify-email/:token`
5. Try logging in - should now work

### Common Issues

**"Email service connection failed"**
- Check SMTP credentials in `.env`
- Enable "Less secure app access" if using Gmail (for non-production)
- Use App Password instead of regular password for Gmail

**"Invalid credentials" on login**
- User registered but email not verified
- Share verification link URL with user: `http://localhost:5173/verify-email/:token`
- Or use resend endpoint to get new token

---

## 2. User Mentions (@username)

### Current Implementation Status
- ✅ **Mention Parser**: Created utility to extract @mentions from text
- ✅ **Comment Model**: Updated with mentions array
- ✅ **Comment Creation**: Modified to parse and store mentions
- ✅ **Notifications**: Added "mention" type to notification system
- ✅ **Mention Notifications**: Automatically created when user is mentioned

### What Changed

#### Backend Utils
- **Mention Parser** (`backend/utils/mentionParser.js`) - NEW
  - `parseMentions(text)` - Extracts @username patterns
  - `extractMentionedUsernames(text)` - Get lowercase usernames
  - `isMentioned(text, username)` - Check if username mentioned
  - `parseAndLinkMentions(text)` - HTML links for mentions
  - Regex pattern: `@[a-zA-Z_][a-zA-Z0-9._\-]{0,29}` (Instagram rules)

#### Backend Models
- **Comment Model** (`backend/models/Comment.js`)
  - Added: `mentions: [{ type: ObjectId, ref: 'User' }]`
  - Stores IDs of mentioned users for quick notification dispatch

- **Notification Model** (`backend/models/Notification.js`)
  - Updated enum to include "mention" type
  - `enum: ["follow", "like", "comment", "post", "mention"]`

#### Post Controller
- **Add Comment** (`backend/controllers/post.controller.js`)
  - Parses mentions from comment text
  - Queries User model for mentioned usernames
  - Stores user IDs in comment.mentions
  - Creates notification for each mentioned user
  - Skips self-mentions and duplicate post author notifications

### How It Works

1. **User writes comment** with @mentions:
   ```
   "Great post @john_doe! @jane_smith should see this too!"
   ```

2. **Parser extracts mentions**:
   - `["john_doe", "jane_smith"]`

3. **Queries User model** for these usernames:
   - Gets MongoDB ObjectIds

4. **Stores mentions** in Comment:
   ```javascript
   {
     mentions: [ObjectId("john_doe"), ObjectId("jane_smith")],
     text: "Great post @john_doe! @jane_smith should see this too!"
   }
   ```

5. **Creates notifications** for each mentioned user:
   - Type: "mention"
   - Actor: Comment author
   - Reference: Post ID
   - Avoids duplicate notifications if post author is mentioned

6. **Socket.io broadcasts** in real-time:
   - Mentioned users get instant notification

### Mention Validation Rules

Valid mentions:
- `@john_doe` ✅
- `@John.Doe` ✅
- `@john_doe_123` ✅
- `@john-doe` ✅

Invalid mentions:
- `@123john` ❌ (can't start with number)
- `@john@@doe` ❌ (double @)
- `@ john_doe` ❌ (space after @)
- `@john.` ❌ (invalid char at end)

### API Examples

**Create Comment with Mentions**
```
POST /api/v1/posts/:postId/comments
Content-Type: application/json

{
  "text": "Great work @john_doe! @jane_smith should check this out"
}

Response (201):
{
  "success": true,
  "data": {
    "comment": {
      "_id": "...",
      "author": { "username": "you", ... },
      "text": "Great work @john_doe! @jane_smith should check this out",
      "mentions": ["ObjectId(...john_doe)", "ObjectId(...jane_smith)"],
      "targetId": "...",
      "targetType": "Post",
      "likeCount": 0,
      "createdAt": "..."
    }
  },
  "message": "Comment added"
}
```

**Get Comments** (includes mentions):
```
GET /api/v1/posts/:postId/comments

Response:
{
  "success": true,
  "data": {
    "comments": [
      {
        "mentions": ["user_id_1", "user_id_2"],
        "text": "@user1 @user2 ...",
        ...
      }
    ]
  }
}
```

### Frontend Display

To display mentions as clickable links in React:

```jsx
import { parseMentions, parseAndLinkMentions } from '../utils/mentionParser';

function CommentText({ text }) {
  // Option 1: Get mention list
  const mentions = parseMentions(text);
  
  // Option 2: Render HTML links
  const htmlWithLinks = parseAndLinkMentions(text);
  
  return (
    <div>
      <p>{text}</p>
      {mentions.length > 0 && (
        <small>
          Mentions: {mentions.map(m => `@${m}`).join(', ')}
        </small>
      )}
      {/* Or render HTML: */}
      {/* <div dangerouslySetInnerHTML={{ __html: htmlWithLinks }} /> */}
    </div>
  );
}
```

### Notification Example

When `@john_doe` is mentioned:

```javascript
{
  _id: ObjectId(...),
  userId: ObjectId(...john_doe),  // Mentioned user
  actor: ObjectId(...commenter),   // Who mentioned
  type: "mention",
  referenceId: ObjectId(...post),  // Post with comment
  referenceType: "Post",
  message: "mentioned your post",
  isRead: false,
  createdAt: "2024-01-20T10:30:00Z"
}
```

**Socket.io event:**
```javascript
// john_doe's socket receives:
socket.on('new_notification', {
  type: 'mention',
  actor: { username: 'commenter', ... },
  message: 'mentioned your post',
  ...
})
```

### Testing Mentions

1. Create post
2. Add comment: "Great! @john_doe what do you think?"
3. Check if john_doe receives "mention" notification
4. Query comment to verify mentions array populated

---

## 3. Web Push Notifications

### Current Implementation Status
- ✅ **User Model**: Added pushTokens array for device subscriptions
- ✅ **Service Worker**: Created for push notification handling
- ✅ **Push Hook**: Created `usePushNotification` hook for frontend
- ✅ **Backend Service**: Created push notification service
- ✅ **API Endpoints**: Added subscription manage endpoints
- ⏳ **Setup Required**: Install web-push, generate VAPID keys, configure env vars

### What Changed

#### Backend Services
- **Push Notification Service** (`backend/services/pushNotification.js`) - NEW
  - Initializes web-push with VAPID keys
  - Sends push notifications to subscribed devices
  - Registers/unregisters device tokens
  - Provides notification templates for different event types

#### Backend Routes & Controllers
- **User Controller** (`backend/controllers/user.controller.js`)
  - POST `/users/push-subscription` - Register device subscription
  - DELETE `/users/push-subscription` - Unregister device subscription

- **User Model** (`backend/models/User.js`)
  - Added: `pushTokens: [{ type: String }]` - Stores subscription objects

#### Frontend
- **Service Worker** (`frontend/public/service-worker.js`) - NEW
  - Receives push events from server
  - Displays browser notifications
  - Handles notification clicks (navigation)
  - Requests background sync when offline

- **Push Hook** (`frontend/hooks/usePushNotification.js`) - NEW
  - `usePushNotification()` - Hook to manage push notifications
  - Registers service worker
  - Requests notification permission
  - Subscribes to push notifications
  - Unsubscribes from push notifications

### Setup Instructions

#### 1. Install web-push
```bash
cd backend
npm install web-push
```

#### 2. Generate VAPID Keys
```bash
npx web-push generate-vapid-keys
```

Output:
```
Public Key: BFKk0sXKHI3...
Private Key: R5KqnO2T3n...
```

#### 3. Configure Environment Variables
Add to `.env`:
```env
# Web Push Configuration
VAPID_PUBLIC_KEY=BFKk0sXKHI3...      # Public key from above
VAPID_PRIVATE_KEY=R5KqnO2T3n...      # Private key from above
VAPID_SUBJECT=mailto:your@email.com  # Your email address
```

Also need on frontend `.env`:
```env
VITE_VAPID_PUBLIC_KEY=BFKk0sXKHI3...
```

#### 4. Update Frontend to Enable Push Notifications

Create a notification settings component:

```jsx
import { usePushNotification } from '../hooks/usePushNotification';

export default function NotificationSettings() {
  const { isSupported, isSubscribed, loading, error, subscribe, unsubscribe } = 
    usePushNotification();

  if (!isSupported) {
    return <div>Push notifications not supported in your browser</div>;
  }

  return (
    <div>
      <h3>Push Notifications</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {!isSubscribed ? (
        <button onClick={subscribe} disabled={loading}>
          {loading ? 'Enabling...' : 'Enable Push Notifications'}
        </button>
      ) : (
        <button onClick={unsubscribe} disabled={loading}>
          {loading ? 'Disabling...' : 'Disable Push Notifications'}
        </button>
      )}
      
      <p>{isSubscribed ? '✓ Enabled' : '✗ Disabled'}</p>
    </div>
  );
}
```

### How It Works

1. **User subscribes to push**:
   - Browser requests notification permission
   - Service worker registered
   - Device subscription created
   - Subscription sent to backend

2. **Subscription stored**:
   - Backend saves subscription in `User.pushTokens`
   - Subscription includes endpoint, auth, p256dh

3. **Event happens** (like/comment/mention):
   - Notification created in database
   - Push payload constructed
   - Sent via VAPID to browser endpoint
   - Service worker receives push event
   - Browser displays system notification

4. **User clicks notification**:
   - Service worker catches click event
   - Navigates to relevant post/profile
   - Brings app to focus or opens new window

### API Endpoints

**Register Push Subscription**
```
POST /api/v1/users/push-subscription
Content-Type: application/json
Authorization: Cookie

{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "expirationTime": null,
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}

Response (200):
{
  "success": true,
  "message": "Push subscription registered"
}
```

**Unregister Push Subscription**
```
DELETE /api/v1/users/push-subscription
Content-Type: application/json
Authorization: Cookie

{
  "subscription": { ... same object ... }
}

Response (200):
{
  "success": true,
  "message": "Push subscription removed"
}
```

### Sending Push Notifications

To send push to a user (in notifications controller, after creating notification):

```javascript
const { sendPushNotifications } = require("../services/pushNotification");
const { notificationTemplates } = require("../services/pushNotification");

// Create notification (existing code)
const notification = await Notification.create({ ... });

// Get user's subscriptions
const user = await User.findById(notification.userId).select("pushTokens");

// Send push notifications to all devices
if (user.pushTokens && user.pushTokens.length > 0) {
  const subscriptions = user.pushTokens.map(token => JSON.parse(token));
  const payload = notificationTemplates.like(actor, "post");
  
  await sendPushNotifications(subscriptions, payload);
}
```

### Notification Templates

```javascript
const templates = {
  like: (actor, type) => ({
    title: `${actor.username} liked your ${type}`,
    body: "Check out what they liked!",
    icon: actor.profilePicture,
    data: { type: 'like', actorId: actor._id }
  }),
  
  comment: (actor, type) => ({
    title: `${actor.username} commented on your ${type}`,
    body: "See what they have to say",
    icon: actor.profilePicture,
    data: { type: 'comment', actorId: actor._id }
  }),
  
  mention: (actor, type) => ({
    title: `${actor.username} mentioned you`,
    body: `${actor.username} mentioned you in a ${type}`,
    icon: actor.profilePicture,
    data: { type: 'mention', actorId: actor._id }
  }),
  
  follow: (actor) => ({
    title: `${actor.username} started following you`,
    body: "Check out their profile",
    icon: actor.profilePicture,
    data: { type: 'follow', actorId: actor._id }
  })
};
```

### Browser Support

- ✅ Chrome/Edge 50+
- ✅ Firefox 44+
- ✅ Safari 16+
- ❌ Internet Explorer (not supported)

### Testing Push Notifications

1. **Backend working**:
   ```bash
   # Check logs for "✓ Web Push notifications configured"
   npm run dev
   ```

2. **Register subscription**:
   ```
   POST /api/v1/users/push-subscription
   (See API endpoint above)
   ```

3. **Manual push test** (using web-push CLI):
   ```bash
   npx web-push send-notification \
     --endpoint="..." \
     --key="..." \
     --auth="..." \
     --payload="Test notification"
   ```

4. **User triggers event** (like/comment):
   - Should receive browser notification
   - Click notification to navigate to post

### Troubleshooting

**"Push notifications are not supported in this browser"**
- Check browser compatibility above
- Ensure HTTPS (web push requires secure context)

**"Invalid subscription" error**
- Old subscription token no longer valid
- Service worker updated, old subscriptions expired
- Should be automatically removed from database

**Service worker not registering**
- Check service-worker.js is in `frontend/public/`
- Ensure HTTPS in production
- Check browser console for errors

**VAPID keys invalid**
- Regenerate keys: `npx web-push generate-vapid-keys`
- Make sure keys match in backend .env
- Restart server after updating .env

---

## Integration Timeline

**Phase 1 (High Priority)**
- [ ] Email Verification - Setup SMTP and test
- [ ] Update registration flow UI to show email verification step
- [ ] Test full registration → verification → login flow

**Phase 2 (Medium Priority)**
- [ ] Deploy email service to production
- [ ] Setup production SMTP (SendGrid/Mailgun/etc)
- [ ] Add password reset feature (uses same email service)

**Phase 3 (High Impact)**
- [ ] User Mentions - Already integrated in comments
- [ ] Test @mention parsing and notifications
- [ ] Add frontend UI to highlight mentions
- [ ] Add mention notifications to NotificationPage

**Phase 4 (Engagement)**
- [ ] Push Notifications - Install web-push
- [ ] Generate VAPID keys and configure
- [ ] Test subscription and push sending
- [ ] Add notification settings UI

**Phase 5 (Optimization)**
- [ ] Monitor email delivery rates
- [ ] Implement email templates (more beautiful)
- [ ] Setup push notification templates per event
- [ ] Analytics for notification engagement

---

## Database Changes Summary

### User Model
```javascript
{
  // Email Verification (NEW)
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  emailVerifiedAt: Date,
  
  // Push Notifications (NEW)
  pushTokens: [String],
  
  // Existing
  username: String,
  email: String,
  password: String,
  isVerified: Boolean,
  ...
}
```

### Comment Model
```javascript
{
  // Mentions (NEW)
  mentions: [ObjectId], // refs to User
  
  // Existing
  author: ObjectId,
  targetId: ObjectId,
  targetType: String,
  text: String,
  likeCount: Number,
  ...
}
```

### Notification Model
```javascript
{
  // Type enum (UPDATED)
  type: enum ["follow", "like", "comment", "post", "mention"],
  
  // Existing
  userId: ObjectId,
  actor: ObjectId,
  referenceId: ObjectId,
  ...
}
```

---

## Security Considerations

### Email Verification
- ✅ Token hashed before storage (SHA256)
- ✅ Token expires in 24 hours
- ✅ Can't reuse expired tokens
- ✅ Rate limiting on resend (implemented)

### Push Notifications
- ✅ Subscriptions encrypted by browser
- ✅ VAPID keys ensure only your server sends
- ✅ Subscriptions stored securely in database
- ✅ Invalid subscriptions auto-deleted

### Mentions
- ✅ Regex pattern prevents injection
- ✅ Mentions parsed server-side (trusted)
- ✅ Can mention any user
- ✅ Notification control via user settings (future)

---

## Performance Impact

### Email Verification
- Database: +2KB per user (token storage)
- Network: 1 email per registration (async)
- CPU: SHA256 hash on verify

### Mentions
- Database: +50 bytes per mention (ObjectId reference)
- Query: +1 User.find() per comment creation
- Notification: +1 notification per mention

### Push Notifications
- Database: +2KB per device subscription
- Network: 1 POST per subscriber per event
- CPU: VAPID signing per notification

---

## Next Steps

1. **Test locally**:
   - Setup SMTP with test credentials
   - Test email sending
   - Test full registration flow

2. **Deploy**:
   - Update production .env with real SMTP
   - Update production .env with VAPID keys
   - Run database migrations (no migration needed, schema updates only)

3. **Monitor**:
   - Check email delivery rates
   - Monitor failed push notifications
   - Track verification completion rate

4. **Enhance**:
   - Add email templates
   - Add magic link authentication
   - Add two-factor authentication
   - Add push notification preferences per user

---

## References

- [Nodemailer Documentation](https://nodemailer.com/)
- [Web Push API](https://www.w3.org/TR/push-api/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/draft-ietf-webpush-protocol)
- [VAPID](https://datatracker.ietf.org/doc/html/draft-thomson-webpush-vapid)
- [Socket.io Notifications](https://socket.io/)

