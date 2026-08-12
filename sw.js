const CACHE_NAME = 'aspire-repair-v3'; // 版本號更新，確保瀏覽器偵測到sw.js內容變更、盡快套用這次的修正

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request));
    return;
  }
  // 只攔截「自己網站」的請求(GitHub Pages上的HTML/CSS/JS/圖片這些檔案)，
  // 跨網域的請求(最主要是打去Google Apps Script的API呼叫)完全不插手，讓瀏覽器自己處理。
  // 原因：Apps Script的網址本身會經過一次跳轉(redirect)才真正給出結果，
  // Service Worker攔截「跨網域＋有跳轉」的請求是瀏覽器公認容易出狀況的地方，
  // 曾經造成系統對Apps Script的請求間歇性出現奇怪的404，拿掉這段攔截後應該不會再發生。
  if (new URL(e.request.url).origin !== self.location.origin) {
    return; // 不呼叫respondWith，等於完全不插手，交給瀏覽器原生處理這個請求
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
