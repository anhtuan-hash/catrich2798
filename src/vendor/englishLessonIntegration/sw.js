const CACHE = 'elis-shell-v1.2.1';
const scopeUrl = new URL(self.registration.scope);
const basePath = scopeUrl.pathname.replace(/\/$/, '');
const scoped = (path = '/') => `${basePath}${path.startsWith('/') ? path : `/${path}`}` || '/';
const SHELL = [scoped('/'), scoped('/index.html'), scoped('/manifest.webmanifest'), scoped('/icon.svg')];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isApi = url.pathname.startsWith('/api/') || url.pathname.startsWith(`${basePath}/api/`);
  if (request.method !== 'GET' || url.origin !== self.location.origin || isApi) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match(scoped('/index.html')))));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
