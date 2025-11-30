// Favilla's PWA Service Worker
// Safe caching strategy - does NOT cache kitchen page or API endpoints

const CACHE_NAME = 'favilias-v1';
const RUNTIME_CACHE = 'favilias-runtime-v1';

// Assets to cache on install (static files only)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - smart caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // NEVER cache these (critical for real-time updates):
  const neverCache = [
    '/api/',           // All API endpoints
    '/kitchen',        // Kitchen display page
    '/.netlify/',      // Netlify functions
    '/auth/',          // Authentication
    'supabase.co'      // Supabase real-time
  ];

  // Check if URL should never be cached
  if (neverCache.some(pattern => url.pathname.includes(pattern) || url.hostname.includes(pattern))) {
    // Network only - no caching
    return event.respondWith(fetch(request));
  }

  // For static assets (images, fonts, CSS, JS)
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    // Cache first, fallback to network
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // For HTML pages - network first, fallback to cache
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the page
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline - serve from cache
          return caches.match(request);
        })
    );
    return;
  }

  // Everything else - network first
  event.respondWith(fetch(request));
});
