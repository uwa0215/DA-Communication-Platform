const CACHE_NAME = 'trellis-cache-v2';
const URLS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Cache strategy for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) return response;
        return caches.match('/');
      });
    })
  );
});

// ===== WEB PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Trellis Messenger', body: event.data.text() };
    }
  }

  const title = data.title || 'Trellis Messenger';
  const options = {
    body: data.body || 'You have a new message',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/dashboard' },
    vibrate: [100, 50, 100, 50, 100],
    renotify: true,
    tag: data.url || 'trellis-chat-msg'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification tap / click on mobile phone or desktop
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if user already has the site open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new window to the chat URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
