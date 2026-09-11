/* Bump VERSION whenever the game or its required assets change. */
'use strict';
var VERSION = '20260911-12';
var CACHE = 'knps-game-' + VERSION;
var FILES = [
  './index.html', './style.css?v=' + VERSION, './portrait.css?v=' + VERSION,
  './vendor/matter.min.js', './visuals.js?v=' + VERSION,
  './game.js?v=' + VERSION, './kiosk.js?v=' + VERSION,
  './portrait.js?v=' + VERSION, './offline.js?v=' + VERSION,
  './assets/fonts/DoHyeon.ttf',
  './assets/characters/01_geumjeongsan_hq.webp',
  './assets/characters/02_gayasan_hq.webp',
  './assets/characters/03_juwangsan_hq.webp',
  './assets/characters/04_palgongsan_hq.webp',
  './assets/characters/05_gyeongju_hq.webp',
  './assets/characters/06_jirisan_hq.webp',
  './assets/characters/07_hallyeohaesang_hq.webp',
  './assets/characters/08_eastern.png'
];
self.addEventListener('install', function(event) {
  // Atomic: an incomplete download must never advertise offline readiness.
  event.waitUntil(caches.open(CACHE).then(function(cache) {
    return cache.addAll(FILES.map(function(path) {
      return new Request(new URL(path, self.registration.scope), {cache: 'reload'});
    }));
  }));
  // Updates wait until existing game tabs close, avoiding mid-game version swaps.
});
self.addEventListener('activate', function(event) {
  event.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(key) {
      return key.indexOf('knps-game-') === 0 && key !== CACHE;
    }).map(function(key) { return caches.delete(key); }));
  }).then(function() { return self.clients.claim(); }));
});
self.addEventListener('message', function(event) {
  if (event.data === 'OFFLINE_STATUS' && event.ports[0]) {
    event.waitUntil(caches.open(CACHE).then(function(cache) {
      return Promise.all(FILES.map(function(path) {
        return cache.match(new URL(path, self.registration.scope).href);
      }));
    }).then(function(results) {
      event.ports[0].postMessage({ready: results.every(Boolean), version: VERSION});
    }));
  }
});
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url), scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  var home = event.request.mode === 'navigate' &&
    (url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html');
  event.respondWith(caches.open(CACHE).then(function(cache) {
    // Serve one complete release, even when a hotspot connects intermittently.
    return cache.match(home ? new URL('./index.html', scope).href : event.request)
      .then(function(saved) { return saved || fetch(event.request); });
  }));
});
