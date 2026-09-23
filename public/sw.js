const CACHE_NAME = 'trellis-cache-v3';
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

// ===== WEB PUSH NOTIFICATIONS (MESSAGES & INCOMING CALLS) =====
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
  const isCall = title.includes('Call') || (data.url && data.url.includes('call=incoming'));

  const options = {
    body: data.body || 'You have a new message',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/dashboard' },
    // Ringtone vibration pattern for calls, short pulse for messages
    vibrate: isCall ? [600, 200, 600, 200, 600, 200, 600, 400, 600, 200, 600, 200, 600] : [100, 50, 100, 50, 100],
    renotify: true,
    requireInteraction: isCall ? true : false,
    tag: isCall ? 'trellis-incoming-call' : (data.url || 'trellis-chat-msg'),
    actions: isCall ? [
      { action: 'answer', title: '📞 Answer' },
      { action: 'decline', title: '❌ Decline' }
    ] : []
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification tap / click on mobile phone or desktop
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'decline') {
    return;
  }

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
      // If not open, open a new window to the chat/call URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
