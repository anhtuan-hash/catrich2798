// Compatibility bridge for clients that cached an older Vite entry file.
// This keeps the retired hashed URL alive long enough to discover and load
// the current production entry without clearing any user data.
const RETIRED_ENTRY = '/assets/main-DJcIaHTQ.js';
const nativeFetch = window.__BES_NATIVE_FETCH__ || window.fetch?.bind(window);

function absoluteUrl(value) {
  try { return new URL(value, window.location.origin).toString(); }
  catch { return ''; }
}

async function discoverCurrentEntry() {
  if (!nativeFetch) throw new Error('Trình duyệt không hỗ trợ tải bản production mới.');
  const pageUrl = new URL('/', window.location.origin);
  pageUrl.searchParams.set('bes_asset_recovery', String(Date.now()));
  const response = await nativeFetch(pageUrl.toString(), {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  if (!response.ok) throw new Error(`Không thể đọc bản production mới (${response.status}).`);
  const html = await response.text();
  const documentCopy = new DOMParser().parseFromString(html, 'text/html');
  const candidates = [...documentCopy.querySelectorAll('script[type="module"][src]')]
    .map((node) => absoluteUrl(node.getAttribute('src')))
    .filter(Boolean)
    .filter((src) => !src.includes(RETIRED_ENTRY));
  const entry = candidates.at(-1);
  if (!entry) throw new Error('Không tìm thấy file khởi động production hiện tại.');
  return entry;
}

async function bootLatestProduction() {
  const entry = await discoverCurrentEntry();
  const url = new URL(entry);
  url.searchParams.set('bes_recovered', String(Date.now()));
  await import(url.toString());
  window.dispatchEvent(new CustomEvent('bes-production-entry-recovered', {
    detail: { retiredEntry: RETIRED_ENTRY, currentEntry: entry },
  }));
}

bootLatestProduction().catch((error) => {
  console.error('[BES asset recovery] Không thể nạp entry production mới.', error);
  try {
    const guardKey = 'bes-stale-entry-reload-v1';
    const lastAttempt = Number(sessionStorage.getItem(guardKey) || 0);
    if (!lastAttempt || Date.now() - lastAttempt > 15000) {
      sessionStorage.setItem(guardKey, String(Date.now()));
      const target = new URL(window.location.href);
      target.searchParams.set('refresh', String(Date.now()));
      window.location.replace(target.toString());
      return;
    }
  } catch { /* session storage is optional */ }
  window.dispatchEvent(new CustomEvent('bes-production-entry-recovery-failed', {
    detail: { message: String(error?.message || error || 'Unknown recovery error') },
  }));
});
