(() => {
  'use strict';

  if (window.__besResourceEgressGuardV2Installed || typeof window.fetch !== 'function') return;
  window.__besResourceEgressGuardV2Installed = true;

  const nextFetch = window.fetch.bind(window);
  const LOCAL_LIBRARY_KEY = 'bes-resource-library-v10-81';
  const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
  const MARKER_PREFIX = 'bes-resource-egress-refresh-v2::';

  const stats = {
    broadReadsSeen: 0,
    networkReadsAllowed: 0,
    warmLocalReads: 0,
    mutationsSeen: 0,
    rowsReturnedLocally: 0,
    lastNetworkReadAt: '',
    lastLocalReadAt: '',
  };

  function requestMethod(input, init) {
    return String(init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
  }

  function requestUrl(input) {
    if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
    if (input instanceof URL) return input.toString();
    return String(input || '');
  }

  function requestHeaders(input, init) {
    try {
      if (init?.headers) return new Headers(init.headers);
      if (typeof Request !== 'undefined' && input instanceof Request) return new Headers(input.headers);
    } catch {
      // Missing or malformed optional headers are treated as an anonymous read.
    }
    return new Headers();
  }

  function parseRequest(input, init) {
    try {
      return {
        method: requestMethod(input, init),
        url: new URL(requestUrl(input), window.location.href),
        headers: requestHeaders(input, init),
      };
    } catch {
      return null;
    }
  }

  function isSupabaseHost(hostname) {
    const host = String(hostname || '').toLowerCase();
    return host.endsWith('.supabase.co') || host.endsWith('.supabase.in') || host.includes('.supabase.net');
  }

  function isResourceEndpoint(url) {
    return isSupabaseHost(url.hostname) && /\/rest\/v1\/resource_items\/?$/i.test(url.pathname);
  }

  function isSingleItemRead(url, headers) {
    const accept = headers.get('accept') || '';
    return url.searchParams.has('id')
      || url.searchParams.get('limit') === '1'
      || /application\/vnd\.pgrst\.object\+json/i.test(accept);
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

  function userIdFromHeaders(headers) {
    const authorization = headers.get('authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    return String(decodeJwtPayload(token)?.sub || '').trim();
  }

  function safeToken(value) {
    return String(value || '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 100);
  }

  function markerKey(userId) {
    return `${MARKER_PREFIX}${safeToken(userId)}`;
  }

  function readMarker(userId) {
    if (!userId) return 0;
    try {
      return Number(localStorage.getItem(markerKey(userId)) || 0);
    } catch {
      return 0;
    }
  }

  function writeMarker(userId) {
    if (!userId) return;
    try {
      localStorage.setItem(markerKey(userId), String(Date.now()));
    } catch {
      // The network response remains valid when storage is unavailable.
    }
  }

  function clearMarker(userId) {
    if (!userId) return;
    try {
      localStorage.removeItem(markerKey(userId));
    } catch {
      // Optional marker only.
    }
  }

  function localRows() {
    try {
      const store = JSON.parse(localStorage.getItem(LOCAL_LIBRARY_KEY) || 'null');
      const items = Array.isArray(store?.items) ? store.items : [];
      return items
        .filter((item) => item?.cloudId && !item?.deletedAt)
        .map((item) => ({
          id: item.cloudId,
          title: item.title || '',
          description: item.description || '',
          category: item.category || 'other',
          grade: item.grade || '',
          school_year: item.schoolYear || '',
          unit_name: item.unitName || '',
          cefr: item.cefr || '',
          skills: Array.isArray(item.skills) ? item.skills : [],
          tags: Array.isArray(item.tags) ? item.tags : [],
          source: item.source || '',
          copyright_status: item.copyright || 'internal',
          visibility: item.visibility || 'department',
          allow_download: item.allowDownload !== false,
          status: item.status || 'pending',
          is_featured: Boolean(item.featured),
          uploader_id: item.uploaderId || null,
          uploader_name: item.uploaderName || '',
          mime_type: item.mimeType || '',
          file_name: item.fileName || '',
          file_size: Number(item.size || 0),
          drive_file_id: item.driveFileId || null,
          drive_web_view_link: item.driveWebViewLink || null,
          drive_download_link: item.driveDownloadLink || null,
          ai_summary: item.aiSummary || '',
          ai_uses: Array.isArray(item.aiUses) ? item.aiUses : [],
          checksum: item.checksum || '',
          version_number: Number(item.version || 1),
          parent_resource_id: item.parentResourceId || null,
          created_at: item.createdAt || item.updatedAt || new Date(0).toISOString(),
          updated_at: item.updatedAt || item.createdAt || new Date(0).toISOString(),
          approved_at: item.approvedAt || null,
          approved_by: item.approvedBy || null,
          views: Number(item.views || 0),
          downloads: Number(item.downloads || 0),
          deleted_at: null,
        }))
        .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));
    } catch {
      return [];
    }
  }

  function localResponse(rows) {
    const headers = new Headers({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-bes-resource-egress-guard': 'warm-local-copy',
      'content-range': rows.length ? `0-${rows.length - 1}/${rows.length}` : '*/0',
    });
    return new Response(JSON.stringify(rows), { status: 200, headers });
  }

  function currentUserIdFromStoredSession() {
    try {
      const key = Object.keys(localStorage).find((name) => name.startsWith('sb-') && name.endsWith('-auth-token'));
      const session = key ? JSON.parse(localStorage.getItem(key) || '{}') : null;
      return String(session?.user?.id || session?.currentSession?.user?.id || '');
    } catch {
      return '';
    }
  }

  window.fetch = async function besResourceEgressGuardV2(input, init) {
    const parsed = parseRequest(input, init);
    if (!parsed || !isResourceEndpoint(parsed.url)) return nextFetch(input, init);

    const userId = userIdFromHeaders(parsed.headers);
    if (parsed.method !== 'GET') {
      stats.mutationsSeen += 1;
      clearMarker(userId);
      return nextFetch(input, init);
    }

    if (isSingleItemRead(parsed.url, parsed.headers)) return nextFetch(input, init);

    stats.broadReadsSeen += 1;
    const marker = readMarker(userId);
    const rows = localRows();
    if (userId && marker && rows.length && Date.now() - marker < REFRESH_INTERVAL_MS) {
      stats.warmLocalReads += 1;
      stats.rowsReturnedLocally += rows.length;
      stats.lastLocalReadAt = new Date().toISOString();
      return localResponse(rows);
    }

    stats.networkReadsAllowed += 1;
    stats.lastNetworkReadAt = new Date().toISOString();
    const response = await nextFetch(input, init);
    if (response?.ok && userId) writeMarker(userId);
    return response;
  };

  window.__BES_RESOURCE_EGRESS_GUARD__ = Object.freeze({
    version: '2.0.0',
    refreshIntervalHours: REFRESH_INTERVAL_MS / 3600000,
    stats,
    forceNextRefresh() {
      clearMarker(currentUserIdFromStoredSession());
    },
  });
})();
