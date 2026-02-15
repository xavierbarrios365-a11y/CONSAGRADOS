// SW REFRESH: 2026-02-15T00:30:00 (FORCING UPDATE v1.8.0)
// OneSignal removed to prevent conflicts with Firebase Messaging

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Cache logic can be added here if needed,
// but we are centralizing messaging in firebase-messaging-sw
