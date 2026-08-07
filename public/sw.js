const VERSION = '11.6.10-tab-resume-lock1';
const SHELL_CACHE = `bes-shell-${VERSION}`;
const RUNTIME_CACHE = `bes-runtime-${VERSION}`;
const CORE = [
  '/', '/index.html', '/offline.html', '/manifest.webmanifest',
  '/brian-english-brand-mark.png', '/pwa/icon-192.png', '/pwa/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(CORE);

    // Never replace the controller of an already-open Brian session. Doing so
    // can mix the old page bundle with assets from a newer deployment when a
    // background browser tab resumes, which is the root cause of tab-switch
    // reloads/preload failures. If no Brian window is open, activation may
    // proceed immediately; otherwise this worker waits until the old clients
    // are naturally closed/reopened.
    const openWindows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    if (openWindows.length === 0) await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('bes-') && ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function shouldCache(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/')) return false;
  if (/\/auth\//.test(url.pathname)) return false;
  return ['script', 'style', 'image', 'font', 'worker'].includes(request.destination) || url.pathname.startsWith('/assets/');
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put('/index.html', response.clone());
    return response;
  } catch {
    return (await caches.match('/index.html')) || (await caches.match('/offline.html'));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const update = fetch(request).then((response) => {
    if (response.ok && response.type === 'basic') cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || update || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (shouldCache(request, url)) event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener('message', (event) => {
  // Manual activation remains available for maintenance tools, but normal
  // browsing never sends this message because the update banner is disabled.
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('bes-')).map((key) => caches.delete(key)))));
  }
});
