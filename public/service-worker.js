const CACHE_NAME = 'art-fest-manager-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icons/pwa-192x192.png',
  '/icons/pwa-512x512.png',
  '/icons/pwa-maskable-192x192.png',
  '/icons/pwa-maskable-512x512.png',
  '/icons/apple-touch-icon-180x180.png',
  '/icons/apple-touch-icon.png',
  '/icons/shortcut-data-entry.png',
  '/icons/shortcut-scoring.png',
  '/icons/shortcut-schedule.png',
  'https://cdn.tailwindcss.com',
  "https://aistudiocdn.com/react@^19.2.0",
  "https://aistudiocdn.com/react-dom@^19.2.0",
  "https://aistudiocdn.com/lucide-react@^0.548.0"
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        console.log('Opened cache:', CACHE_NAME);
        await Promise.allSettled(
          urlsToCache.map(url =>
            fetch(url, { mode: 'cors' })
              .then(res => {
                if (res.ok) return cache.put(url, res);
              })
              .catch(err => console.warn('PWA caching skip for:', url, err))
          )
        );
      })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(() => {
          // If offline and requesting navigation, return index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting obsolete cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
