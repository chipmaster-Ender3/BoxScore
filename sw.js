// BoxScore Beta 2.0 - service worker: abre o app sem internet
var CACHE = 'boxscore-beta-2.0.1';
var CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
var FB = ['app', 'auth', 'firestore'].map(function (n) { return 'https://www.gstatic.com/firebasejs/10.12.2/firebase-' + n + '-compat.js'; });
self.addEventListener('install', function (e) {
  // guarda os scripts da Firebase para o login funcionar com o app offline (se falhar, tenta de novo na próxima abertura)
  e.waitUntil(caches.open(CACHE).then(function (c) { return Promise.all(FB.map(function (u) { return c.add(new Request(u, { mode: 'no-cors' })).catch(function () {}); })); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var u = new URL(e.request.url);
  if (u.origin !== self.location.origin && FB.indexOf(e.request.url) < 0) return;   // Firestore, login e outros ficam fora do cache
  e.respondWith(caches.match(e.request).then(function (hit) {
    var net = fetch(e.request).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
      return res;
    }).catch(function () { return hit || caches.match('./index.html'); });
    return hit || net;
  }));
});
