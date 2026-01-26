// GlucoTrack Service Worker v1.0.0
const CACHE_NAME = 'glucotrack-v1';
const STATIC_CACHE = 'glucotrack-static-v1';
const DYNAMIC_CACHE = 'glucotrack-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/favicon.svg',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => {
              console.log('[SW] Removing old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Network-first for API calls and dynamic content
  if (url.pathname.startsWith('/api/') || url.pathname.includes('_next')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for static assets
  event.respondWith(cacheFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline fallback if available
    return caches.match('/') || new Response('Offline', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Background sync for offline measurements
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-measurements') {
    event.waitUntil(syncMeasurements());
  }
});

async function syncMeasurements() {
  // This would sync with a server if we had one
  // For now, data is stored in localStorage
  console.log('[SW] Sync completed');
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'הגיע הזמן לבדוק את רמת הסוכר',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    dir: 'rtl',
    lang: 'he',
    tag: 'glucotrack-reminder',
    renotify: true,
    actions: [
      { action: 'open', title: 'פתח אפליקציה' },
      { action: 'dismiss', title: 'סגור' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'גלוקוטרק', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        return clients.openWindow('/');
      })
  );
});

console.log('[SW] Service Worker loaded');
