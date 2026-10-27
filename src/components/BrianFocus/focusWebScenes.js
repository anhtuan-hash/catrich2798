/**
 * BRIAN Focus website allowlist-free URL validation.
 * Intentionally accepts only remote HTTPS documents; never embeds this app,
 * local network targets, script/data URLs or credential-bearing links.
 */
export const FOCUS_WEB_MAX = 30;
export const FOCUS_WEB_LAYOUTS = Object.freeze(['single', 'split', 'quad']);

export function normalizeFocusWebLayout(value) {
  return FOCUS_WEB_LAYOUTS.includes(value) ? value : 'single';
}

export function normalizeFocusWebUrl(input, appOrigin = '') {
  let raw = String(input || '').trim();
  if (/^<iframe\b/i.test(raw)) {
    const match = raw.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    if (!match) throw new Error('Iframe phải có thuộc tính src hợp lệ.');
    raw = match[2].replace(/&amp;/g, '&');
  }
  if (!raw || raw.length > 2000) throw new Error('URL website không hợp lệ hoặc quá dài.');
  let url;
  try { url = new URL(raw); } catch { throw new Error('Website phải là liên kết HTTPS đầy đủ.'); }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Chỉ chấp nhận URL HTTPS không chứa thông tin đăng nhập.');
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host.includes('.') || /^(localhost|.*\.(local|localhost|internal|invalid|test|onion))$/i.test(host)
    || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')
    || (url.port && url.port !== '443')) {
    throw new Error('Không được nhúng địa chỉ máy nội bộ hoặc máy chủ không công khai.');
  }
  let own;
  try { own = new URL(appOrigin).origin; } catch { own = ''; }
  if (own && url.origin === own) {
    throw new Error('Không thể nhúng chính BRIAN vào iframe để bảo vệ tài khoản.');
  }
  return url.href;
}

export function normalizeFocusWebScenes(input, appOrigin = '') {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const list = [];
  for (const item of input.slice(0, FOCUS_WEB_MAX)) {
    try {
      const url = normalizeFocusWebUrl(typeof item === 'string' ? item : item?.url, appOrigin);
      if (seen.has(url)) continue;
      seen.add(url);
      const title = String(item?.title || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80)
        || new URL(url).hostname;
      list.push({ title, url });
    } catch { /* Discard unsafe remotely supplied entries when rendering. */ }
  }
  return list;
}

export function parseFocusWebInput(text, appOrigin = '') {
  const entries = String(text || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (!entries.length) throw new Error('Hãy nhập ít nhất một URL website.');
  if (entries.length > FOCUS_WEB_MAX) throw new Error('Tối đa 30 website trong một danh sách.');
  const result = [];
  const seen = new Set();
  for (const raw of entries) {
    const url = normalizeFocusWebUrl(raw, appOrigin);
    if (seen.has(url)) continue;
    seen.add(url);
    result.push({ title: new URL(url).hostname, url });
  }
  return result;
}

export function validateFocusWebScenes(input, appOrigin = '') {
  if (!Array.isArray(input) || input.length < 1 || input.length > FOCUS_WEB_MAX) {
    throw new Error('Danh sách website phải có từ 1 đến 30 mục.');
  }
  const result = normalizeFocusWebScenes(input, appOrigin);
  if (result.length !== input.length) {
    throw new Error('Website trùng lặp hoặc URL không an toàn. Hãy kiểm tra lại.');
  }
  if (JSON.stringify(result).length > 17000) {
    throw new Error('Danh sách website quá dài.');
  }
  return result;
}
