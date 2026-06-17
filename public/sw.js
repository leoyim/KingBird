// Service Worker for offline caching
const CACHE_NAME = 'kingbird-v4';
const ASSET_CACHE = 'kingbird-assets-v4';

// App shell — minimum required for offline startup
const APP_SHELL = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
  });
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (request.url.startsWith('chrome-extension://')) return;
  if (request.url.includes('/api/')) return;
  // Skip caching in dev mode (localhost / 0.0.0.0)
  if (['localhost', '127.0.0.1', '0.0.0.0'].includes(self.location.hostname)) return;

  // Navigation requests → serve cached index.html (SPA fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => {
        return cached || fetch(request).catch(() => {
          return new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        });
      })
    );
    return;
  }

  // Static assets → cache-first, then network
  const isAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$/.test(request.url);
  const cacheTarget = isAsset ? ASSET_CACHE : CACHE_NAME;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(cacheTarget).then((c) => c.put(request, clone));
        }
        return response;
      }).catch(() => {
        if (isAsset) return new Response('', { status: 503 });
        throw new Error('network-error');
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  const isSameOrigin = urlToOpen.startsWith('/') && !urlToOpen.startsWith('//');
  const target = isSameOrigin ? urlToOpen : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(target) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    })
  );
});
