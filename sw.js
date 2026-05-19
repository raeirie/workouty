const CACHE_NAME = 'workout-tracker-v1';
const ASSETS = [
  './',
  './index.html',
  './config.js',
  './api.js',
  './app.js',
  './manifest.json'
];

// Install Lifecycle Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activation Lifecycle Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Network Fetch Intercept Handler
self.addEventListener('fetch', (e) => {
  // Only intercept standard local frontend assets, let API requests pass through live
  if (e.request.url.includes('script.google.com')) {
    return fetch(e.request);
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});