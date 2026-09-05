// FinanFlow Service Worker for PWA Standalone & WebAPK & Share Target Caching
const CACHE_NAME = 'finanflow-pwa-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Some assets could not be pre-cached:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept Web Share Target POST request from Android (Nequi image or text share)
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const title = formData.get('title') || '';
          const text = formData.get('text') || '';
          const sharedUrl = formData.get('url') || '';
          const file = formData.get('receipt_image');

          // Store shared file in cache or IndexedDB if present
          if (file && file instanceof File && file.size > 0) {
            const cache = await caches.open('shared-receipts');
            await cache.put('/shared-image', new Response(file, {
              headers: { 'Content-Type': file.type || 'image/jpeg' }
            }));
            return Response.redirect('/?action=shared_image&t=' + Date.now(), 303);
          }

          // Otherwise, redirect with text parameter
          const combinedText = [text, title, sharedUrl].filter(Boolean).join(' ');
          const redirectUrl = '/?share_text=' + encodeURIComponent(combinedText);
          return Response.redirect(redirectUrl, 303);
        } catch (err) {
          console.error('Error handling share target POST:', err);
          return Response.redirect('/?action=smart_parser', 303);
        }
      })()
    );
    return;
  }

  // Only handle GET requests below
  if (event.request.method !== 'GET') return;

  // Don't cache API or dynamic gemini endpoints
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache and update in background (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
