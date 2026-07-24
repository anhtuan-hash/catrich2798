(() => {
  'use strict';

  if (window.__besFetchRouterV2Installed) return;

  const nativeFetch = window.__BES_NATIVE_FETCH__;
  const libraryGuardFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
  if (typeof nativeFetch !== 'function' || typeof libraryGuardFetch !== 'function') return;

  window.__besFetchRouterV2Installed = true;

  function requestMethod(input, init) {
    return String(init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
  }

  function requestUrl(input) {
    if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
    if (input instanceof URL) return input.toString();
    return String(input || '');
  }

  function isSupabaseLibraryRead(input, init) {
    if (requestMethod(input, init) !== 'GET') return false;
    try {
      const url = new URL(requestUrl(input), window.location.href);
      const host = url.hostname.toLowerCase();
      const isSupabase = host.endsWith('.supabase.co') || host.endsWith('.supabase.in') || host.includes('.supabase.net');
      return isSupabase && /\/rest\/v1\/library_items\/?$/i.test(url.pathname);
    } catch {
      return false;
    }
  }

  window.fetch = function besFetchRouterV2(input, init) {
    // The legacy library guard is intentionally used only for GET reads from
    // library_items. All Auth, mutations and other requests bypass it so a
    // caller-owned Request body can never be consumed by the guard.
    if (isSupabaseLibraryRead(input, init)) return libraryGuardFetch(input, init);
    return nativeFetch(input, init);
  };

  window.__BES_FETCH_ROUTER__ = Object.freeze({
    version: '2.0.0',
    libraryGuardIsolated: true,
  });
})();
