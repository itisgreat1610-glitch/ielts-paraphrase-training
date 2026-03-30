// IELTS Vocabulary Builder — Service Worker
// Caches index.html + core.json + fonts for true offline support
var CACHE_NAME = 'ielts-vocab-v1';
var URLS_TO_CACHE = [
  './',
  './index.html',
  './core.json?v=1'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  // Network-first for JSON (so updates propagate), cache-first for everything else
  var url = new URL(event.request.url);
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request).then(function(fetchRes) {
          // Cache font files on first fetch
          if (url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') {
            var clone = fetchRes.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return fetchRes;
        });
      })
    );
  }
});
