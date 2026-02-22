var CACHE_NAME = 'mlm-v1';

var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/css/base.css',
  '/css/feed.css',
  '/css/landing.css',
  '/css/onboarding.css',
  '/css/dna.css',
  '/css/profile.css',
  '/css/chat.css',
  '/css/shop.css',
  '/css/forum.css',
  '/assets/logo.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  if (url.indexOf('supabase.co') !== -1) {
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }

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
});
