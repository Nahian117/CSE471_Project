import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// ── Your Firebase Web App config ───────────────────────────────────────────
// Get these values from Firebase Console → Project Settings → General → Your Apps
const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;
const API_URL   = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Initialise Firebase
let app, messaging;
try {
  app       = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
} catch (err) {
  console.warn('[FCM] Firebase init failed (credentials missing?):', err.message);
}

/**
 * Request notification permission, get FCM token, and register it with the backend.
 * Call this once after a user logs in.
 */
export async function initFCM(authToken) {
  if (!messaging) {
    console.warn('[FCM] Messaging not initialised — skipping push setup.');
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM] Notification permission denied.');
      return;
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) {
      console.warn('[FCM] No registration token. Is the service worker registered?');
      return;
    }

    console.log('[FCM] Got token:', token.substring(0, 20) + '...');

    // Save to backend
    await fetch(`${API_URL}/api/auth/fcm-token`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });

    console.log('[FCM] Token registered with backend.');
  } catch (err) {
    console.error('[FCM] initFCM error:', err.message);
  }
}

/**
 * Listen for foreground messages and show a browser notification.
 * Call this once after initFCM.
 */
export function listenForegroundMessages() {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground message:', payload);
    const { title, body } = payload.notification || {};
    if (title && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo192.png' });
    }
  });
}

export { messaging };
