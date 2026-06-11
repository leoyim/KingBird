// Service Worker for offline caching
const CACHE_NAME = 'ezrss-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/ezrss-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  (self as unknown as ServiceWorkerGlobalScope).clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event as FetchEvent;

  // Skip non-GET requests and chrome-extension
  if (request.method !== 'GET') return;
  if (request.url.startsWith('chrome-extension://')) return;

  // For navigation requests, serve index.html (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((response) => {
        return response || fetch(request);
      })
    );
    return;
  }

  // For assets, try cache first then network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback
        return new Response('You are offline', { status: 503 });
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if ((self as unknown as ServiceWorkerGlobalScope).clients.openWindow) {
        return (self as unknown as ServiceWorkerGlobalScope).clients.openWindow(urlToOpen);
      }
    })
  );
});
