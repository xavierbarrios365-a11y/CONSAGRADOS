const CACHE_NAME = 'consagrados-v5';

// No cacheamos nada por ahora para evitar problemas de actualización, 
// pero el SW es necesario para la instalación PWA.
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Pass through
    event.respondWith(fetch(event.request));
});
