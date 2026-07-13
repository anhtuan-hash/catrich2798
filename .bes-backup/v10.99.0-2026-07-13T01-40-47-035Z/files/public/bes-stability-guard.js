(function bootstrapBrianStabilityGuard() {
  'use strict';

  var VERSION = '10.86.1';
  var ERROR_KEY = 'bes-runtime-errors-v10861';
  var RECOVERY_KEY = 'bes-stability-recovery-v10861';
  var RELOAD_KEY = 'bes-stale-chunk-reload-v10861';
  var MAX_ERRORS = 40;
  var SUSPECT_CONFIG_KEYS = [
    'bes-launcher-config-v3',
    'bes-launcher-config-v4',
    'bes-launcher-settings',
    'bes-ai-governance',
    'bes-workspace-tabs',
    'bes-offline-sync-queue'
  ];

  function nowIso() {
    return new Date().toISOString();
  }

  function safeRead(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeWrite(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (_) {
      return false;
    }
  }

  function safeRemove(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  }

  function readJson(key, fallback) {
    var raw = safeRead(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function sanitize(value, depth) {
    depth = depth || 0;
    if (depth > 3) return '[truncated]';
    if (value == null) return value;
    if (typeof value === 'string') {
      return value
        .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
        .slice(0, 1500);
    }
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.slice(0, 12).map(function (item) { return sanitize(item, depth + 1); });
    if (typeof value === 'object') {
      var result = {};
      Object.keys(value).slice(0, 30).forEach(function (key) {
        if (/password|token|secret|api.?key|prompt|content|answer|body/i.test(key)) {
          result[key] = '[redacted]';
        } else {
          result[key] = sanitize(value[key], depth + 1);
        }
      });
      return result;
    }
    return String(value).slice(0, 500);
  }

  function errorList() {
    var list = readJson(ERROR_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function recordError(type, error, extra) {
    var item = {
      at: nowIso(),
      type: type,
      route: String(window.location.hash || window.location.pathname || '/'),
      message: sanitize(error && (error.message || error.reason || error), 0),
      stack: sanitize(error && error.stack, 0),
      extra: sanitize(extra || {}, 0)
    };
    var list = errorList();
    list.unshift(item);
    safeWrite(ERROR_KEY, JSON.stringify(list.slice(0, MAX_ERRORS)));
    try {
      window.dispatchEvent(new CustomEvent('bes-runtime-error-recorded', { detail: item }));
    } catch (_) {}
    return item;
  }

  function storageStatus() {
    var testKey = 'bes-storage-test-v10861';
    try {
      window.localStorage.setItem(testKey, 'ok');
      var ok = window.localStorage.getItem(testKey) === 'ok';
      window.localStorage.removeItem(testKey);
      return { available: ok, reason: ok ? '' : 'read-back-failed' };
    } catch (error) {
      return { available: false, reason: String(error && error.message || error) };
    }
  }

  function inspectConfigs() {
    return SUSPECT_CONFIG_KEYS.map(function (key) {
      var raw = safeRead(key);
      if (!raw) return { key: key, present: false, validJson: true, bytes: 0 };
      try {
        var parsed = JSON.parse(raw);
        return {
          key: key,
          present: true,
          validJson: true,
          bytes: raw.length,
          type: Array.isArray(parsed) ? 'array' : typeof parsed
        };
      } catch (error) {
        return {
          key: key,
          present: true,
          validJson: false,
          bytes: raw.length,
          error: String(error && error.message || error)
        };
      }
    });
  }

  function report() {
    return {
      generatedAt: nowIso(),
      version: VERSION,
      location: {
        origin: window.location.origin,
        pathname: window.location.pathname,
        hash: window.location.hash
      },
      browser: {
        online: navigator.onLine,
        language: navigator.language,
        platform: navigator.platform,
        userAgent: navigator.userAgent
      },
      storage: storageStatus(),
      configs: inspectConfigs(),
      runtimeErrors: errorList(),
      recovery: readJson(RECOVERY_KEY, null)
    };
  }

  function downloadJson(filename, data) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportReport() {
    downloadJson('brian-stability-report-' + Date.now() + '.json', report());
  }

  function quarantineAndRemove(key) {
    var raw = safeRead(key);
    if (raw == null) return false;
    var backupKey = key + '-quarantine-' + Date.now();
    safeWrite(backupKey, raw);
    return safeRemove(key);
  }

  function recoverLauncher() {
    var removed = [];
    ['bes-launcher-config-v3', 'bes-launcher-config-v4', 'bes-launcher-settings'].forEach(function (key) {
      if (safeRead(key) != null && quarantineAndRemove(key)) removed.push(key);
    });
    safeWrite(RECOVERY_KEY, JSON.stringify({ at: nowIso(), action: 'launcher-reset', removed: removed }));
    window.location.reload();
  }

  function clearRuntimeErrors() {
    safeRemove(ERROR_KEY);
  }

  function rootLooksBlank() {
    var root = document.getElementById('root') || document.getElementById('app');
    if (!root) return document.body && document.body.innerText.trim().length < 24;
    var text = (root.innerText || '').trim();
    var meaningfulNodes = root.querySelectorAll('main,section,article,nav,button,input,textarea,canvas,svg').length;
    return text.length < 12 && meaningfulNodes < 2;
  }

  function createRecoveryOverlay(reason, detail) {
    if (document.getElementById('bes-stability-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'bes-stability-overlay';
    overlay.setAttribute('role', 'alert');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647', 'display:grid', 'place-items:center',
      'padding:24px', 'background:rgba(10,18,35,.82)', 'backdrop-filter:blur(14px)',
      'font-family:inherit,system-ui,sans-serif'
    ].join(';');

    var panel = document.createElement('div');
    panel.style.cssText = [
      'width:min(680px,100%)', 'background:#f7f9fc', 'color:#10223f', 'border-radius:28px',
      'padding:28px', 'box-shadow:0 30px 90px rgba(0,0,0,.28)', 'border:1px solid rgba(255,255,255,.7)'
    ].join(';');
    panel.innerHTML = '' +
      '<div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;opacity:.62">Brian English Studio · Stability Guard ' + VERSION + '</div>' +
      '<h1 style="margin:10px 0 8px;font-size:clamp(25px,4vw,40px);line-height:1.05">Ứng dụng chưa khởi động hoàn chỉnh</h1>' +
      '<p style="margin:0 0 10px;line-height:1.6">Hệ thống đã chặn lỗi để tránh màn hình trắng. Dữ liệu tài khoản, học liệu và Supabase chưa bị xóa.</p>' +
      '<p style="margin:0 0 22px;padding:12px 14px;border-radius:16px;background:#e8eef8;font-size:13px;line-height:1.5"><b>Chẩn đoán:</b> ' + String(reason || 'unknown').replace(/[<>]/g, '') + (detail ? ' · ' + String(detail).replace(/[<>]/g, '').slice(0, 260) : '') + '</p>' +
      '<div id="bes-stability-actions" style="display:flex;flex-wrap:wrap;gap:10px"></div>' +
      '<p style="margin:18px 0 0;font-size:12px;opacity:.66">Nên thử “Tải lại an toàn” trước. Chỉ dùng “Khôi phục Launcher” khi lỗi xuất hiện tại trang Ứng dụng.</p>';

    var actions = panel.querySelector('#bes-stability-actions');
    function addButton(label, primary, handler) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.style.cssText = [
        'border:0', 'border-radius:999px', 'padding:12px 18px', 'cursor:pointer', 'font:inherit', 'font-weight:800',
        primary ? 'background:#155eef;color:white' : 'background:#dfe7f4;color:#10223f'
      ].join(';');
      button.addEventListener('click', handler);
      actions.appendChild(button);
    }
    addButton('Tải lại an toàn', true, function () {
      safeWrite(RECOVERY_KEY, JSON.stringify({ at: nowIso(), action: 'safe-reload', reason: reason }));
      var url = new URL(window.location.href);
      url.searchParams.set('stability', String(Date.now()));
      window.location.replace(url.toString());
    });
    addButton('Xuất báo cáo lỗi', false, exportReport);
    addButton('Khôi phục Launcher', false, recoverLauncher);
    addButton('Đóng thông báo', false, function () { overlay.remove(); });

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  window.addEventListener('error', function (event) {
    var item = recordError('window.error', event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
    setTimeout(function () {
      if (rootLooksBlank()) createRecoveryOverlay('runtime-error', item.message);
    }, 150);
  });

  window.addEventListener('unhandledrejection', function (event) {
    var item = recordError('unhandledrejection', event.reason, {});
    setTimeout(function () {
      if (rootLooksBlank()) createRecoveryOverlay('unhandled-promise', item.message);
    }, 150);
  });

  window.addEventListener('vite:preloadError', function (event) {
    recordError('vite:preloadError', event && event.payload || 'stale chunk', {});
    var alreadyReloaded = false;
    try {
      alreadyReloaded = window.sessionStorage.getItem(RELOAD_KEY) === '1';
      window.sessionStorage.setItem(RELOAD_KEY, '1');
    } catch (_) {}
    if (!alreadyReloaded) {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      var url = new URL(window.location.href);
      url.searchParams.set('chunk', String(Date.now()));
      window.location.replace(url.toString());
    } else {
      createRecoveryOverlay('stale-chunk', 'Trình duyệt đang giữ tệp JavaScript của deployment cũ.');
    }
  });

  window.addEventListener('online', function () {
    try { window.dispatchEvent(new CustomEvent('bes-network-restored')); } catch (_) {}
  });
  window.addEventListener('offline', function () {
    recordError('network.offline', 'Browser went offline', {});
  });

  function bootWatchdog() {
    window.setTimeout(function () {
      if (rootLooksBlank()) {
        recordError('boot.watchdog', 'Root remained blank after startup window', {});
        createRecoveryOverlay('boot-timeout', 'Không tìm thấy giao diện ứng dụng sau khi chờ khởi động.');
      } else {
        try { window.sessionStorage.removeItem(RELOAD_KEY); } catch (_) {}
      }
    }, 12000);
  }

  window.BES_STABILITY = Object.freeze({
    version: VERSION,
    report: report,
    exportReport: exportReport,
    clearRuntimeErrors: clearRuntimeErrors,
    recoverLauncher: recoverLauncher,
    showRecovery: function () { createRecoveryOverlay('manual-check', 'Được mở thủ công từ công cụ chẩn đoán.'); }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootWatchdog, { once: true });
  } else {
    bootWatchdog();
  }
})();
