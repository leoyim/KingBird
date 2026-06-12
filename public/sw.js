// Service Worker for offline caching
const CACHE_NAME = 'ezrss-v2';
const ASSET_CACHE = 'ezrss-assets-v2';

// App shell - minimum required for offline startup
const APP_SHELL = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== ASSET_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET') return;
  if (request.url.startsWith('chrome-extension://')) return;
  if (request.url.includes('/api/')) return; // Don't cache API calls

  // For navigation requests, serve index.html (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => {
        return cached || fetch(request).catch(() => {
          return new Response('Offline - 未能加载此页面', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        });
      })
    );
    return;
  }

  // Static assets: cache-first, then network
  const isAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$/.test(request.url);
  const cacheTarget = isAsset ? ASSET_CACHE : CACHE_NAME;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(cacheTarget).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      }).catch(() => {
        if (isAsset) {
          return new Response('', { status: 503 });
        }
        throw new Error('network-error');
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
