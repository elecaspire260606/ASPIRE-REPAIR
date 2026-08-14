const CACHE_NAME = 'aspire-repair-v11-mobile-width-v3-4-1';

// 保留 Service Worker / PWA 註冊能力，但不再攔截任何 fetch。
// Apps Script 會跨網域並經過 Google redirect；讓瀏覽器原生網路層處理最穩定。
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// 刻意不註冊 fetch 事件。
// 這樣不論 GitHub Pages 或 Google Apps Script API，都不會經過 SW cache/proxy。
