// FORGE Bench service worker
// 1) 休憩タイマー終了時に通知を出す
// 2) 常にネットの最新版を優先（オフライン時だけ保存済みを使う）→ 差し替え後に古い画面が残らない
const CACHE = 'forge-bench-v2';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-store' });
      if (res && res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()).catch(() => {}); }
      return res;
    } catch (e) {
      const hit = await caches.match(req, { ignoreSearch: true });
      return hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
    }
  })());
});

// ---- 休憩タイマー ----
let restToken = 0;
self.addEventListener('message', event => {
  const d = event.data || {};
  if (d.type === 'rest-cancel') { restToken++; return; }
  if (d.type !== 'rest-start') return;
  const token = ++restToken;
  const wait = Math.max(0, d.end - Date.now());
  // waitUntil で終了時刻まで SW を生かしておく（ブラウザの上限内で）
  event.waitUntil(new Promise(resolve => {
    setTimeout(async () => {
      if (token === restToken) {
        // アプリが前面に出ていれば画面側が鳴らすので通知しない
        const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const visible = wins.some(w => w.visibilityState === 'visible');
        if (!visible) {
          await self.registration.showNotification(d.title || 'FORGE 休憩終了', {
            body: d.body || '次のセットへ', tag: 'forge-rest', renotify: true,
            vibrate: [300, 150, 300, 150, 300], icon: 'icon-192.png', badge: 'icon-192.png', requireInteraction: false
          }).catch(() => {});
        }
      }
      resolve();
    }, wait);
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.length) return wins[0].focus();
    return self.clients.openWindow('./');
  })());
});
