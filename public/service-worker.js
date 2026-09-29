const CACHE_NAME = 'art-fest-manager-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icons/pwa-192x192.png',
  '/icons/pwa-512x512.png',
  '/icons/apple-touch-icon-180x180.png',
  '/icons/shortcut-data-entry.png',
  '/icons/shortcut-scoring.png',
  '/icons/shortcut-schedule.png',
  'https://cdn.tailwindcss.com',
  "https://aistudiocdn.com/react@^19.2.0",
  "https://aistudiocdn.com/react-dom@^19.2.0",
  "https://aistudiocdn.com/lucide-react@^0.548.0",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        console.log('Opened cache:', CACHE_NAME);
        // Safely cache each asset without aborting the entire installation if one fails
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
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Cache hit
        }
        
        // If not in cache, fetch from network
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200) {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();
            
            // Only cache responses from our app or trusted CDNs to avoid caching opaque responses
            if(event.request.url.startsWith(self.location.origin) || event.request.url.includes('aistudiocdn.com') || event.request.url.includes('gstatic.com') || event.request.url.includes('tailwindcss.com')) {
               caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          }
        ).catch(error => {
            console.log('Fetch failed; returning offline page instead.', error);
            // Optionally, return a fallback offline page, e.g., return caches.match('/offline.html');
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
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});