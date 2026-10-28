const CACHE = 'my-story-maker-v5';
const APP_SHELL = [
  './',
  './index.html',
  './css/variables.css',
  './css/reset.css',
  './css/layout.css',
  './css/components.css',
  './css/utils.css',
  './css/panels.css',
  './css/transform.css',
  './css/layers.css',
  './js/image-tools.js',
  './js/state.js',
  './js/filters.js',
  './js/templates.js',
  './js/drag-drop.js',
  './js/elements.js',
  './js/export.js',
  './js/music.js',
  './js/history.js',
  './js/layers.js',
  './js/resize.js',
  './js/project.js',
  './js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const cacheable = event.request.url.startsWith(self.location.origin) ||
        event.request.url.includes('cdn.jsdelivr.net') ||
        event.request.url.includes('images.unsplash.com');
      if (cacheable && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match('./index.html')))
  );
});
