const CACHE_NAME = 'aspire-repair-v1';
const urlsToCache = ['/ASPIRE-REPAIR/', '/ASPIRE-REPAIR/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
