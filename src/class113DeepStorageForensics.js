const BUTTON_ID = 'bes-class-113-deep-storage-scan';
const STYLE_ID = 'bes-class-113-deep-storage-scan-style';
const CLASS_NAME = '11.3';
const MAX_RECORDS_PER_STORE = 2500;
const MAX_TOTAL_RECORDS = 15000;
const REDACTED = '[REDACTED]';
let busy = false;

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeClassName(value) {
  const raw = safeText(value).replace(',', '.');
  const match = raw.match(/(\d{1,2})\D+(\d{1,2})/);
  return match ? `${Number(match[1])}.${Number(match[2])}` : raw.toLowerCase();
}

function looksSensitiveKey(key) {
  const value = safeText(key).toLowerCase().replace(/[^a-z0-9]/g, '');
  return /^(accesstoken|refreshtoken|idtoken|token|authorization|password|secret|apikey|credential|portalpin|pin|sessiontoken)$/.test(value)
    || value.endsWith('password')
    || value.endsWith('secret')
    || value.endsWith('apikey')
    || value.endsWith('accesstoken')
    || value.endsWith('refreshtoken');
}

function sanitize(value, seen = new WeakSet(), depth = 0) {
  if (depth > 18) return '[MAX_DEPTH]';
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Blob) return { type: value.type, size: value.size, omitted: true };
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return { byteLength: value.byteLength || value.buffer?.byteLength || 0, omitted: true };
  if (typeof value !== 'object') return safeText(value);
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);

  if (Array.isArray(value)) return value.slice(0, 5000).map((item) => sanitize(item, seen, depth + 1));

  const output = {};
  Object.entries(value).forEach(([key, item]) => {
    if (looksSensitiveKey(key)) output[key] = REDACTED;
    else output[key] = sanitize(item, seen, depth + 1);
  });
  return output;
}

function parseJson(raw) {
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function scoreSignal(value) {
  let count = 0;
  const seen = new WeakSet();
  const visit = (item, path = '', depth = 0) => {
    if (depth > 18 || item == null) return;
    if (typeof item !== 'object') {
      const keyPath = path.toLowerCase();
      if (/score|scores|bonus|midterm|final|gradebook|learning/.test(keyPath)) {
        const numeric = Number(String(item).replace(',', '.'));
        if (item !== '' && Number.isFinite(numeric) && numeric >= 0 && numeric <= 100) count += 1;
      }
      return;
    }
    if (seen.has(item)) return;
    seen.add(item);
    if (Array.isArray(item)) {
      item.slice(0, 5000).forEach((child, index) => visit(child, `${path}[${index}]`, depth + 1));
      return;
    }
    Object.entries(item).forEach(([key, child]) => visit(child, path ? `${path}.${key}` : key, depth + 1));
  };
  visit(value);
  return count;
}

function classSignal(value) {
  let matched = false;
  const seen = new WeakSet();
  const visit = (item, depth = 0) => {
    if (matched || depth > 14 || item == null) return;
    if (typeof item === 'string') {
      matched = normalizeClassName(item) === CLASS_NAME || /(^|\D)11\D*3(\D|$)/.test(item);
      return;
    }
    if (typeof item !== 'object' || seen.has(item)) return;
    seen.add(item);
    if (Array.isArray(item)) {
      item.slice(0, 3000).forEach((child) => visit(child, depth + 1));
      return;
    }
    Object.entries(item).forEach(([key, child]) => {
      if (matched) return;
      if (/classname|class|lop|workspaceid|id/i.test(key) && typeof child === 'string') visit(child, depth + 1);
      else if (depth < 6) visit(child, depth + 1);
    });
  };
  visit(value);
  return matched;
}

function candidateSummary(value) {
  const studentCount = Array.isArray(value?.students) ? value.students.length : 0;
  const hasGradebook = Boolean(value?.learningGradebook || value?.gradebook);
  const learningRecords = Array.isArray(value?.learningRecords) ? value.learningRecords.length : 0;
  const backups = Array.isArray(value?.backups) ? value.backups.length : 0;
  return {
    classMatched: classSignal(value),
    scoreSignals: scoreSignal(value),
    studentCount,
    hasGradebook,
    learningRecords,
    backups,
  };
}

function storageEntries(storage, storageName) {
  const results = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      if (/supabase.*auth|auth.*token|sb-.*-auth-token/i.test(key)) {
        results.push({ storage: storageName, key, omitted: 'auth-storage' });
        continue;
      }
      const raw = storage.getItem(key) || '';
      const parsed = parseJson(raw);
      if (parsed) {
        const summary = candidateSummary(parsed);
        if (summary.classMatched || summary.scoreSignals || summary.hasGradebook || summary.learningRecords || summary.backups) {
          results.push({ storage: storageName, key, summary, value: sanitize(parsed) });
        }
      } else if (/(11\D*3|grade|score|learning|workspace|homeroom)/i.test(`${key} ${raw.slice(0, 1500)}`)) {
        results.push({ storage: storageName, key, rawPreview: raw.slice(0, 12000) });
      }
    }
  } catch (error) {
    results.push({ storage: storageName, error: error?.message || String(error) });
  }
  return results;
}

function openDatabase(name, version) {
  return new Promise((resolve, reject) => {
    const request = version ? indexedDB.open(name, version) : indexedDB.open(name);
    request.onerror = () => reject(request.error || new Error(`Không mở được IndexedDB ${name}.`));
    request.onblocked = () => reject(new Error(`IndexedDB ${name} đang bị khóa.`));
    request.onsuccess = () => resolve(request.result);
  });
}

function readStore(db, storeName, remainingLimit) {
  return new Promise((resolve) => {
    const records = [];
    let transaction;
    try {
      transaction = db.transaction(storeName, 'readonly');
    } catch (error) {
      resolve({ storeName, records, error: error?.message || String(error) });
      return;
    }
    const store = transaction.objectStore(storeName);
    const request = store.openCursor();
    request.onerror = () => resolve({ storeName, records, error: request.error?.message || String(request.error) });
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || records.length >= Math.min(MAX_RECORDS_PER_STORE, remainingLimit)) {
        resolve({ storeName, records, truncated: Boolean(cursor) });
        return;
      }
      const value = cursor.value;
      const summary = candidateSummary(value);
      if (summary.classMatched || summary.scoreSignals || summary.hasGradebook || summary.learningRecords || summary.backups) {
        records.push({ key: sanitize(cursor.key), summary, value: sanitize(value) });
      }
      cursor.continue();
    };
  });
}

async function scanIndexedDb() {
  if (!window.indexedDB) return [{ error: 'Trình duyệt không hỗ trợ IndexedDB.' }];
  let databases = [];
  try {
    databases = typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [];
  } catch (error) {
    return [{ error: error?.message || String(error) }];
  }
  const results = [];
  let totalRecords = 0;
  for (const info of databases) {
    if (!info?.name || totalRecords >= MAX_TOTAL_RECORDS) continue;
    if (/auth|credential|token/i.test(info.name)) {
      results.push({ database: info.name, omitted: 'sensitive-database-name' });
      continue;
    }
    let db;
    try {
      db = await openDatabase(info.name, info.version);
      const stores = [];
      for (const storeName of [...db.objectStoreNames]) {
        if (totalRecords >= MAX_TOTAL_RECORDS) break;
        const storeResult = await readStore(db, storeName, MAX_TOTAL_RECORDS - totalRecords);
        totalRecords += storeResult.records.length;
        if (storeResult.records.length || storeResult.error) stores.push(storeResult);
      }
      results.push({ database: info.name, version: info.version, stores });
    } catch (error) {
      results.push({ database: info.name, version: info.version, error: error?.message || String(error) });
    } finally {
      try { db?.close(); } catch { /* ignore */ }
    }
  }
  return results;
}

async function scanCacheStorage() {
  if (!window.caches) return [];
  const results = [];
  try {
    const names = await caches.keys();
    for (const cacheName of names) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      const matches = [];
      for (const request of requests.slice(0, 500)) {
        if (!/(workspace|homeroom|grade|score|learning|11[.-]?3)/i.test(request.url)) continue;
        try {
          const response = await cache.match(request);
          const contentType = response?.headers.get('content-type') || '';
          if (/json|text/.test(contentType)) {
            const text = await response.clone().text();
            const parsed = parseJson(text);
            if (parsed) {
              const summary = candidateSummary(parsed);
              if (summary.classMatched || summary.scoreSignals || summary.hasGradebook) {
                matches.push({ url: request.url, summary, value: sanitize(parsed) });
              }
            }
          }
        } catch { /* ignore one cache entry */ }
      }
      if (matches.length) results.push({ cacheName, matches });
    }
  } catch (error) {
    results.push({ error: error?.message || String(error) });
  }
  return results;
}

function download(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `quet-sau-bo-nho-lop-11-3-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function runScan(button) {
  if (busy) return;
  busy = true;
  button.disabled = true;
  const original = button.textContent;
  button.textContent = 'Đang quét bộ nhớ…';
  try {
    const payload = {
      type: 'BES_CLASS_11_3_DEEP_STORAGE_FORENSICS',
      version: 1,
      exportedAt: new Date().toISOString(),
      className: CLASS_NAME,
      page: { href: location.href, userAgent: navigator.userAgent },
      localStorage: storageEntries(localStorage, 'localStorage'),
      sessionStorage: storageEntries(sessionStorage, 'sessionStorage'),
      indexedDB: await scanIndexedDb(),
      cacheStorage: await scanCacheStorage(),
      privacy: {
        authStorageOmitted: true,
        tokenPasswordSecretApiKeyPortalPinRedacted: true,
        binaryValuesOmitted: true,
      },
    };
    download(payload);
    window.alert('Đã quét sâu localStorage, sessionStorage, IndexedDB và Cache Storage. Hãy gửi file vừa tải vào cuộc trò chuyện để trích điểm lớp 11.3.');
  } catch (error) {
    console.error('[Class113DeepStorageForensics] Scan failed.', error);
    window.alert(error?.message || 'Không thể quét sâu bộ nhớ trình duyệt.');
  } finally {
    busy = false;
    button.disabled = false;
    button.textContent = original;
  }
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${BUTTON_ID}{position:fixed;right:22px;bottom:254px;z-index:99990;min-height:46px;padding:0 18px;border:1px solid #b06000;border-radius:999px;background:#f9ab00;color:#3c2a00;font:800 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 12px 32px rgba(176,96,0,.24);cursor:pointer}
    #${BUTTON_ID}:hover{background:#f29900}#${BUTTON_ID}:disabled{opacity:.65;cursor:wait}
    @media(max-width:640px){#${BUTTON_ID}{right:12px;bottom:246px;max-width:calc(100vw - 24px)}}
  `;
  document.head.appendChild(style);
}

function ensureButton() {
  const homeroom = /homeroom|chu-nhiem|gvcn/i.test(window.location.hash || '');
  if (!homeroom) {
    document.getElementById(BUTTON_ID)?.remove();
    return;
  }
  injectStyle();
  let button = document.getElementById(BUTTON_ID);
  if (!button) {
    button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = 'Quét sâu bộ nhớ 11.3';
    button.title = 'Quét mọi vùng lưu trữ trình duyệt để tìm bản điểm cũ; thông tin đăng nhập và mã PIN được loại bỏ.';
    button.addEventListener('click', () => runScan(button));
    document.body.appendChild(button);
  }
}

window.addEventListener('hashchange', ensureButton);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureButton, { once: true });
} else {
  ensureButton();
}
