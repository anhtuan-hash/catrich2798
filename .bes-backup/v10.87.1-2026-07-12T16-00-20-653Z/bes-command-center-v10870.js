(function bootstrapBrianCommandCenter() {
  'use strict';

  var VERSION = '10.87.0';
  var SCHEMA = 1;
  var BASE_KEY = 'bes-command-center-v10870';
  var CATALOG_KEY = 'bes-command-center-catalog-v10870';
  var CHANNEL_NAME = 'bes-command-center-v10870';
  var MAX_RECENT = 18;
  var MAX_DISCOVERED = 120;
  var MAX_DOCK_ITEMS = 6;

  var STATIC_CATALOG = [
    { id: 'home', label: 'Trang chủ', route: '#/', group: 'Hệ thống', icon: '⌂', keywords: 'home start dashboard trang chủ' },
    { id: 'apps', label: 'Ứng dụng', route: '#/apps', group: 'Hệ thống', icon: '▦', keywords: 'apps application launcher ứng dụng' },
    { id: 'library', label: 'Thư viện', route: '#/library', group: 'Tài nguyên', icon: '▤', keywords: 'library resource vault tài liệu học liệu' },
    { id: 'games', label: 'Trò chơi', route: '#/games', group: 'Giảng dạy', icon: '◆', keywords: 'games game hub trò chơi' },
    { id: 'practice', label: 'Luyện tập', route: '#/practice', group: 'Giảng dạy', icon: '✓', keywords: 'practice student learner luyện tập' },
    { id: 'news', label: 'Đọc báo', route: '#/news', group: 'Tài nguyên', icon: 'N', keywords: 'news newsroom reader đọc báo' },
    { id: 'department', label: 'Không gian tổ chuyên môn', route: '#/department', group: 'Chuyên môn', icon: 'D', keywords: 'department workspace tổ chuyên môn TTCM' },
    { id: 'settings', label: 'Cài đặt', route: '#/settings', group: 'Hệ thống', icon: '⚙', keywords: 'settings preferences cài đặt' },
    { id: 'profile', label: 'Trang cá nhân', route: '#/profile', group: 'Hệ thống', icon: '●', keywords: 'profile account tài khoản cá nhân' },
    { id: 'qa', label: 'System Health', route: '#/qa', group: 'Quản trị', icon: '+', keywords: 'qa system health kiểm tra hệ thống lỗi', roles: ['admin', 'ttcm'] },
    { id: 'ai-governance', label: 'Quản trị AI', route: '#/ai-governance', group: 'Quản trị', icon: 'AI', keywords: 'AI governance admin hạn mức audit', roles: ['admin', 'ttcm'] },
    { id: 'activity-studio', label: 'Activity Studio', route: '#/tool/activity-studio', group: 'Giảng dạy', icon: 'A', keywords: 'activity studio hoạt động' },
    { id: 'exam-studio', label: 'Exam Studio', route: '#/tool/exam-studio', group: 'Kiểm tra', icon: 'E', keywords: 'exam test online kiểm tra đề thi' },
    { id: 'worksheet-factory', label: 'Worksheet Factory', route: '#/tool/worksheet-factory', group: 'Giảng dạy', icon: 'W', keywords: 'worksheet factory phiếu học tập' },
    { id: 'wordgraph', label: 'WordGraph Studio', route: '#/tool/wordgraph', group: 'Giảng dạy', icon: 'G', keywords: 'wordgraph vocabulary feature tree từ vựng' },
    { id: 'reading-studio', label: 'Reading Studio', route: '#/tool/reading-studio', group: 'Kỹ năng', icon: 'R', keywords: 'reading studio đọc hiểu' },
    { id: 'speaking-studio', label: 'Speaking Studio', route: '#/tool/speaking-studio', group: 'Kỹ năng', icon: 'S', keywords: 'speaking pronunciation nói phát âm' },
    { id: 'lesson-architect', label: 'Lesson Architect', route: '#/tool/lesson-architect', group: 'Giảng dạy', icon: 'L', keywords: 'lesson plan architect bài dạy giáo án' },
    { id: 'learner-sprint', label: 'Learner Sprint', route: '#/tool/learner-sprint', group: 'Học sinh', icon: '▶', keywords: 'learner sprint student học sinh' },
    { id: 'textcare-fixer', label: 'TextCare Fixer', route: '#/tool/textcare-fixer', group: 'Tài nguyên', icon: 'T', keywords: 'textcare document văn bản hành chính' },
    { id: 'vietnam-tax', label: 'Tính thuế TNCN 2026', route: '#/tool/vietnam-tax', group: 'Tiện ích', icon: '%', keywords: 'tax vietnam thuế tncn 2026' }
  ];

  var state = {
    accountKey: 'local',
    storageKey: BASE_KEY + ':local',
    config: null,
    catalog: [],
    activeView: 'search',
    activeGroup: 'all',
    searchQuery: '',
    selectedIndex: 0,
    open: false,
    discoveredAt: 0,
    channel: null,
    observer: null,
    saveTimer: null,
    discoveryTimer: null
  };

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  }

  function safeSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; }
  }

  function safeRemove(key) {
    try { window.localStorage.removeItem(key); return true; } catch (_) { return false; }
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9#/%._\-\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function hashString(value) {
    var text = String(value || 'local');
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function extractIdentityFromObject(value) {
    if (!value || typeof value !== 'object') return '';
    var candidates = [
      value.email,
      value.id,
      value.user_id,
      value.userId,
      value.profile && value.profile.email,
      value.profile && value.profile.id,
      value.user && value.user.email,
      value.user && value.user.id,
      value.currentSession && value.currentSession.user && value.currentSession.user.email,
      value.currentSession && value.currentSession.user && value.currentSession.user.id,
      value.session && value.session.user && value.session.user.email,
      value.session && value.session.user && value.session.user.id
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      if (candidates[i]) return String(candidates[i]);
    }
    return '';
  }

  function resolveAccountKey() {
    var identity = '';
    try {
      for (var i = 0; i < window.localStorage.length && !identity; i += 1) {
        var key = window.localStorage.key(i);
        if (!key || !/(auth|session|profile|current.?user|account)/i.test(key)) continue;
        var raw = window.localStorage.getItem(key);
        if (!raw || raw.length > 500000) continue;
        var parsed = safeParse(raw, null);
        identity = extractIdentityFromObject(parsed);
      }
    } catch (_) {}
    return identity ? hashString(identity) : 'local';
  }

  function detectRole() {
    var direct = [];
    try {
      direct.push(document.documentElement.getAttribute('data-role'));
      direct.push(document.body && document.body.getAttribute('data-role'));
      direct.push(safeGet('bes-role'));
      direct.push(safeGet('bes-user-role'));
      for (var i = 0; i < window.localStorage.length; i += 1) {
        var key = window.localStorage.key(i);
        if (!key || !/(profile|current.?user|account|role)/i.test(key)) continue;
        var raw = window.localStorage.getItem(key);
        if (raw && raw.length < 100000) direct.push(raw);
      }
    } catch (_) {}
    var combined = normalizeText(direct.filter(Boolean).join(' '));
    if (/\badmin\b/.test(combined)) return 'admin';
    if (/\bttcm\b|to truong|head of english|department head/.test(combined)) return 'ttcm';
    return 'teacher';
  }

  function defaultConfig() {
    return {
      schema: SCHEMA,
      version: VERSION,
      enabled: true,
      dockVisible: true,
      triggerVisible: true,
      prefs: {
        home: { pinned: true, hidden: false, group: 'Hệ thống', order: 0 },
        apps: { pinned: true, hidden: false, group: 'Hệ thống', order: 1 },
        library: { pinned: true, hidden: false, group: 'Tài nguyên', order: 2 },
        games: { pinned: true, hidden: false, group: 'Giảng dạy', order: 3 }
      },
      customGroups: [],
      recent: [],
      usage: {},
      lastView: 'search',
      lastGroup: 'all',
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeConfig(input) {
    var base = defaultConfig();
    var value = input && typeof input === 'object' ? input : {};
    base.enabled = value.enabled !== false;
    base.dockVisible = value.dockVisible !== false;
    base.triggerVisible = value.triggerVisible !== false;
    base.prefs = value.prefs && typeof value.prefs === 'object' ? value.prefs : base.prefs;
    base.customGroups = Array.isArray(value.customGroups) ? value.customGroups.filter(function (name) {
      return typeof name === 'string' && name.trim();
    }).map(function (name) { return name.trim().slice(0, 40); }).slice(0, 24) : [];
    base.recent = Array.isArray(value.recent) ? value.recent.slice(0, MAX_RECENT) : [];
    base.usage = value.usage && typeof value.usage === 'object' ? value.usage : {};
    base.lastView = ['search', 'favorites', 'recent', 'organize', 'settings'].indexOf(value.lastView) >= 0 ? value.lastView : 'search';
    base.lastGroup = typeof value.lastGroup === 'string' ? value.lastGroup : 'all';
    base.updatedAt = value.updatedAt || new Date().toISOString();
    return base;
  }

  function loadConfig() {
    state.accountKey = resolveAccountKey();
    state.storageKey = BASE_KEY + ':' + state.accountKey;
    state.config = normalizeConfig(safeParse(safeGet(state.storageKey), null));
    state.activeView = state.config.lastView;
    state.activeGroup = state.config.lastGroup;
  }

  function refreshAccountScope() {
    var nextAccountKey = resolveAccountKey();
    if (nextAccountKey === state.accountKey) return false;
    state.accountKey = nextAccountKey;
    state.storageKey = BASE_KEY + ':' + state.accountKey;
    state.config = normalizeConfig(safeParse(safeGet(state.storageKey), null));
    state.activeView = state.config.lastView;
    state.activeGroup = state.config.lastGroup;
    return true;
  }

  function saveConfig(immediate) {
    if (!state.config) return;
    state.config.schema = SCHEMA;
    state.config.version = VERSION;
    state.config.lastView = state.activeView;
    state.config.lastGroup = state.activeGroup;
    state.config.updatedAt = new Date().toISOString();
    var write = function () {
      state.saveTimer = null;
      safeSet(state.storageKey, JSON.stringify(state.config));
      if (state.channel) {
        try { state.channel.postMessage({ type: 'config', accountKey: state.accountKey, config: state.config }); } catch (_) {}
      }
    };
    if (immediate) {
      if (state.saveTimer) window.clearTimeout(state.saveTimer);
      write();
    } else {
      if (state.saveTimer) window.clearTimeout(state.saveTimer);
      state.saveTimer = window.setTimeout(write, 120);
    }
  }

  function routeToId(route) {
    var clean = String(route || '#/').replace(/[?&]stability=\d+/g, '');
    var known = STATIC_CATALOG.find(function (item) { return item.route === clean; });
    if (known) return known.id;
    return 'route-' + hashString(clean);
  }

  function normalizeRoute(value) {
    if (!value) return '';
    var route = String(value).trim();
    try {
      if (/^https?:/i.test(route)) {
        var url = new URL(route, window.location.href);
        if (url.origin !== window.location.origin) return '';
        route = url.hash || (url.pathname === '/' ? '#/' : '#' + url.pathname);
      }
    } catch (_) { return ''; }
    if (route === '#' || route === '#/') return '#/';
    if (route.charAt(0) === '/' && route.charAt(1) !== '/') route = '#' + route;
    if (route.indexOf('#/') !== 0) return '';
    return route.split('?')[0].replace(/\/$/, '') || '#/';
  }

  function cleanLabel(value) {
    var text = String(value || '').replace(/\s+/g, ' ').trim();
    text = text.replace(/^(mở|open|xem|go to)\s+/i, '');
    return text.slice(0, 72);
  }

  function discoverCatalogFromDom() {
    var found = [];
    var seen = {};
    var nodes = document.querySelectorAll('a[href*="#/"], [data-route], [data-href*="#/"]');
    Array.prototype.forEach.call(nodes, function (node) {
      if (found.length >= MAX_DISCOVERED) return;
      if (node.closest && node.closest('#bes-command-overlay, #bes-command-dock, #bes-command-trigger')) return;
      var rawRoute = node.getAttribute('data-route') || node.getAttribute('data-href') || node.getAttribute('href');
      var route = normalizeRoute(rawRoute);
      if (!route || seen[route]) return;
      var label = cleanLabel(node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent);
      if (!label || label.length < 2) return;
      seen[route] = true;
      found.push({
        id: routeToId(route),
        label: label,
        route: route,
        group: route.indexOf('/tool/') >= 0 ? 'Ứng dụng' : 'Hệ thống',
        icon: label.slice(0, 1).toUpperCase(),
        keywords: label + ' ' + route,
        discovered: true
      });
    });
    return found;
  }

  function mergeCatalog() {
    var role = detectRole();
    var persisted = safeParse(safeGet(CATALOG_KEY), []);
    if (!Array.isArray(persisted)) persisted = [];
    var discovered = discoverCatalogFromDom();
    if (discovered.length) {
      var byRouteForPersist = {};
      persisted.concat(discovered).forEach(function (item) {
        if (item && item.route) byRouteForPersist[item.route] = item;
      });
      persisted = Object.keys(byRouteForPersist).map(function (route) { return byRouteForPersist[route]; }).slice(-MAX_DISCOVERED);
      safeSet(CATALOG_KEY, JSON.stringify(persisted));
    }

    var byRoute = {};
    STATIC_CATALOG.concat(persisted).concat(discovered).forEach(function (item) {
      if (!item || !item.route) return;
      if (item.roles && item.roles.indexOf(role) < 0) return;
      var route = normalizeRoute(item.route);
      if (!route) return;
      var existing = byRoute[route] || {};
      byRoute[route] = {
        id: item.id || existing.id || routeToId(route),
        label: item.discovered ? item.label : (existing.label || item.label),
        route: route,
        group: item.group || existing.group || 'Khác',
        icon: item.icon || existing.icon || (item.label || '?').slice(0, 1).toUpperCase(),
        keywords: [existing.keywords, item.keywords, item.label, route].filter(Boolean).join(' '),
        discovered: Boolean(item.discovered || existing.discovered)
      };
    });

    state.catalog = Object.keys(byRoute).map(function (route) { return byRoute[route]; });
    state.catalog.sort(sortItems);
    state.discoveredAt = Date.now();
  }

  function getPref(item) {
    if (!state.config.prefs[item.id]) {
      state.config.prefs[item.id] = {
        pinned: false,
        hidden: false,
        group: item.group || 'Khác',
        order: 9999
      };
    }
    var pref = state.config.prefs[item.id];
    if (typeof pref.pinned !== 'boolean') pref.pinned = false;
    if (typeof pref.hidden !== 'boolean') pref.hidden = false;
    if (!pref.group) pref.group = item.group || 'Khác';
    if (!Number.isFinite(Number(pref.order))) pref.order = 9999;
    return pref;
  }

  function sortItems(a, b) {
    var ap = state.config ? getPref(a) : { order: 9999 };
    var bp = state.config ? getPref(b) : { order: 9999 };
    var orderDelta = Number(ap.order) - Number(bp.order);
    if (orderDelta) return orderDelta;
    return String(a.label).localeCompare(String(b.label), 'vi');
  }

  function visibleCatalog() {
    return state.catalog.filter(function (item) { return !getPref(item).hidden; });
  }

  function allGroups() {
    var groups = {};
    state.catalog.forEach(function (item) { groups[getPref(item).group || item.group || 'Khác'] = true; });
    state.config.customGroups.forEach(function (group) { groups[group] = true; });
    return Object.keys(groups).sort(function (a, b) { return a.localeCompare(b, 'vi'); });
  }

  function currentRoute() {
    return normalizeRoute(window.location.hash || '#/') || '#/';
  }

  function itemForRoute(route) {
    var normalized = normalizeRoute(route);
    return state.catalog.find(function (item) { return item.route === normalized; }) || null;
  }

  function recordVisit(route) {
    refreshAccountScope();
    var normalized = normalizeRoute(route);
    if (!normalized) return;
    if (Date.now() - state.discoveredAt > 1200) mergeCatalog();
    var item = itemForRoute(normalized) || {
      id: routeToId(normalized), label: normalized === '#/' ? 'Trang chủ' : normalized, route: normalized, group: 'Hệ thống', icon: '↗', keywords: normalized
    };
    if (!itemForRoute(normalized)) state.catalog.push(item);
    state.config.usage[item.id] = Number(state.config.usage[item.id] || 0) + 1;
    state.config.recent = state.config.recent.filter(function (entry) { return entry.id !== item.id; });
    state.config.recent.unshift({ id: item.id, route: item.route, label: item.label, at: new Date().toISOString() });
    state.config.recent = state.config.recent.slice(0, MAX_RECENT);
    saveConfig(false);
    renderDock();
  }

  function navigate(item) {
    if (!item || !item.route) return;
    recordVisit(item.route);
    closePalette();
    try {
      window.dispatchEvent(new CustomEvent('bes-command-center-navigate', { detail: { item: item, version: VERSION } }));
    } catch (_) {}
    if (window.location.hash === item.route) {
      window.dispatchEvent(new Event('hashchange'));
      return;
    }
    window.location.hash = item.route.replace(/^#/, '');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toast(message) {
    var old = document.querySelector('.bescc-toast');
    if (old) old.remove();
    var node = document.createElement('div');
    node.className = 'bescc-toast';
    node.textContent = message;
    document.body.appendChild(node);
    window.setTimeout(function () { if (node.parentNode) node.remove(); }, 2400);
  }

  function createShell() {
    if (document.getElementById('bes-command-overlay')) return;

    var trigger = document.createElement('button');
    trigger.id = 'bes-command-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Mở Command Center');
    trigger.innerHTML = '<span class="bescc-trigger-icon">⌘</span><span class="bescc-trigger-label">Command Center</span><span class="bescc-trigger-shortcut">Ctrl K</span>';
    trigger.addEventListener('click', togglePalette);
    document.body.appendChild(trigger);

    var dock = document.createElement('nav');
    dock.id = 'bes-command-dock';
    dock.setAttribute('aria-label', 'Thanh ứng dụng đã ghim');
    document.body.appendChild(dock);

    var overlay = document.createElement('div');
    overlay.id = 'bes-command-overlay';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Brian English Studio Command Center');
    overlay.innerHTML = '' +
      '<div class="bescc-shell">' +
        '<header class="bescc-header">' +
          '<label class="bescc-search-wrap" for="bes-command-search">' +
            '<span class="bescc-search-icon">⌕</span>' +
            '<input id="bes-command-search" type="search" autocomplete="off" placeholder="Tìm ứng dụng, trang hoặc công cụ…" />' +
            '<span class="bescc-kbd">ESC</span>' +
          '</label>' +
          '<button class="bescc-icon-button" type="button" data-bescc-action="close" aria-label="Đóng">×</button>' +
        '</header>' +
        '<div class="bescc-body">' +
          '<aside class="bescc-sidebar" aria-label="Chế độ Command Center">' +
            navButton('search', '⌕', 'Tìm kiếm') +
            navButton('favorites', '★', 'Đã ghim') +
            navButton('recent', '↻', 'Gần đây') +
            navButton('organize', '≡', 'Sắp xếp') +
            navButton('settings', '⚙', 'Cài đặt') +
            '<div class="bescc-side-footer">Brian English Studio<br>Launcher & Command Center · ' + VERSION + '</div>' +
          '</aside>' +
          '<main class="bescc-content" id="bes-command-content"></main>' +
        '</div>' +
      '</div>';
    overlay.addEventListener('mousedown', function (event) {
      if (event.target === overlay) closePalette();
    });
    overlay.addEventListener('click', handleOverlayClick);
    overlay.addEventListener('change', handleOverlayChange);
    overlay.addEventListener('dragstart', handleDragStart);
    overlay.addEventListener('dragover', handleDragOver);
    overlay.addEventListener('drop', handleDrop);
    overlay.addEventListener('dragend', handleDragEnd);
    document.body.appendChild(overlay);

    var input = document.getElementById('bes-command-search');
    input.addEventListener('input', function () {
      state.searchQuery = input.value;
      state.activeView = 'search';
      state.selectedIndex = 0;
      renderPalette();
    });

    renderDock();
    applyVisibilitySettings();
  }

  function navButton(view, icon, label) {
    return '<button class="bescc-nav-button" type="button" data-bescc-view="' + view + '" aria-selected="false">' +
      '<span>' + icon + '</span><span>' + label + '</span><span class="bescc-nav-count" data-bescc-count="' + view + '"></span></button>';
  }

  function applyVisibilitySettings() {
    var trigger = document.getElementById('bes-command-trigger');
    var dock = document.getElementById('bes-command-dock');
    if (trigger) trigger.hidden = !state.config.enabled || !state.config.triggerVisible;
    if (dock) dock.hidden = !state.config.enabled || !state.config.dockVisible;
  }

  function openPalette(view) {
    if (!state.config.enabled) return;
    var overlay = document.getElementById('bes-command-overlay');
    if (!overlay) return;
    state.open = true;
    state.activeView = view || state.activeView || 'search';
    state.searchQuery = state.activeView === 'search' ? state.searchQuery : '';
    mergeCatalog();
    overlay.hidden = false;
    document.documentElement.style.setProperty('--bes-command-center-open', '1');
    renderPalette();
    window.setTimeout(function () {
      var input = document.getElementById('bes-command-search');
      if (input) {
        input.value = state.searchQuery;
        input.focus();
        if (input.setSelectionRange) input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 0);
    try { window.dispatchEvent(new CustomEvent('bes-command-center-open', { detail: { version: VERSION } })); } catch (_) {}
  }

  function closePalette() {
    var overlay = document.getElementById('bes-command-overlay');
    if (!overlay) return;
    state.open = false;
    overlay.hidden = true;
    document.documentElement.style.removeProperty('--bes-command-center-open');
    saveConfig(false);
  }

  function togglePalette() {
    if (state.open) closePalette(); else openPalette('search');
  }

  function updateNavState() {
    var counts = {
      search: visibleCatalog().length,
      favorites: state.catalog.filter(function (item) { return getPref(item).pinned && !getPref(item).hidden; }).length,
      recent: state.config.recent.length,
      organize: state.catalog.length,
      settings: ''
    };
    document.querySelectorAll('[data-bescc-view]').forEach(function (button) {
      var active = button.getAttribute('data-bescc-view') === state.activeView;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    Object.keys(counts).forEach(function (key) {
      var node = document.querySelector('[data-bescc-count="' + key + '"]');
      if (node) node.textContent = counts[key] === '' ? '' : String(counts[key]);
    });
  }

  function scoreItem(item, query) {
    if (!query) return Number(state.config.usage[item.id] || 0) * 2 + (getPref(item).pinned ? 30 : 0);
    var q = normalizeText(query);
    var label = normalizeText(item.label);
    var route = normalizeText(item.route);
    var haystack = normalizeText([item.label, item.keywords, item.group, getPref(item).group, item.route].join(' '));
    var score = 0;
    if (label === q) score += 140;
    if (label.indexOf(q) === 0) score += 95;
    if (label.indexOf(q) >= 0) score += 70;
    if (route.indexOf(q) >= 0) score += 45;
    q.split(' ').forEach(function (token) {
      if (!token) return;
      if (haystack.indexOf(token) >= 0) score += 18;
    });
    if (getPref(item).pinned) score += 8;
    score += Math.min(12, Number(state.config.usage[item.id] || 0));
    return score;
  }

  function searchResults() {
    var query = state.searchQuery;
    var items = visibleCatalog().map(function (item) { return { item: item, score: scoreItem(item, query) }; });
    if (query) items = items.filter(function (entry) { return entry.score > 0; });
    items.sort(function (a, b) { return b.score - a.score || sortItems(a.item, b.item); });
    return items.map(function (entry) { return entry.item; }).slice(0, 40);
  }

  function cardHtml(item) {
    var pref = getPref(item);
    return '<article class="bescc-card" data-bescc-item="' + escapeHtml(item.id) + '">' +
      '<div class="bescc-card-icon">' + escapeHtml(item.icon || item.label.slice(0, 1)) + '</div>' +
      '<button class="bescc-card-main" type="button" data-bescc-open="' + escapeHtml(item.id) + '">' +
        '<span class="bescc-card-title">' + escapeHtml(item.label) + '</span>' +
        '<span class="bescc-card-meta">' + escapeHtml(pref.group || item.group) + ' · ' + escapeHtml(item.route) + '</span>' +
      '</button>' +
      '<div class="bescc-card-actions">' +
        '<button class="bescc-mini-button" type="button" data-bescc-pin="' + escapeHtml(item.id) + '" aria-pressed="' + (pref.pinned ? 'true' : 'false') + '" title="Ghim">★</button>' +
        '<button class="bescc-mini-button" type="button" data-bescc-hide="' + escapeHtml(item.id) + '" aria-pressed="' + (pref.hidden ? 'true' : 'false') + '" title="Ẩn">⊘</button>' +
      '</div>' +
    '</article>';
  }

  function sectionHeader(title, description, actionHtml) {
    return '<div class="bescc-section-head"><div><h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(description) + '</p></div>' + (actionHtml || '') + '</div>';
  }

  function renderSearch() {
    var results = searchResults();
    var title = state.searchQuery ? 'Kết quả tìm kiếm' : 'Mở nhanh';
    var description = state.searchQuery ? ('Tìm thấy ' + results.length + ' mục phù hợp.') : 'Tìm trên toàn bộ ứng dụng bằng tên, nhóm hoặc route.';
    if (!results.length) return sectionHeader(title, description) + '<div class="bescc-empty">Không tìm thấy mục phù hợp.<br>Hãy mở trang Ứng dụng một lần để Command Center học thêm các route hiện có.</div>';
    return sectionHeader(title, description) + '<div class="bescc-grid">' + results.map(cardHtml).join('') + '</div>';
  }

  function renderFavorites() {
    var items = state.catalog.filter(function (item) { return getPref(item).pinned && !getPref(item).hidden; }).sort(sortItems);
    if (!items.length) return sectionHeader('Ứng dụng đã ghim', 'Các mục được ghim sẽ xuất hiện trên thanh truy cập nhanh.') + '<div class="bescc-empty">Chưa có ứng dụng nào được ghim.</div>';
    return sectionHeader('Ứng dụng đã ghim', 'Kéo sắp xếp trong mục Sắp xếp để thay đổi thứ tự thanh truy cập nhanh.') + '<div class="bescc-grid">' + items.map(cardHtml).join('') + '</div>';
  }

  function renderRecent() {
    var items = state.config.recent.map(function (entry) {
      return state.catalog.find(function (item) { return item.id === entry.id || item.route === entry.route; }) || entry;
    }).filter(function (item) { return item && item.route && !getPref(item).hidden; });
    var action = '<button class="bescc-pill-button" type="button" data-bescc-action="clear-recent">Xóa lịch sử</button>';
    if (!items.length) return sectionHeader('Gần đây', 'Các trang vừa mở sẽ xuất hiện tại đây.', action) + '<div class="bescc-empty">Chưa có lịch sử điều hướng.</div>';
    return sectionHeader('Gần đây', 'Tiếp tục công việc mà không cần quay lại Launcher.', action) + '<div class="bescc-grid">' + items.map(cardHtml).join('') + '</div>';
  }

  function renderOrganize() {
    var groups = allGroups();
    var active = state.activeGroup;
    if (active !== 'all' && groups.indexOf(active) < 0) active = 'all';
    state.activeGroup = active;
    var items = state.catalog.filter(function (item) {
      return active === 'all' || getPref(item).group === active;
    }).sort(sortItems);
    var groupButtons = ['<button class="bescc-group-chip" type="button" data-bescc-group="all" aria-pressed="' + (active === 'all') + '">Tất cả</button>']
      .concat(groups.map(function (group) {
        return '<button class="bescc-group-chip" type="button" data-bescc-group="' + escapeHtml(group) + '" aria-pressed="' + (active === group) + '">' + escapeHtml(group) + '</button>';
      })).join('');
    var groupOptions = groups.map(function (group) { return '<option value="' + escapeHtml(group) + '">' + escapeHtml(group) + '</option>'; }).join('');
    var rows = items.map(function (item) {
      var pref = getPref(item);
      var options = groupOptions.replace('value="' + escapeHtml(pref.group) + '"', 'value="' + escapeHtml(pref.group) + '" selected');
      return '<div class="bescc-organize-row" draggable="true" data-bescc-drag-id="' + escapeHtml(item.id) + '">' +
        '<span class="bescc-drag-handle" aria-hidden="true">⋮⋮</span>' +
        '<span class="bescc-card-icon">' + escapeHtml(item.icon || item.label.slice(0, 1)) + '</span>' +
        '<span class="bescc-organize-label"><strong>' + escapeHtml(item.label) + '</strong><small>' + escapeHtml(item.route) + '</small></span>' +
        '<select class="bescc-select" data-bescc-set-group="' + escapeHtml(item.id) + '" aria-label="Nhóm của ' + escapeHtml(item.label) + '">' + options + '</select>' +
        '<button class="bescc-toggle-button" type="button" data-bescc-pin="' + escapeHtml(item.id) + '" aria-pressed="' + pref.pinned + '" title="Ghim">★</button>' +
        '<button class="bescc-toggle-button bescc-hidden-active" type="button" data-bescc-hide="' + escapeHtml(item.id) + '" aria-pressed="' + pref.hidden + '" title="Ẩn">⊘</button>' +
      '</div>';
    }).join('');
    return sectionHeader('Sắp xếp Launcher cá nhân', 'Kéo thả để đổi thứ tự; ghim tối đa ' + MAX_DOCK_ITEMS + ' mục trên thanh nhanh.') +
      '<div class="bescc-new-group"><input class="bescc-text-input" id="bescc-new-group-name" maxlength="40" placeholder="Tên nhóm mới…"><button class="bescc-primary-button" type="button" data-bescc-action="add-group">Tạo nhóm</button></div>' +
      '<div class="bescc-group-bar">' + groupButtons + '</div>' +
      '<div class="bescc-organize-list">' + rows + '</div>';
  }

  function renderSettings() {
    return sectionHeader('Cài đặt Command Center', 'Các thiết lập được lưu riêng theo tài khoản trên trình duyệt hiện tại.') +
      '<div class="bescc-settings-grid">' +
        settingCard('Thanh ứng dụng đã ghim', 'Hiển thị tối đa ' + MAX_DOCK_ITEMS + ' ứng dụng trên toàn bộ site.', '<button class="bescc-primary-button" type="button" data-bescc-action="toggle-dock">' + (state.config.dockVisible ? 'Đang bật' : 'Đang tắt') + '</button>') +
        settingCard('Nút Command Center', 'Nút nổi giúp mở nhanh bằng chuột; phím Ctrl/Cmd + K vẫn luôn hoạt động.', '<button class="bescc-primary-button" type="button" data-bescc-action="toggle-trigger">' + (state.config.triggerVisible ? 'Đang bật' : 'Đang tắt') + '</button>') +
        settingCard('Sao lưu cấu hình', 'Xuất hoặc nhập bố cục ghim, nhóm, thứ tự và lịch sử gần đây.', '<button class="bescc-pill-button" type="button" data-bescc-action="export">Xuất JSON</button><button class="bescc-pill-button" type="button" data-bescc-action="import">Nhập JSON</button><input id="bescc-import-file" type="file" accept="application/json,.json" hidden>') +
        settingCard('Khám phá lại ứng dụng', 'Quét các route đang xuất hiện trên trang hiện tại và bổ sung vào Command Center.', '<button class="bescc-pill-button" type="button" data-bescc-action="rediscover">Quét lại</button>') +
        settingCard('Khôi phục mặc định', 'Chỉ đặt lại cấu hình Command Center V10.87; không xóa dữ liệu Launcher V4, Supabase hoặc học liệu.', '<button class="bescc-danger-button" type="button" data-bescc-action="reset">Khôi phục</button>') +
      '</div>';
  }

  function settingCard(title, description, actions) {
    return '<section class="bescc-setting-card"><h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(description) + '</p><div class="bescc-setting-actions">' + actions + '</div></section>';
  }

  function renderPalette() {
    if (!state.open) return;
    updateNavState();
    var content = document.getElementById('bes-command-content');
    if (!content) return;
    var html = '';
    if (state.activeView === 'favorites') html = renderFavorites();
    else if (state.activeView === 'recent') html = renderRecent();
    else if (state.activeView === 'organize') html = renderOrganize();
    else if (state.activeView === 'settings') html = renderSettings();
    else html = renderSearch();
    content.innerHTML = html;
    var input = document.getElementById('bes-command-search');
    if (input && input.value !== state.searchQuery) input.value = state.searchQuery;
    saveConfig(false);
  }

  function renderDock() {
    var dock = document.getElementById('bes-command-dock');
    if (!dock || !state.config) return;
    applyVisibilitySettings();
    var items = state.catalog.filter(function (item) {
      var pref = getPref(item);
      return pref.pinned && !pref.hidden;
    }).sort(sortItems).slice(0, MAX_DOCK_ITEMS);
    var route = currentRoute();
    dock.innerHTML = items.map(function (item) {
      return '<button class="bescc-dock-item" type="button" data-bescc-dock-open="' + escapeHtml(item.id) + '" aria-current="' + (item.route === route ? 'page' : 'false') + '" title="' + escapeHtml(item.label) + '">' +
        '<span class="bescc-dock-symbol">' + escapeHtml(item.icon || item.label.slice(0, 1)) + '</span><span class="bescc-dock-label">' + escapeHtml(item.label) + '</span></button>';
    }).join('') + '<button class="bescc-dock-more" type="button" data-bescc-dock-more="true"><span class="bescc-dock-symbol">⌘</span><span class="bescc-dock-label">Thêm</span></button>';
    dock.onclick = function (event) {
      var open = event.target.closest('[data-bescc-dock-open]');
      if (open) {
        var item = state.catalog.find(function (entry) { return entry.id === open.getAttribute('data-bescc-dock-open'); });
        if (item) navigate(item);
        return;
      }
      if (event.target.closest('[data-bescc-dock-more]')) openPalette('search');
    };
  }

  function handleOverlayClick(event) {
    var close = event.target.closest('[data-bescc-action="close"]');
    if (close) { closePalette(); return; }
    var view = event.target.closest('[data-bescc-view]');
    if (view) {
      state.activeView = view.getAttribute('data-bescc-view');
      state.searchQuery = state.activeView === 'search' ? state.searchQuery : '';
      renderPalette();
      return;
    }
    var open = event.target.closest('[data-bescc-open]');
    if (open) {
      var item = state.catalog.find(function (entry) { return entry.id === open.getAttribute('data-bescc-open'); });
      if (item) navigate(item);
      return;
    }
    var pin = event.target.closest('[data-bescc-pin]');
    if (pin) {
      togglePin(pin.getAttribute('data-bescc-pin'));
      return;
    }
    var hide = event.target.closest('[data-bescc-hide]');
    if (hide) {
      toggleHidden(hide.getAttribute('data-bescc-hide'));
      return;
    }
    var group = event.target.closest('[data-bescc-group]');
    if (group) {
      state.activeGroup = group.getAttribute('data-bescc-group');
      renderPalette();
      return;
    }
    var action = event.target.closest('[data-bescc-action]');
    if (action) handleAction(action.getAttribute('data-bescc-action'));
  }

  function handleOverlayChange(event) {
    var select = event.target.closest('[data-bescc-set-group]');
    if (select) {
      var item = state.catalog.find(function (entry) { return entry.id === select.getAttribute('data-bescc-set-group'); });
      if (item) {
        getPref(item).group = select.value;
        if (state.config.customGroups.indexOf(select.value) < 0 && STATIC_CATALOG.every(function (entry) { return entry.group !== select.value; })) {
          state.config.customGroups.push(select.value);
        }
        saveConfig(false);
        renderPalette();
      }
      return;
    }
    if (event.target.id === 'bescc-import-file' && event.target.files && event.target.files[0]) importConfigFile(event.target.files[0]);
  }

  function togglePin(id) {
    var item = state.catalog.find(function (entry) { return entry.id === id; });
    if (!item) return;
    var pref = getPref(item);
    pref.pinned = !pref.pinned;
    if (pref.pinned) {
      var maxOrder = state.catalog.reduce(function (max, entry) {
        var p = getPref(entry);
        return p.pinned ? Math.max(max, Number(p.order || 0)) : max;
      }, 0);
      if (Number(pref.order) >= 9999) pref.order = maxOrder + 1;
    }
    saveConfig(false);
    renderDock();
    renderPalette();
  }

  function toggleHidden(id) {
    var item = state.catalog.find(function (entry) { return entry.id === id; });
    if (!item || item.id === 'home' || item.id === 'apps') {
      toast('Trang chủ và Ứng dụng luôn được giữ lại.');
      return;
    }
    var pref = getPref(item);
    pref.hidden = !pref.hidden;
    if (pref.hidden) pref.pinned = false;
    saveConfig(false);
    renderDock();
    renderPalette();
  }

  function handleAction(action) {
    if (action === 'clear-recent') {
      state.config.recent = [];
      saveConfig(true);
      renderPalette();
      toast('Đã xóa lịch sử gần đây.');
    } else if (action === 'add-group') {
      var input = document.getElementById('bescc-new-group-name');
      var name = cleanLabel(input && input.value);
      if (!name) { toast('Hãy nhập tên nhóm.'); return; }
      if (allGroups().indexOf(name) >= 0) { toast('Nhóm này đã tồn tại.'); return; }
      state.config.customGroups.push(name);
      state.activeGroup = name;
      saveConfig(true);
      renderPalette();
      toast('Đã tạo nhóm “' + name + '”.');
    } else if (action === 'toggle-dock') {
      state.config.dockVisible = !state.config.dockVisible;
      saveConfig(true);
      applyVisibilitySettings();
      renderPalette();
    } else if (action === 'toggle-trigger') {
      state.config.triggerVisible = !state.config.triggerVisible;
      saveConfig(true);
      applyVisibilitySettings();
      renderPalette();
      if (!state.config.triggerVisible) toast('Nút nổi đã ẩn. Dùng Ctrl/Cmd + K để mở lại.');
    } else if (action === 'export') {
      exportConfig();
    } else if (action === 'import') {
      var file = document.getElementById('bescc-import-file');
      if (file) file.click();
    } else if (action === 'rediscover') {
      mergeCatalog();
      renderDock();
      renderPalette();
      toast('Đã quét lại các route trên trang hiện tại.');
    } else if (action === 'reset') {
      var accepted = window.confirm('Khôi phục Command Center V10.87 về mặc định? Dữ liệu Launcher V4 và Supabase không bị xóa.');
      if (!accepted) return;
      state.config = defaultConfig();
      state.activeView = 'search';
      state.activeGroup = 'all';
      saveConfig(true);
      renderDock();
      applyVisibilitySettings();
      renderPalette();
      toast('Đã khôi phục Command Center mặc định.');
    }
  }

  function exportConfig() {
    var payload = {
      product: 'Brian English Studio',
      feature: 'Launcher Command Center',
      version: VERSION,
      exportedAt: new Date().toISOString(),
      config: state.config
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'brian-command-center-' + state.accountKey + '-' + Date.now() + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importConfigFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = safeParse(String(reader.result || ''), null);
      var imported = parsed && parsed.config ? parsed.config : parsed;
      if (!imported || typeof imported !== 'object') { toast('Tệp cấu hình không hợp lệ.'); return; }
      state.config = normalizeConfig(imported);
      state.activeView = 'settings';
      state.activeGroup = state.config.lastGroup || 'all';
      saveConfig(true);
      renderDock();
      applyVisibilitySettings();
      renderPalette();
      toast('Đã nhập cấu hình Command Center.');
    };
    reader.onerror = function () { toast('Không thể đọc tệp cấu hình.'); };
    reader.readAsText(file);
  }

  var draggedId = '';

  function handleDragStart(event) {
    var row = event.target.closest('[data-bescc-drag-id]');
    if (!row) return;
    draggedId = row.getAttribute('data-bescc-drag-id');
    row.classList.add('bescc-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedId);
    }
  }

  function handleDragOver(event) {
    if (!draggedId) return;
    var row = event.target.closest('[data-bescc-drag-id]');
    if (!row || row.getAttribute('data-bescc-drag-id') === draggedId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(event) {
    var targetRow = event.target.closest('[data-bescc-drag-id]');
    if (!draggedId || !targetRow) return;
    event.preventDefault();
    var targetId = targetRow.getAttribute('data-bescc-drag-id');
    if (!targetId || targetId === draggedId) return;
    var list = state.catalog.filter(function (item) {
      return state.activeGroup === 'all' || getPref(item).group === state.activeGroup;
    }).sort(sortItems);
    var ids = list.map(function (item) { return item.id; });
    var from = ids.indexOf(draggedId);
    var to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    ids.forEach(function (id, index) {
      var item = state.catalog.find(function (entry) { return entry.id === id; });
      if (item) getPref(item).order = index;
    });
    saveConfig(true);
    renderDock();
    renderPalette();
  }

  function handleDragEnd() {
    draggedId = '';
    document.querySelectorAll('.bescc-dragging').forEach(function (node) { node.classList.remove('bescc-dragging'); });
  }

  function handleGlobalKeydown(event) {
    var target = event.target;
    var tag = target && target.tagName ? target.tagName.toLowerCase() : '';
    var editable = target && (target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select');
    if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'k') {
      event.preventDefault();
      togglePalette();
      return;
    }
    if (!state.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
      return;
    }
    if (event.key === 'Enter' && state.activeView === 'search' && !editable) {
      var result = searchResults()[state.selectedIndex] || searchResults()[0];
      if (result) navigate(result);
    }
  }

  function installObservers() {
    window.addEventListener('hashchange', function () {
      window.setTimeout(function () {
        mergeCatalog();
        recordVisit(currentRoute());
        renderDock();
      }, 50);
    });
    window.addEventListener('popstate', function () { recordVisit(currentRoute()); });
    window.addEventListener('storage', function (event) {
      if (event.key === state.storageKey && event.newValue) {
        state.config = normalizeConfig(safeParse(event.newValue, null));
        renderDock();
        applyVisibilitySettings();
        if (state.open) renderPalette();
      }
    });
    if ('BroadcastChannel' in window) {
      try {
        state.channel = new BroadcastChannel(CHANNEL_NAME);
        state.channel.onmessage = function (event) {
          var data = event.data || {};
          if (data.type === 'config' && data.accountKey === state.accountKey && data.config) {
            state.config = normalizeConfig(data.config);
            renderDock();
            applyVisibilitySettings();
            if (state.open) renderPalette();
          }
        };
      } catch (_) {}
    }
    if ('MutationObserver' in window) {
      state.observer = new MutationObserver(function (mutations) {
        var selector = 'a[href*="#/"], [data-route], [data-href*="#/"]';
        var relevant = mutations.some(function (mutation) {
          return Array.prototype.some.call(mutation.addedNodes || [], function (node) {
            if (!node || node.nodeType !== 1) return false;
            if (node.matches && node.matches(selector)) return true;
            return Boolean(node.querySelector && node.querySelector(selector));
          });
        });
        if (!relevant) return;
        if (state.discoveryTimer) window.clearTimeout(state.discoveryTimer);
        state.discoveryTimer = window.setTimeout(function () {
          state.discoveryTimer = null;
          mergeCatalog();
          renderDock();
        }, 450);
      });
      state.observer.observe(document.body, { childList: true, subtree: true });
    }
    document.addEventListener('keydown', handleGlobalKeydown, true);
  }

  function diagnosticReport() {
    return {
      version: VERSION,
      accountKey: state.accountKey,
      role: detectRole(),
      route: currentRoute(),
      catalogSize: state.catalog.length,
      pinned: state.catalog.filter(function (item) { return getPref(item).pinned; }).map(function (item) { return item.route; }),
      hiddenCount: state.catalog.filter(function (item) { return getPref(item).hidden; }).length,
      recentCount: state.config.recent.length,
      customGroups: state.config.customGroups.slice(),
      dockVisible: state.config.dockVisible,
      triggerVisible: state.config.triggerVisible,
      storageKey: state.storageKey,
      generatedAt: new Date().toISOString()
    };
  }

  function addRoute(input) {
    if (!input || typeof input !== 'object') return false;
    var route = normalizeRoute(input.route);
    var label = cleanLabel(input.label);
    if (!route || !label) return false;
    var item = {
      id: input.id || routeToId(route),
      label: label,
      route: route,
      group: cleanLabel(input.group) || 'Khác',
      icon: cleanLabel(input.icon) || label.slice(0, 1).toUpperCase(),
      keywords: cleanLabel(input.keywords) || label + ' ' + route,
      discovered: true
    };
    var existing = state.catalog.findIndex(function (entry) { return entry.route === route; });
    if (existing >= 0) state.catalog[existing] = item; else state.catalog.push(item);
    safeSet(CATALOG_KEY, JSON.stringify(state.catalog.filter(function (entry) { return entry.discovered; }).slice(-MAX_DISCOVERED)));
    renderDock();
    if (state.open) renderPalette();
    return true;
  }

  function init() {
    if (window.BES_COMMAND_CENTER && window.BES_COMMAND_CENTER.version === VERSION) return;
    loadConfig();
    mergeCatalog();
    createShell();
    installObservers();
    recordVisit(currentRoute());
    window.BES_COMMAND_CENTER = {
      version: VERSION,
      open: openPalette,
      close: closePalette,
      toggle: togglePalette,
      report: diagnosticReport,
      exportConfig: exportConfig,
      reset: function () {
        state.config = defaultConfig();
        saveConfig(true);
        renderDock();
        applyVisibilitySettings();
        if (state.open) renderPalette();
      },
      addRoute: addRoute,
      rediscover: function () { mergeCatalog(); renderDock(); if (state.open) renderPalette(); return state.catalog.length; }
    };
    try { window.dispatchEvent(new CustomEvent('bes-command-center-ready', { detail: diagnosticReport() })); } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
