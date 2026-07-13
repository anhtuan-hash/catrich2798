(function bootstrapBESPlatformControl() {
  'use strict';

  var VERSION = '10.89.0';
  var STORAGE_KEY = 'bes-platform-control-v10890';
  var DISABLED_KEY = 'bes-platform-disabled-modules-v10890';
  var MANIFESTS = {
    release: '/bes-release-v10.89.0.json',
    modules: '/bes-modules-v10.88.0.json',
    flags: '/bes-feature-flags-v10.88.0.json',
    migrations: '/bes-migrations-v10.89.0.json',
    build: '/bes-platform-build-v10.89.0.json',
    version: '/version.json'
  };
  var CHANNEL_ORDER = { stable: 0, beta: 1, lab: 2 };
  var state = {
    open: false,
    activeTab: 'overview',
    role: 'teacher',
    manifests: {},
    channel: 'stable',
    overrides: {},
    disabledModules: {},
    search: '',
    checks: [],
    loading: true,
    lastRoute: '#/'
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function detectRole() {
    var values = [];
    try {
      values.push(document.documentElement.getAttribute('data-role'));
      values.push(document.body && document.body.getAttribute('data-role'));
      values.push(safeGet('bes-role'));
      values.push(safeGet('bes-user-role'));
      for (var i = 0; i < window.localStorage.length; i += 1) {
        var key = window.localStorage.key(i);
        if (!key || !/(profile|current.?user|account|role|auth|session)/i.test(key)) continue;
        var raw = window.localStorage.getItem(key);
        if (raw && raw.length < 180000) values.push(raw);
      }
    } catch (_) {}
    var combined = normalizeText(values.filter(Boolean).join(' '));
    if (/\badmin\b/.test(combined)) return 'admin';
    if (/\bttcm\b|to truong|tổ trưởng|department head|head of english/.test(combined)) return 'ttcm';
    return 'teacher';
  }

  function canManage() {
    return state.role === 'admin' || state.role === 'ttcm';
  }

  function loadPrefs() {
    var prefs = safeParse(safeGet(STORAGE_KEY), {}) || {};
    state.channel = ['stable', 'beta', 'lab'].indexOf(prefs.channel) >= 0 ? prefs.channel : 'stable';
    state.overrides = prefs.overrides && typeof prefs.overrides === 'object' ? prefs.overrides : {};
    state.disabledModules = safeParse(safeGet(DISABLED_KEY), {}) || {};
  }

  function savePrefs() {
    safeSet(STORAGE_KEY, JSON.stringify({
      version: VERSION,
      channel: state.channel,
      overrides: state.overrides,
      updatedAt: new Date().toISOString()
    }));
    safeSet(DISABLED_KEY, JSON.stringify(state.disabledModules));
  }

  function fetchJson(url) {
    return window.fetch(url, { cache: 'no-store', credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
        return response.json();
      });
  }

  function loadManifests() {
    var entries = Object.keys(MANIFESTS);
    return Promise.all(entries.map(function (key) {
      return fetchJson(MANIFESTS[key])
        .then(function (value) { state.manifests[key] = value; })
        .catch(function (error) { state.manifests[key] = { error: String(error && error.message || error) }; });
    })).then(function () {
      state.loading = false;
      runDiagnostics();
      render();
    });
  }

  function manifestOk(name) {
    var value = state.manifests[name];
    return !!value && !value.error;
  }

  function getModules() {
    var list = state.manifests.modules && Array.isArray(state.manifests.modules.modules)
      ? state.manifests.modules.modules.slice()
      : [];
    var seen = {};
    list.forEach(function (item) { seen[item.route] = true; });
    try {
      document.querySelectorAll('a[href^="#/"], [data-route^="#/"], [data-href^="#/"]').forEach(function (node) {
        var route = node.getAttribute('href') || node.getAttribute('data-route') || node.getAttribute('data-href');
        var title = (node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || '').replace(/\s+/g, ' ').trim();
        if (!route || !title || seen[route] || title.length > 90) return;
        seen[route] = true;
        list.push({
          id: 'runtime-' + route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, ''),
          title: title,
          route: route,
          category: 'Phát hiện runtime',
          roles: ['admin', 'ttcm', 'teacher'],
          status: 'discovered',
          version: 'runtime',
          dependencies: []
        });
      });
    } catch (_) {}
    return list;
  }

  function getFlags() {
    return state.manifests.flags && Array.isArray(state.manifests.flags.flags)
      ? state.manifests.flags.flags
      : [];
  }

  function flagEnabled(key) {
    var flag = getFlags().find(function (item) { return item.key === key; });
    if (!flag) return false;
    if (Object.prototype.hasOwnProperty.call(state.overrides, key)) return !!state.overrides[key];
    var channelAllows = CHANNEL_ORDER[state.channel] >= CHANNEL_ORDER[flag.minimumChannel || 'stable'];
    return channelAllows && flag.default !== false;
  }

  function isModuleDisabled(module) {
    if (!module || !module.id) return false;
    return !!state.disabledModules[module.id];
  }

  function moduleForRoute(route) {
    return getModules().find(function (item) { return item.route === route; }) || null;
  }

  function normalizeRoute(value) {
    var route = String(value || '');
    if (/^https?:/i.test(route)) {
      try {
        var url = new URL(route, window.location.href);
        if (url.origin !== window.location.origin) return '';
        route = url.hash || '#/';
      } catch (_) { return ''; }
    }
    if (route.indexOf('#/') !== 0) return '';
    return route.split('?')[0].replace(/\/$/, '') || '#/';
  }

  function toast(message, tone) {
    var stack = document.querySelector('.bespc-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'bespc-toast-stack';
      document.body.appendChild(stack);
    }
    var node = document.createElement('div');
    node.className = 'bespc-toast';
    if (tone) node.setAttribute('data-tone', tone);
    node.textContent = message;
    stack.appendChild(node);
    window.setTimeout(function () { if (node.parentNode) node.remove(); }, 3800);
  }

  function runDiagnostics() {
    var checks = [];
    function add(id, title, status, detail) {
      checks.push({ id: id, title: title, status: status, detail: detail });
    }
    add('root', 'Application root', document.querySelector('#root') ? 'pass' : 'warn', document.querySelector('#root') ? '#root đã sẵn sàng.' : 'Không tìm thấy #root; ứng dụng có thể dùng root khác.');
    Object.keys(MANIFESTS).forEach(function (key) {
      add('manifest-' + key, 'Manifest: ' + key, manifestOk(key) ? 'pass' : 'fail', manifestOk(key) ? 'Tải thành công ' + MANIFESTS[key] : 'Không tải được ' + MANIFESTS[key]);
    });
    var duplicateCss = document.querySelectorAll('link[href*="bes-platform-control-v10880.css"]').length;
    var duplicateJs = document.querySelectorAll('script[src*="bes-platform-control-v10880.js"]').length;
    add('asset-tags', 'Platform asset tags', duplicateCss === 1 && duplicateJs === 1 ? 'pass' : 'warn', 'CSS: ' + duplicateCss + ' · JS: ' + duplicateJs);
    add('storage', 'Local storage', safeSet('__bespc_probe__', '1') ? 'pass' : 'warn', 'Kênh phát hành và override được lưu cục bộ.');
    try { window.localStorage.removeItem('__bespc_probe__'); } catch (_) {}
    add('network', 'Network state', navigator.onLine ? 'pass' : 'warn', navigator.onLine ? 'Trình duyệt đang online.' : 'Trình duyệt đang offline.');
    var modules = getModules();
    var duplicateRoutes = {};
    modules.forEach(function (item) { duplicateRoutes[item.route] = (duplicateRoutes[item.route] || 0) + 1; });
    var duplicates = Object.keys(duplicateRoutes).filter(function (route) { return duplicateRoutes[route] > 1; });
    add('module-routes', 'Module routes', duplicates.length ? 'warn' : 'pass', duplicates.length ? ('Route trùng: ' + duplicates.join(', ')) : (modules.length + ' module, không phát hiện route trùng.'));
    var disabledCount = modules.filter(isModuleDisabled).length;
    add('disabled-modules', 'Module kill switch', disabledCount ? 'warn' : 'pass', disabledCount + ' module đang bị tắt ở trình duyệt này.');
    var currentVersion = state.manifests.version && state.manifests.version.version;
    var buildVersion = state.manifests.build && state.manifests.build.version;
    var releaseVersion = state.manifests.release && state.manifests.release.version;
    var versions = [currentVersion, buildVersion, releaseVersion].filter(Boolean);
    add('version-sync', 'Version consistency', versions.length && versions.every(function (item) { return item === VERSION; }) ? 'pass' : 'warn', 'version.json: ' + (currentVersion || 'n/a') + ' · build: ' + (buildVersion || 'n/a') + ' · release: ' + (releaseVersion || 'n/a'));
    state.checks = checks;
    return checks;
  }

  function statusTone(status) {
    return status === 'pass' || status === 'stable' ? 'good' : status === 'fail' || status === 'disabled' ? 'bad' : status === 'beta' || status === 'lab' || status === 'warn' ? 'warn' : 'info';
  }

  function overviewHtml() {
    var version = state.manifests.version || {};
    var build = state.manifests.build || {};
    var migrations = state.manifests.migrations || {};
    var modules = getModules();
    var pass = state.checks.filter(function (item) { return item.status === 'pass'; }).length;
    var issues = state.checks.length - pass;
    return '' +
      '<div class="bespc-page-head"><div><h2 class="bespc-page-title">Tổng quan nền tảng</h2><p class="bespc-page-description">Một nguồn kiểm soát phiên bản, module, feature flag và trạng thái phát hành cho toàn Brian English Studio.</p></div>' +
      '<div class="bespc-toolbar"><button class="bespc-button" data-action="refresh">Làm mới</button><button class="bespc-button" data-variant="primary" data-action="export">Xuất báo cáo</button></div></div>' +
      '<div class="bespc-grid" data-cols="4">' +
        stat('Phiên bản ứng dụng', version.version || VERSION, 'Kênh ' + state.channel, 'info') +
        stat('Module đã đăng ký', modules.length, modules.filter(isModuleDisabled).length + ' đang tắt', modules.filter(isModuleDisabled).length ? 'warn' : 'good') +
        stat('Migration inventory', migrations.count || 0, migrations.latest ? ('Mới nhất: ' + migrations.latest) : 'Chưa có migration được lập chỉ mục', migrations.count ? 'good' : 'warn') +
        stat('Pre-deploy checks', pass + '/' + state.checks.length, issues ? (issues + ' cảnh báo/lỗi') : 'Sẵn sàng phát hành', issues ? 'warn' : 'good') +
      '</div>' +
      '<div class="bespc-section"><div class="bespc-section-head"><h3 class="bespc-section-title">Version Registry</h3><span class="bespc-section-note">Đọc trực tiếp từ manifest đã cài</span></div>' +
      '<div class="bespc-grid" data-cols="2">' +
        card('Thông tin build', keyRows([
          ['Application', version.version || VERSION],
          ['Release', (state.manifests.release && state.manifests.release.releaseName) || 'Platform Control Center'],
          ['Previous version', build.previousVersion || version.previousVersion || 'Không xác định'],
          ['Git commit', build.gitCommit || 'Chưa ghi nhận'],
          ['Git branch', build.gitBranch || 'Chưa ghi nhận'],
          ['Installed at', build.installedAt || version.installedAt || 'Chưa ghi nhận']
        ])) +
        card('Trạng thái tương thích', keyRows([
          ['Runtime role', state.role],
          ['Release channel', state.channel],
          ['Node during install', build.nodeVersion || 'Chưa ghi nhận'],
          ['SQL mới', state.manifests.release && state.manifests.release.requiresSql ? 'Có' : 'Không'],
          ['Environment Variable mới', state.manifests.release && state.manifests.release.requiresEnv ? 'Có' : 'Không'],
          ['Dependency mới', state.manifests.release && state.manifests.release.requiresDependencyInstall ? 'Có' : 'Không']
        ])) +
      '</div></div>';
  }

  function modulesHtml() {
    var modules = getModules();
    var query = normalizeText(state.search);
    if (query) modules = modules.filter(function (item) {
      return normalizeText([item.title, item.route, item.category, item.status, (item.roles || []).join(' ')].join(' ')).indexOf(query) >= 0;
    });
    return '' +
      '<div class="bespc-page-head"><div><h2 class="bespc-page-title">Module Registry</h2><p class="bespc-page-description">Theo dõi route, vai trò, trạng thái và tắt khẩn cấp module ở lớp runtime. Thao tác này không xóa dữ liệu.</p></div>' +
      '<div class="bespc-toolbar"><button class="bespc-button" data-action="enable-all">Bật tất cả</button></div></div>' +
      '<div class="bespc-search-row"><input class="bespc-search" data-action="module-search" value="' + esc(state.search) + '" placeholder="Tìm module, route, nhóm hoặc trạng thái..."></div>' +
      '<div class="bespc-table-wrap"><table class="bespc-table"><thead><tr><th>Module</th><th>Nhóm</th><th>Trạng thái</th><th>Vai trò</th><th>Phụ thuộc</th><th>Kích hoạt</th></tr></thead><tbody>' +
      modules.map(function (item) {
        var disabled = isModuleDisabled(item);
        return '<tr><td><div class="bespc-module-title">' + esc(item.title) + '</div><div class="bespc-module-route">' + esc(item.route) + '</div></td>' +
          '<td>' + esc(item.category || 'Khác') + '</td>' +
          '<td><span class="bespc-badge" data-tone="' + statusTone(disabled ? 'disabled' : item.status) + '">' + esc(disabled ? 'disabled' : (item.status || 'stable')) + '</span></td>' +
          '<td>' + esc((item.roles || []).join(', ')) + '</td>' +
          '<td>' + esc((item.dependencies || []).join(', ') || '—') + '</td>' +
          '<td><button class="bespc-toggle" data-action="toggle-module" data-module-id="' + esc(item.id) + '" data-on="' + (!disabled) + '" ' + (!canManage() || item.id === 'platform-control' ? 'disabled' : '') + ' aria-label="Bật hoặc tắt ' + esc(item.title) + '"></button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function flagsHtml() {
    var flags = getFlags();
    return '' +
      '<div class="bespc-page-head"><div><h2 class="bespc-page-title">Release Channels & Feature Flags</h2><p class="bespc-page-description">Stable dành cho sử dụng hằng ngày; Beta dành cho Admin/TTCM thử trước; Lab dành cho tính năng nghiên cứu.</p></div>' +
      '<div class="bespc-toolbar"><select class="bespc-select" data-action="channel" ' + (!canManage() ? 'disabled' : '') + '>' +
        ['stable','beta','lab'].map(function (channel) { return '<option value="' + channel + '" ' + (state.channel === channel ? 'selected' : '') + '>' + channel.toUpperCase() + '</option>'; }).join('') +
      '</select><button class="bespc-button" data-action="reset-flags" ' + (!canManage() ? 'disabled' : '') + '>Xóa override</button></div></div>' +
      '<div class="bespc-grid" data-cols="2">' + flags.map(function (flag) {
        var enabled = flagEnabled(flag.key);
        var overridden = Object.prototype.hasOwnProperty.call(state.overrides, flag.key);
        return '<div class="bespc-card"><div class="bespc-section-head"><div><h3 class="bespc-card-title">' + esc(flag.label) + '</h3><span class="bespc-badge" data-tone="' + statusTone(flag.minimumChannel) + '">' + esc(flag.minimumChannel) + '</span></div>' +
          '<button class="bespc-toggle" data-action="toggle-flag" data-flag-key="' + esc(flag.key) + '" data-on="' + enabled + '" ' + (!canManage() ? 'disabled' : '') + ' aria-label="Bật hoặc tắt ' + esc(flag.label) + '"></button></div>' +
          '<p class="bespc-card-copy">' + esc(flag.description) + '</p>' +
          '<div style="margin-top:12px"><span class="bespc-badge" data-tone="' + (enabled ? 'good' : 'info') + '">' + (enabled ? 'Đang bật' : 'Đang tắt') + '</span> ' +
          (overridden ? '<span class="bespc-badge" data-tone="warn">Override cục bộ</span>' : '<span class="bespc-badge">Theo kênh phát hành</span>') + '</div></div>';
      }).join('') + '</div>';
  }

  function releasesHtml() {
    var release = state.manifests.release || {};
    var build = state.manifests.build || {};
    var version = state.manifests.version || {};
    var features = Array.isArray(release.features) ? release.features : [];
    return '' +
      '<div class="bespc-page-head"><div><h2 class="bespc-page-title">Release Center</h2><p class="bespc-page-description">Xác nhận bản đang chạy và điều kiện phát hành. Việc deploy/rollback thực tế vẫn được thực hiện bằng Git và Vercel.</p></div>' +
      '<div class="bespc-toolbar"><button class="bespc-button" data-action="copy-commands">Sao chép lệnh kiểm tra</button></div></div>' +
      '<div class="bespc-grid" data-cols="3">' +
        stat('Current release', release.version || VERSION, release.releaseName || 'Platform Control Center', 'info') +
        stat('Base detected', build.previousVersion || version.previousVersion || 'unknown', 'Được installer ghi nhận', 'good') +
        stat('Channel', state.channel.toUpperCase(), state.channel === 'stable' ? 'Dành cho toàn hệ thống' : 'Chỉ nên dùng thử nghiệm', state.channel === 'stable' ? 'good' : 'warn') +
      '</div>' +
      '<div class="bespc-section"><div class="bespc-grid" data-cols="2">' +
        card('Điều kiện phát hành', keyRows([
          ['Minimum supported', release.minimumSupportedVersion || '10.86.1'],
          ['Maximum supported', release.maximumSupportedVersion || '10.87.3'],
          ['SQL required', release.requiresSql ? 'Yes' : 'No'],
          ['Environment required', release.requiresEnv ? 'Yes' : 'No'],
          ['Dependency install', release.requiresDependencyInstall ? 'Yes' : 'No']
        ])) +
        card('Tính năng trong bản này', '<div class="bespc-check-list">' + features.map(function (feature) { return '<div class="bespc-check" data-status="pass"><div class="bespc-check-icon">✓</div><div><div class="bespc-check-title">' + esc(feature) + '</div><div class="bespc-check-detail">Được đăng ký trong release manifest.</div></div></div>'; }).join('') + '</div>') +
      '</div></div>';
  }

  function diagnosticsHtml() {
    return '' +
      '<div class="bespc-page-head"><div><h2 class="bespc-page-title">Runtime Diagnostics</h2><p class="bespc-page-description">Kiểm tra nhanh manifest, asset, module, storage, mạng và tính nhất quán phiên bản ngay trong trình duyệt.</p></div>' +
      '<div class="bespc-toolbar"><button class="bespc-button" data-action="rerun">Chạy lại</button><button class="bespc-button" data-variant="primary" data-action="export">Xuất JSON</button></div></div>' +
      '<div class="bespc-check-list">' + state.checks.map(function (item) {
        return '<div class="bespc-check" data-status="' + esc(item.status) + '"><div class="bespc-check-icon">' + (item.status === 'pass' ? '✓' : item.status === 'fail' ? '!' : '•') + '</div><div><div class="bespc-check-title">' + esc(item.title) + '</div><div class="bespc-check-detail">' + esc(item.detail) + '</div></div><span class="bespc-badge" data-tone="' + statusTone(item.status) + '">' + esc(item.status) + '</span></div>';
      }).join('') + '</div>';
  }

  function stat(label, value, note, tone) {
    return '<div class="bespc-stat" data-tone="' + esc(tone || 'info') + '"><div class="bespc-stat-label">' + esc(label) + '</div><div class="bespc-stat-value">' + esc(value) + '</div><div class="bespc-stat-note">' + esc(note) + '</div></div>';
  }

  function card(title, content) {
    return '<div class="bespc-card"><h3 class="bespc-card-title">' + esc(title) + '</h3>' + content + '</div>';
  }

  function keyRows(rows) {
    return '<div class="bespc-key-value">' + rows.map(function (row) { return '<div class="bespc-key-row"><div class="bespc-key">' + esc(row[0]) + '</div><div class="bespc-value">' + esc(row[1]) + '</div></div>'; }).join('') + '</div>';
  }

  function pageHtml() {
    if (state.loading) return '<div class="bespc-empty"><strong>Đang tải Platform Registry...</strong>Đang đọc manifest và kiểm tra runtime.</div>';
    if (state.activeTab === 'modules') return modulesHtml();
    if (state.activeTab === 'flags') return flagsHtml();
    if (state.activeTab === 'releases') return releasesHtml();
    if (state.activeTab === 'diagnostics') return diagnosticsHtml();
    return overviewHtml();
  }

  function tabs() {
    var modules = getModules();
    return [
      { id: 'overview', icon: '◫', label: 'Tổng quan', count: VERSION },
      { id: 'modules', icon: '▦', label: 'Modules', count: modules.length },
      { id: 'flags', icon: '⚑', label: 'Flags', count: getFlags().filter(function (flag) { return flagEnabled(flag.key); }).length },
      { id: 'releases', icon: '⇪', label: 'Phát hành', count: state.channel },
      { id: 'diagnostics', icon: '✓', label: 'Chẩn đoán', count: state.checks.filter(function (item) { return item.status !== 'pass'; }).length }
    ];
  }

  function shellHtml() {
    return '<div class="bespc-backdrop" data-action="close"></div><section class="bespc-shell" role="dialog" aria-modal="true" aria-label="Platform Control Center">' +
      '<header class="bespc-header"><div class="bespc-brand"><div class="bespc-brand-mark">PC</div><div class="bespc-brand-copy"><h1 class="bespc-brand-title">Platform Control Center</h1><div class="bespc-brand-subtitle">Brian English Studio ' + VERSION + ' · ' + esc(state.role) + ' · ' + esc(state.channel) + '</div></div></div>' +
      '<div class="bespc-header-actions"><button class="bespc-header-btn" data-action="export">Xuất báo cáo</button><button class="bespc-header-btn" data-compact="true" data-action="close" aria-label="Đóng">×</button></div></header>' +
      '<aside class="bespc-sidebar"><div class="bespc-sidebar-label">Quản trị nền tảng</div><div class="bespc-tabs">' + tabs().map(function (tab) {
        return '<button class="bespc-tab" data-action="tab" data-tab="' + tab.id + '" data-active="' + (state.activeTab === tab.id) + '"><span class="bespc-tab-icon">' + tab.icon + '</span><span class="bespc-tab-label">' + esc(tab.label) + '</span><span class="bespc-tab-count">' + esc(tab.count) + '</span></button>';
      }).join('') + '</div><div class="bespc-side-card"><strong>Phím tắt</strong><p>Command/Ctrl + Shift + P để mở hoặc đóng trung tâm kiểm soát.</p></div></aside>' +
      '<main class="bespc-main" data-bespc-main>' + pageHtml() + '</main></section>';
  }

  function render() {
    var root = document.getElementById('bespc-root');
    if (!root) return;
    root.setAttribute('data-open', state.open ? 'true' : 'false');
    root.innerHTML = shellHtml();
    bindActions(root);
  }

  function bindActions(root) {
    root.querySelectorAll('[data-action]').forEach(function (node) {
      var action = node.getAttribute('data-action');
      if (action === 'module-search') {
        node.addEventListener('input', function () { state.search = node.value; render(); var next = document.querySelector('[data-action="module-search"]'); if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); } });
        return;
      }
      node.addEventListener('click', function (event) {
        event.preventDefault();
        if (action === 'close') return close();
        if (action === 'tab') { state.activeTab = node.getAttribute('data-tab') || 'overview'; render(); return; }
        if (action === 'refresh') { state.loading = true; render(); loadManifests(); return; }
        if (action === 'rerun') { runDiagnostics(); render(); return; }
        if (action === 'export') { exportReport(); return; }
        if (action === 'enable-all') { state.disabledModules = {}; savePrefs(); applyDisabledModules(); runDiagnostics(); render(); toast('Đã bật lại toàn bộ module trên trình duyệt này.'); return; }
        if (action === 'reset-flags') { state.overrides = {}; savePrefs(); render(); toast('Đã xóa toàn bộ feature flag override.'); return; }
        if (action === 'toggle-module') {
          var moduleId = node.getAttribute('data-module-id');
          if (!canManage() || !moduleId || moduleId === 'platform-control') return;
          state.disabledModules[moduleId] = !state.disabledModules[moduleId];
          if (!state.disabledModules[moduleId]) delete state.disabledModules[moduleId];
          savePrefs(); applyDisabledModules(); runDiagnostics(); render(); return;
        }
        if (action === 'toggle-flag') {
          var key = node.getAttribute('data-flag-key');
          if (!canManage() || !key) return;
          state.overrides[key] = !flagEnabled(key);
          savePrefs(); render(); window.dispatchEvent(new CustomEvent('bes-platform-flags-changed', { detail: apiReport() })); return;
        }
        if (action === 'copy-commands') {
          copyText('npm run verify:v10.89\nnpm run platform:doctor\nnpm run release:guard:v10.89');
          toast('Đã sao chép lệnh kiểm tra phát hành.');
        }
      });
    });
    var select = root.querySelector('[data-action="channel"]');
    if (select) select.addEventListener('change', function () {
      if (!canManage()) return;
      state.channel = select.value;
      savePrefs(); render();
      window.dispatchEvent(new CustomEvent('bes-platform-channel-changed', { detail: { channel: state.channel, version: VERSION } }));
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(function () {});
    var area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (_) {}
    area.remove();
  }

  function apiReport() {
    return {
      version: VERSION,
      role: state.role,
      channel: state.channel,
      flags: getFlags().reduce(function (out, flag) { out[flag.key] = flagEnabled(flag.key); return out; }, {}),
      disabledModules: Object.keys(state.disabledModules),
      moduleCount: getModules().length,
      checks: state.checks.slice(),
      manifests: state.manifests,
      generatedAt: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      online: navigator.onLine
    };
  }

  function exportReport() {
    var report = apiReport();
    var blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'brian-platform-report-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function open(tab) {
    state.role = detectRole();
    if (!canManage()) {
      toast('Platform Control Center chỉ dành cho Admin/TTCM.', 'warn');
      return false;
    }
    state.activeTab = tab || state.activeTab || 'overview';
    state.open = true;
    document.documentElement.style.overflow = 'hidden';
    render();
    window.setTimeout(function () {
      var target = document.querySelector('#bespc-root .bespc-header-btn[data-action="close"]');
      if (target) target.focus();
    }, 0);
    return true;
  }

  function close() {
    state.open = false;
    document.documentElement.style.overflow = '';
    render();
    if (window.location.hash === '#/platform-control') window.location.hash = '/';
  }

  function toggle() { return state.open ? close() : open(); }

  function applyDisabledModules() {
    var modules = getModules();
    modules.forEach(function (module) {
      var disabled = isModuleDisabled(module);
      try {
        document.querySelectorAll('a[href="' + CSS.escape(module.route) + '"], [data-route="' + CSS.escape(module.route) + '"], [data-href="' + CSS.escape(module.route) + '"]').forEach(function (node) {
          if (disabled) {
            node.setAttribute('data-bespc-disabled', 'true');
            node.setAttribute('aria-disabled', 'true');
          } else {
            node.removeAttribute('data-bespc-disabled');
            node.removeAttribute('aria-disabled');
          }
        });
      } catch (_) {}
    });
  }

  function interceptNavigation(event) {
    var node = event.target && event.target.closest ? event.target.closest('a[href], [data-route], [data-href]') : null;
    if (!node) return;
    var route = normalizeRoute(node.getAttribute('href') || node.getAttribute('data-route') || node.getAttribute('data-href'));
    if (!route) return;
    if (route === '#/platform-control') {
      event.preventDefault();
      open('overview');
      return;
    }
    var module = moduleForRoute(route);
    if (module && isModuleDisabled(module) && flagEnabled('platform.module_kill_switch')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast('Module “' + module.title + '” đang được tắt tạm thời.', 'warn');
    }
  }

  function handleHash() {
    var route = normalizeRoute(window.location.hash || '#/');
    if (route === '#/platform-control') {
      open('overview');
      return;
    }
    var module = moduleForRoute(route);
    if (module && isModuleDisabled(module) && flagEnabled('platform.module_kill_switch')) {
      toast('Module “' + module.title + '” đang được tắt tạm thời.', 'warn');
      window.location.hash = '/apps';
      return;
    }
    state.lastRoute = route || '#/';
  }

  function integrateCommandCenter() {
    function register() {
      state.role = detectRole();
      if (!canManage() || !window.BES_COMMAND_CENTER || typeof window.BES_COMMAND_CENTER.addRoute !== 'function') return false;
      window.BES_COMMAND_CENTER.addRoute({
        id: 'platform-control',
        label: 'Platform Control Center',
        route: '#/platform-control',
        group: 'Quản trị',
        icon: 'PC',
        keywords: 'platform control release version module feature flags diagnostics quản trị nền tảng'
      });
      return true;
    }
    if (!register()) {
      window.addEventListener('bes-command-center-ready', register, { once: true });
      window.setTimeout(register, 1400);
    }
  }

  function createShell() {
    if (document.getElementById('bespc-root')) return;
    var root = document.createElement('div');
    root.id = 'bespc-root';
    root.setAttribute('data-open', 'false');
    document.body.appendChild(root);
    var hidden = document.createElement('a');
    hidden.className = 'bespc-hidden-command';
    hidden.href = '#/platform-control';
    hidden.textContent = 'Platform Control Center';
    hidden.setAttribute('aria-label', 'Platform Control Center');
    document.body.appendChild(hidden);
  }

  function installObservers() {
    document.addEventListener('click', interceptNavigation, true);
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('keydown', function (event) {
      var modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.shiftKey && String(event.key).toLowerCase() === 'p') {
        event.preventDefault();
        toggle();
      }
      if (event.key === 'Escape' && state.open) close();
    });
    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_KEY || event.key === DISABLED_KEY) {
        loadPrefs();
        applyDisabledModules();
        runDiagnostics();
        if (state.open) render();
      }
    });
    var observer = new MutationObserver(function () {
      applyDisabledModules();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    if (window.BES_PLATFORM_CONTROL && window.BES_PLATFORM_CONTROL.version === VERSION) return;
    state.role = detectRole();
    loadPrefs();
    createShell();
    installObservers();
    integrateCommandCenter();
    loadManifests().then(applyDisabledModules);
    handleHash();
    window.BES_PLATFORM_CONTROL = {
      version: VERSION,
      open: open,
      close: close,
      toggle: toggle,
      report: apiReport,
      runDiagnostics: function () { runDiagnostics(); if (state.open) render(); return state.checks.slice(); },
      getFlag: flagEnabled,
      setChannel: function (channel) {
        if (!canManage() || !CHANNEL_ORDER.hasOwnProperty(channel)) return false;
        state.channel = channel;
        savePrefs();
        if (state.open) render();
        return true;
      },
      listModules: getModules,
      isModuleDisabled: function (id) { return !!state.disabledModules[id]; }
    };
    try { window.dispatchEvent(new CustomEvent('bes-platform-control-ready', { detail: apiReport() })); } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
