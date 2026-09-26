const CACHE = 'forge-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './icon.svg',
  './chart.umd.min.js',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res && res.ok && (req.url.startsWith(self.location.origin) || req.url.includes('cdn.tailwindcss.com') || req.url.includes('chart'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length) return list[0].focus();
      return clients.openWindow('./index.html');
    })
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'rest-done') {
    self.registration.showNotification(e.data.title || 'FORGE 休憩終了', {
      body: e.data.body || '休憩終了！次のセットへ',
      tag: 'forge-rest-done',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      icon: './icon-192.png',
      badge: './icon-192.png'
    });
  }
});
