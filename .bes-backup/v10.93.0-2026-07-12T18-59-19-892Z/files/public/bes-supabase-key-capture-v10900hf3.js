(function bootstrapBESSupabaseKeyCapture(){
  'use strict';
  if (window.BESSupabaseKeyCapture && window.BESSupabaseKeyCapture.version === '10.90.0-HF3') return;

  var VERSION = '10.90.0-HF3';
  var CACHE_KEY = 'bes-supabase-captured-config-v10900hf3';
  var state = { config: null, source: '', capturedAt: '', fetchWrapped: false, xhrWrapped: false };

  function safeParse(raw, fallback) { try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; } }
  function safeGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function safeSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (_) { return false; } }
  function decodeJwt(token) {
    try {
      var part = String(token || '').split('.')[1];
      if (!part) return null;
      part = part.replace(/-/g, '+').replace(/_/g, '/');
      while (part.length % 4) part += '=';
      return JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(part), function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')));
    } catch (_) { return null; }
  }
  function isPublicKey(key) {
    if (!key || typeof key !== 'string') return false;
    if (/^sb_publishable_[A-Za-z0-9._-]{20,}$/i.test(key)) return true;
    if (key.split('.').length === 3) {
      var payload = decodeJwt(key);
      return !!(payload && payload.role === 'anon');
    }
    return false;
  }
  function normalizeUrl(value) {
    var match = String(value || '').match(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
    return match ? match[0].replace(/\/$/, '') : '';
  }
  function readHeader(headers, name) {
    if (!headers) return '';
    try {
      if (typeof Headers !== 'undefined' && headers instanceof Headers) return headers.get(name) || '';
      if (Array.isArray(headers)) {
        for (var i = 0; i < headers.length; i++) if (String(headers[i][0]).toLowerCase() === name.toLowerCase()) return String(headers[i][1] || '');
      }
      var keys = Object.keys(headers);
      for (var j = 0; j < keys.length; j++) if (keys[j].toLowerCase() === name.toLowerCase()) return String(headers[keys[j]] || '');
    } catch (_) {}
    return '';
  }
  function save(url, key, source) {
    url = normalizeUrl(url);
    if (!url || !isPublicKey(key)) return false;
    var next = { url: url, key: key, source: source || 'network', savedAt: Date.now() };
    state.config = next;
    state.source = next.source;
    state.capturedAt = new Date(next.savedAt).toISOString();
    safeSet(CACHE_KEY, JSON.stringify(next));
    try { window.dispatchEvent(new CustomEvent('bes-supabase-public-config', { detail: { url: url, source: next.source } })); } catch (_) {}
    return true;
  }
  function inspect(url, headers, source) {
    var origin = normalizeUrl(url);
    if (!origin) return false;
    var key = readHeader(headers, 'apikey');
    return save(origin, key, source);
  }
  function loadCached() {
    var cached = safeParse(safeGet(CACHE_KEY), null);
    if (cached && normalizeUrl(cached.url) && isPublicKey(cached.key)) {
      state.config = cached;
      state.source = cached.source || 'cache';
      state.capturedAt = cached.savedAt ? new Date(cached.savedAt).toISOString() : '';
    }
  }
  function wrapFetch() {
    if (state.fetchWrapped || typeof window.fetch !== 'function') return;
    var original = window.fetch;
    function wrappedFetch(input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var requestHeaders = input && input.headers;
        inspect(url, requestHeaders, 'fetch-request');
        inspect(url, init && init.headers, 'fetch-init');
      } catch (_) {}
      return original.apply(this, arguments);
    }
    try {
      Object.defineProperty(wrappedFetch, 'name', { value: 'fetch' });
      wrappedFetch.__besOriginalFetch = original;
    } catch (_) {}
    window.fetch = wrappedFetch;
    state.fetchWrapped = true;
  }
  function wrapXHR() {
    if (state.xhrWrapped || typeof XMLHttpRequest === 'undefined') return;
    var proto = XMLHttpRequest.prototype;
    if (!proto || proto.__besKeyCaptureWrapped) { state.xhrWrapped = true; return; }
    var originalOpen = proto.open;
    var originalSetHeader = proto.setRequestHeader;
    proto.open = function (method, url) {
      this.__besSupabaseUrl = url;
      this.__besHeaders = this.__besHeaders || {};
      return originalOpen.apply(this, arguments);
    };
    proto.setRequestHeader = function (name, value) {
      this.__besHeaders = this.__besHeaders || {};
      this.__besHeaders[name] = value;
      inspect(this.__besSupabaseUrl, this.__besHeaders, 'xhr');
      return originalSetHeader.apply(this, arguments);
    };
    proto.__besKeyCaptureWrapped = true;
    state.xhrWrapped = true;
  }
  function report() {
    return {
      version: VERSION,
      captured: !!state.config,
      projectUrl: state.config ? state.config.url : '',
      keyType: state.config ? (/^sb_publishable_/i.test(state.config.key) ? 'publishable' : 'anon-jwt') : '',
      source: state.source,
      capturedAt: state.capturedAt,
      fetchWrapped: state.fetchWrapped,
      xhrWrapped: state.xhrWrapped
    };
  }
  function getConfig() {
    if (!state.config) loadCached();
    return state.config && isPublicKey(state.config.key) ? { url: state.config.url, key: state.config.key, source: state.config.source || 'capture', savedAt: state.config.savedAt || Date.now() } : null;
  }
  function reset() {
    state.config = null; state.source = ''; state.capturedAt = '';
    try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
  }

  loadCached();
  wrapFetch();
  wrapXHR();
  window.BESSupabaseKeyCapture = { version: VERSION, getConfig: getConfig, report: report, reset: reset, isPublicKey: isPublicKey };
})();
