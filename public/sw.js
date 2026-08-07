const VERSION = '11.6.11-retired-service-worker1';

// This worker exists only to retire older Brian service workers cleanly.
// It intentionally has no fetch handler, so once activated it cannot serve a
// cached application shell or cached JavaScript/CSS into a resumed browser tab.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith('bes-'))
      .map((key) => caches.delete(key)));

    // Replace any older cache-serving controller for already-open tabs, then
    // unregister this retirement worker. Current clients become network-only
    // immediately; future Brian visits have no service-worker lifecycle at all.
    await self.clients.claim();
    await self.registration.unregister();

    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => {
      try { client.postMessage({ type: 'BES_SERVICE_WORKER_RETIRED', version: VERSION }); } catch { /* best effort */ }
    });
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('bes-')).map((key) => caches.delete(key)),
    )));
  }
});
