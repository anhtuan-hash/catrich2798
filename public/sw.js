const VERSION = '11.6.8-egress1';
const SHELL_CACHE = `bes-shell-${VERSION}`;
const RUNTIME_CACHE = `bes-runtime-${VERSION}`;
const MEDIA_CACHE = `bes-media-${VERSION}`;
const CORE = [
  '/', '/index.html', '/offline.html', '/manifest.webmanifest',
  '/brian-english-brand-mark.png', '/pwa/icon-192.png', '/pwa/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('bes-') && ![SHELL_CACHE, RUNTIME_CACHE, MEDIA_CACHE].includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function shouldCache(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/')) return false;
  if (/\/auth\//.test(url.pathname)) return false;
  return ['script', 'style', 'image', 'font', 'worker'].includes(request.destination) || url.pathname.startsWith('/assets/');
}

function isSupabaseSharedMusic(request, url) {
  if (request.method !== 'GET') return false;
  const host = url.hostname.toLowerCase();
  if (!(host.endsWith('.supabase.co') || host.endsWith('.supabase.in') || host.includes('.supabase.net'))) return false;
  return /\/storage\/v1\/object\/(?:sign|public)\/shared-music\//i.test(url.pathname);
}

function mediaCacheKey(url) {
  const stableSource = `${url.origin}${url.pathname}`;
  return new Request(`${self.location.origin}/__bes-media-cache__?source=${encodeURIComponent(stableSource)}`);
}

async function trimMediaCache(cache, keep = 4) {
  const keys = await cache.keys();
  if (keys.length <= keep) return;
  await Promise.all(keys.slice(0, Math.max(0, keys.length - keep)).map((key) => cache.delete(key)));
}

function parseByteRange(header, total) {
  const match = String(header || '').match(/^bytes=(\d*)-(\d*)$/i);
  if (!match || !Number.isFinite(total) || total <= 0) return null;
  const startText = match[1];
  const endText = match[2];
  let start;
  let end;

  if (!startText && endText) {
    const suffixLength = Math.min(total, Number(endText));
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = total - suffixLength;
    end = total - 1;
  } else {
    start = Number(startText || 0);
    end = endText ? Number(endText) : total - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= total || end < start) return null;
  return { start, end: Math.min(end, total - 1) };
}

async function partialResponse(response, rangeHeader) {
  if (!rangeHeader || response.type === 'opaque') return response;
  const buffer = await response.arrayBuffer();
  const range = parseByteRange(rangeHeader, buffer.byteLength);
  if (!range) return new Response(null, {
    status: 416,
    headers: { 'Content-Range': `bytes */${buffer.byteLength}` },
  });

  const body = buffer.slice(range.start, range.end + 1);
  const headers = new Headers(response.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${buffer.byteLength}`);
  headers.set('Content-Length', String(body.byteLength));
  headers.set('X-BES-Media-Cache', 'hit');
  return new Response(body, { status: 206, statusText: 'Partial Content', headers });
}

function fullMediaRequest(request) {
  const headers = new Headers(request.headers);
  headers.delete('range');
  return new Request(request.url, {
    method: 'GET',
    headers,
    mode: request.mode,
    credentials: request.credentials,
    cache: 'no-store',
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    integrity: request.integrity,
    signal: request.signal,
  });
}

async function cacheFirstSupabaseMedia(request, url) {
  const cache = await caches.open(MEDIA_CACHE);
  const key = mediaCacheKey(url);
  const rangeHeader = request.headers.get('range');
  const cached = await cache.match(key);

  if (cached) return partialResponse(cached, rangeHeader);

  try {
    const fullResponse = await fetch(fullMediaRequest(request));
    if ((fullResponse.ok || fullResponse.type === 'opaque') && fullResponse.status !== 206) {
      await cache.put(key, fullResponse.clone());
      await trimMediaCache(cache);
      return partialResponse(fullResponse, rangeHeader);
    }
  } catch {
    // Fall through to the original range request.
  }

  return fetch(request);
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
  if (isSupabaseSharedMusic(request, url)) {
    event.respondWith(cacheFirstSupabaseMedia(request, url));
    return;
  }
  if (shouldCache(request, url)) event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('bes-')).map((key) => caches.delete(key)))));
  }
});
