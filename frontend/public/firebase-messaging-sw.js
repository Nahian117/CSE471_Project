// Firebase Messaging Service Worker — must be at the root of the public directory
// This handles background push notifications when the app is not in focus.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// These will be replaced at runtime by firebase.js via getToken()
// Minimal config is needed here — only for background message handling
firebase.initializeApp({
  apiKey:            self.FIREBASE_API_KEY            || '',
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || '',
  projectId:         self.FIREBASE_PROJECT_ID         || '',
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             self.FIREBASE_APP_ID             || '',
});

const messaging = firebase.messaging();

// Handle background messages (when the app is minimised or closed)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload);

  const { title, body } = payload.notification || {};
  const notificationOptions = {
    body:  body  || 'You have a new notification.',
    icon:  '/logo192.png',
    badge: '/logo192.png',
    data:  payload.data || {}
  };

  self.registration.showNotification(title || 'MarketPlace Notification', notificationOptions);
});
