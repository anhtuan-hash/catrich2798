(() => {
  'use strict';

  if (window.__besEgressGuardInstalled || typeof window.fetch !== 'function') return;
  window.__besEgressGuardInstalled = true;

  const originalFetch = window.fetch.bind(window);
  const CACHE_TTL_MS = 15 * 60 * 1000;
  const PER_TYPE_LIMIT = 4;
  const FILTERED_TYPE_LIMIT = 8;
  const LIBRARY_TYPES = ['history', 'prompt', 'question'];
  const memoryCache = new Map();
  const stats = {
    libraryRequestsIntercepted: 0,
    libraryRequestsServedFromMemory: 0,
    fullLibraryReadsPrevented: 0,
    rowsReturned: 0,
    lastInterceptedAt: '',
  };

  function isSupabaseHost(hostname) {
    const host = String(hostname || '').toLowerCase();
    return host.endsWith('.supabase.co') || host.endsWith('.supabase.in') || host.includes('.supabase.net');
  }

  function isLibraryEndpoint(url) {
    return isSupabaseHost(url.hostname) && /\/rest\/v1\/library_items\/?$/i.test(url.pathname);
  }

  function requestFrom(input, init) {
    try {
      return input instanceof Request ? new Request(input, init) : new Request(input, init);
    } catch {
      return null;
    }
  }

  function authFingerprint(request) {
    const token = request.headers.get('authorization') || '';
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function stableQueryKey(url, request) {
    const copy = new URL(url.toString());
    copy.searchParams.delete('limit');
    copy.searchParams.delete('offset');
    return `${authFingerprint(request)}:${copy.toString()}`;
  }

  function cachedResponse(entry) {
    return new Response(entry.body, {
      status: entry.status,
      statusText: entry.statusText,
      headers: entry.headers,
    });
  }

  function readMemory(key) {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
      memoryCache.delete(key);
      return null;
    }
    return cachedResponse(entry);
  }

  async function storeMemory(key, response) {
    if (!response?.ok) return response;
    const clone = response.clone();
    const body = await clone.text();
    const headers = {};
    clone.headers.forEach((value, name) => { headers[name] = value; });
    memoryCache.set(key, {
      body,
      headers,
      status: clone.status,
      statusText: clone.statusText,
      createdAt: Date.now(),
    });
    return response;
  }

  function modifiedRequest(request, url) {
    const headers = new Headers(request.headers);
    headers.delete('range');
    return new Request(url.toString(), {
      method: 'GET',
      headers,
      mode: request.mode === 'navigate' ? 'cors' : request.mode,
      credentials: request.credentials,
      cache: 'no-store',
      redirect: request.redirect,
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy,
      integrity: request.integrity,
      keepalive: request.keepalive,
      signal: request.signal,
    });
  }

  function responseFromRows(rows, sourceResponses = []) {
    const headers = new Headers({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-bes-egress-guard': 'library-windowed',
      'content-range': rows.length ? `0-${rows.length - 1}/${rows.length}` : '*/0',
    });
    const requestId = sourceResponses.map((response) => response.headers.get('sb-request-id')).find(Boolean);
    if (requestId) headers.set('sb-request-id', requestId);
    return new Response(JSON.stringify(rows), { status: 200, headers });
  }

  function isSingleItemRead(url, request) {
    const accept = request.headers.get('accept') || '';
    return url.searchParams.has('id')
      || /application\/vnd\.pgrst\.object\+json/i.test(accept)
      || url.searchParams.get('limit') === '1';
  }

  async function fetchWindow(url, request, itemType, limit) {
    const nextUrl = new URL(url.toString());
    nextUrl.searchParams.set('limit', String(limit));
    nextUrl.searchParams.delete('offset');
    if (itemType) nextUrl.searchParams.set('item_type', `eq.${itemType}`);
    return originalFetch(modifiedRequest(request, nextUrl));
  }

  async function handleLibraryRead(url, request) {
    const key = stableQueryKey(url, request);
    const cached = readMemory(key);
    if (cached) {
      stats.libraryRequestsServedFromMemory += 1;
      return cached;
    }

    stats.libraryRequestsIntercepted += 1;
    stats.lastInterceptedAt = new Date().toISOString();

    const existingTypeFilter = url.searchParams.get('item_type');
    if (existingTypeFilter) {
      const response = await fetchWindow(url, request, '', FILTERED_TYPE_LIMIT);
      await storeMemory(key, response.clone());
      try {
        const rows = await response.clone().json();
        stats.rowsReturned += Array.isArray(rows) ? rows.length : 0;
      } catch { /* response remains usable */ }
      return response;
    }

    stats.fullLibraryReadsPrevented += 1;
    const responses = await Promise.all(LIBRARY_TYPES.map((type) => fetchWindow(url, request, type, PER_TYPE_LIMIT)));
    const failed = responses.find((response) => !response.ok);
    if (failed) return failed;

    const groups = await Promise.all(responses.map(async (response) => {
      try {
        const value = await response.clone().json();
        return Array.isArray(value) ? value : [];
      } catch {
        return [];
      }
    }));

    const rows = groups
      .flat()
      .sort((left, right) => new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0));

    stats.rowsReturned += rows.length;
    const combined = responseFromRows(rows, responses);
    await storeMemory(key, combined.clone());
    return combined;
  }

  window.fetch = async function besEgressGuardFetch(input, init) {
    const request = requestFrom(input, init);
    if (!request || request.method.toUpperCase() !== 'GET') return originalFetch(input, init);

    let url;
    try {
      url = new URL(request.url);
    } catch {
      return originalFetch(input, init);
    }

    if (!isLibraryEndpoint(url) || isSingleItemRead(url, request)) return originalFetch(input, init);

    try {
      return await handleLibraryRead(url, request);
    } catch (error) {
      console.warn('[BES Egress Guard] Windowed library request failed.', error);
      const emergencyUrl = new URL(url.toString());
      emergencyUrl.searchParams.set('limit', String(PER_TYPE_LIMIT));
      emergencyUrl.searchParams.delete('offset');
      return originalFetch(modifiedRequest(request, emergencyUrl));
    }
  };

  window.__BES_EGRESS_GUARD__ = {
    version: '1.0.0',
    config: {
      cacheTtlMinutes: CACHE_TTL_MS / 60000,
      perTypeLimit: PER_TYPE_LIMIT,
      filteredTypeLimit: FILTERED_TYPE_LIMIT,
    },
    stats,
    clearMemoryCache() {
      memoryCache.clear();
    },
  };
})();
