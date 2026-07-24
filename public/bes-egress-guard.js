(() => {
  'use strict';

  if (window.__besEgressGuardInstalled || typeof window.fetch !== 'function') return;
  window.__besEgressGuardInstalled = true;

  const originalFetch = window.fetch.bind(window);
  const CACHE_TTL_MS = 15 * 60 * 1000;
  const WARM_DEVICE_REFRESH_MS = 6 * 60 * 60 * 1000;
  const PER_TYPE_LIMIT = 4;
  const FILTERED_TYPE_LIMIT = 8;
  const LIBRARY_TYPES = ['history', 'prompt', 'question'];
  const LOCAL_KEYS = {
    history: 'bet-v4-history',
    prompt: 'bet-v4-prompts',
    question: 'bet-v4-question-bank',
  };
  const memoryCache = new Map();
  const forceRefreshUsers = new Set();
  const stats = {
    libraryRequestsIntercepted: 0,
    libraryRequestsServedFromMemory: 0,
    warmDeviceNetworkReadsSkipped: 0,
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

  function decodeJwtPayload(token) {
    try {
      const segment = String(token || '').split('.')[1] || '';
      const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  function userIdFromRequest(request) {
    const authorization = request.headers.get('authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    const payload = decodeJwtPayload(token);
    return String(payload?.sub || '').trim();
  }

  function safeOwnerToken(value) {
    return String(value || 'guest').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 100) || 'guest';
  }

  function localRowsForUser(userId, itemType = '') {
    if (!userId) return [];
    const owner = safeOwnerToken(userId);
    const types = itemType ? [itemType] : LIBRARY_TYPES;
    const rows = [];

    for (const type of types) {
      const baseKey = LOCAL_KEYS[type];
      if (!baseKey) continue;
      try {
        const list = JSON.parse(localStorage.getItem(`${baseKey}::${owner}`) || '[]');
        if (!Array.isArray(list)) continue;
        for (const item of list) {
          if (!item?.id) continue;
          const createdAt = item.createdAt || item.updatedAt || new Date(0).toISOString();
          const updatedAt = item.updatedAt || item.createdAt || createdAt;
          rows.push({
            id: item.id,
            item_type: type,
            payload: {
              id: item.id,
              createdAt,
              updatedAt,
            },
            created_at: createdAt,
            updated_at: updatedAt,
          });
        }
      } catch {
        // A damaged local list should not disable the guard for other categories.
      }
    }

    return rows.sort((left, right) => new Date(right.updated_at || 0) - new Date(left.updated_at || 0));
  }

  function refreshMarkerKey(userId) {
    return `bes-egress-library-refresh::${safeOwnerToken(userId)}`;
  }

  function readLastRefresh(userId) {
    try {
      return Number(localStorage.getItem(refreshMarkerKey(userId)) || 0);
    } catch {
      return 0;
    }
  }

  function markRefreshed(userId) {
    if (!userId) return;
    try {
      localStorage.setItem(refreshMarkerKey(userId), String(Date.now()));
    } catch {
      // Optional egress marker.
    }
  }

  function canUseWarmLocalCopy(userId, rows) {
    if (!userId || !rows.length || forceRefreshUsers.has(userId)) return false;
    const lastRefresh = readLastRefresh(userId);
    if (!lastRefresh) {
      markRefreshed(userId);
      return true;
    }
    return Date.now() - lastRefresh < WARM_DEVICE_REFRESH_MS;
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

  function responseFromRows(rows, sourceResponses = [], mode = 'library-windowed') {
    const headers = new Headers({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-bes-egress-guard': mode,
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

  function filteredType(url) {
    const value = String(url.searchParams.get('item_type') || '');
    const match = value.match(/^eq\.(history|prompt|question)$/i);
    return match ? match[1].toLowerCase() : '';
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

    const userId = userIdFromRequest(request);
    const type = filteredType(url);
    const localRows = localRowsForUser(userId, type);
    if (canUseWarmLocalCopy(userId, localRows)) {
      stats.warmDeviceNetworkReadsSkipped += 1;
      stats.rowsReturned += localRows.length;
      const localResponse = responseFromRows(localRows, [], 'warm-local-copy');
      await storeMemory(key, localResponse.clone());
      return localResponse;
    }

    forceRefreshUsers.delete(userId);

    if (type) {
      const response = await fetchWindow(url, request, '', FILTERED_TYPE_LIMIT);
      if (response.ok) markRefreshed(userId);
      await storeMemory(key, response.clone());
      try {
        const rows = await response.clone().json();
        stats.rowsReturned += Array.isArray(rows) ? rows.length : 0;
      } catch { /* response remains usable */ }
      return response;
    }

    stats.fullLibraryReadsPrevented += 1;
    const responses = await Promise.all(LIBRARY_TYPES.map((libraryType) => fetchWindow(url, request, libraryType, PER_TYPE_LIMIT)));
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

    markRefreshed(userId);
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
    version: '1.1.0',
    config: {
      cacheTtlMinutes: CACHE_TTL_MS / 60000,
      warmDeviceRefreshHours: WARM_DEVICE_REFRESH_MS / 3600000,
      perTypeLimit: PER_TYPE_LIMIT,
      filteredTypeLimit: FILTERED_TYPE_LIMIT,
    },
    stats,
    clearMemoryCache() {
      memoryCache.clear();
    },
    forceNextLibraryRefresh() {
      memoryCache.clear();
      try {
        const token = Object.keys(localStorage).find((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
        const session = token ? JSON.parse(localStorage.getItem(token) || '{}') : null;
        const userId = String(session?.user?.id || session?.currentSession?.user?.id || '');
        if (userId) {
          forceRefreshUsers.add(userId);
          localStorage.removeItem(refreshMarkerKey(userId));
        }
      } catch {
        // A normal six-hour refresh remains available.
      }
    },
  };
})();
