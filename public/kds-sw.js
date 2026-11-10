const CACHE_NAME = 'joes-kds-cache-v1';
const STATIC_ASSETS = [
  '/kds.html',
  '/css/style.css',
  '/js/kds.js',
  '/assets/logo.jpg',
  '/kds-manifest.json'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy for dynamic API routes, cache-first for static assets
self.addEventListener('fetch', (evt) => {
  const url = new URL(evt.request.url);

  // Do not intercept non-GET or dynamic API calls (orders, sync, menu toggles)
  if (evt.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  evt.respondWith(
    fetch(evt.request)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(evt.request, clone));
        }
        return networkRes;
      })
      .catch(() => caches.match(evt.request))
  );
});
