import {
  fromCloudRow,
  getAccessToken,
  sha256,
  syncResourceViaServer,
} from './resourceLibrary.js';

export const HTML_FONT_TAG = 'html-user-font';
export const MAX_ACCOUNT_FONT_SIZE = 8 * 1024 * 1024;
const FONT_FILE_PATTERN = /\.(ttf|otf|woff2?)$/i;

function encodeMetadata(value) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
}

export function inferFontMime(fileName = '', declaredType = '') {
  const type = String(declaredType || '').trim().toLowerCase();
  if (type && type !== 'application/octet-stream') return type;
  const name = String(fileName || '').toLowerCase();
  if (name.endsWith('.woff2')) return 'font/woff2';
  if (name.endsWith('.woff')) return 'font/woff';
  if (name.endsWith('.otf')) return 'font/otf';
  return 'font/ttf';
}

function fontFormat(mimeType = '', fileName = '') {
  const mime = String(mimeType || '').toLowerCase();
  const name = String(fileName || '').toLowerCase();
  if (mime.includes('woff2') || name.endsWith('.woff2')) return 'woff2';
  if (mime.includes('woff') || name.endsWith('.woff')) return 'woff';
  if (mime.includes('otf') || mime.includes('opentype') || name.endsWith('.otf')) return 'opentype';
  return 'truetype';
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc dữ liệu font.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

async function listAccountHtmlFontItems() {
  const token = await getAccessToken();
  if (!token) return [];
  const response = await fetch('/api/resource-sync?scope=html-user-fonts', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không thể đồng bộ font tài khoản.');
  return (data.items || []).map(fromCloudRow);
}

async function fetchFontData(item) {
  const token = await getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
  const resourceId = item?.cloudId || item?.id;
  if (!resourceId) throw new Error('Không tìm thấy font của tài khoản.');
  const response = await fetch(`/api/google-drive-file?resourceId=${encodeURIComponent(resourceId)}&mode=inline`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    let message = 'Không thể tải font từ tài khoản.';
    try { message = (await response.json()).error || message; } catch { /* binary response */ }
    throw new Error(message);
  }
  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  return {
    item,
    dataUrl,
    mimeType: inferFontMime(item.fileName, item.mimeType || blob.type),
  };
}

export async function loadAccountHtmlFont() {
  const items = await listAccountHtmlFontItems();
  for (const item of items) {
    try {
      return await fetchFontData(item);
    } catch {
      // Try an older valid font when the latest Drive file is unavailable.
    }
  }
  return null;
}

async function uploadFontFile(file, metadata) {
  const token = await getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
  const mimeType = inferFontMime(file.name, file.type);
  const response = await fetch('/api/google-drive-upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': mimeType,
      'X-File-Name': encodeURIComponent(file.name),
      'X-Resource-Metadata': encodeMetadata(metadata),
    },
    body: file,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không thể tải font lên Google Drive.');
  return { ...data, mimeType };
}

export async function removeAccountHtmlFont(item) {
  if (!item) return { ok: true };
  const token = await getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
  const response = await fetch('/api/google-drive-delete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resourceId: item.cloudId || item.id,
      fileId: item.driveFileId,
      title: item.title,
      category: 'other',
      status: item.status,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không thể xoá font khỏi tài khoản.');
  return data;
}

export async function removeAllAccountHtmlFonts(keepResourceId = '') {
  const items = await listAccountHtmlFontItems();
  const keep = String(keepResourceId || '');
  const targets = items.filter((item) => String(item.cloudId || item.id || '') !== keep);
  const results = await Promise.allSettled(targets.map((item) => removeAccountHtmlFont(item)));
  const failed = results.find((result) => result.status === 'rejected');
  if (failed && !keep) throw failed.reason;
  return { ok: !failed, removed: targets.length };
}

export async function uploadAccountHtmlFont(file, currentUser, previousItem = null) {
  if (!file) throw new Error('Hãy chọn một file font.');
  if (!FONT_FILE_PATTERN.test(file.name || '')) throw new Error('Chỉ chấp nhận .ttf, .otf, .woff hoặc .woff2.');
  if (!file.size) throw new Error('File font đang trống.');
  if (file.size > MAX_ACCOUNT_FONT_SIZE) throw new Error('Font vượt quá giới hạn 8 MB.');

  const mimeType = inferFontMime(file.name, file.type);
  const checksum = await sha256(file);
  if (previousItem?.checksum && previousItem.checksum === checksum) {
    return { item: previousItem, dataUrl: await blobToDataUrl(file), mimeType };
  }

  const now = new Date().toISOString();
  const base = {
    title: file.name.replace(FONT_FILE_PATTERN, ''),
    description: 'Font riêng của tài khoản dùng để hiển thị bài HTML trong hub Luyện thi THPT.',
    category: 'other',
    grade: '',
    schoolYear: '',
    unitName: '',
    cefr: '',
    skills: [],
    tags: [HTML_FONT_TAG, 'account-preference', 'private-font'],
    source: 'Brian English Studio',
    copyright: 'internal',
    visibility: 'private',
    allowDownload: false,
    status: 'pending',
    uploaderId: currentUser?.id,
    uploaderName: currentUser?.name || currentUser?.email || 'Teacher',
    mimeType,
    fileName: file.name,
    size: file.size,
    checksum,
    aiSummary: '',
    aiUses: [],
    extractedText: '',
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const uploaded = await uploadFontFile(file, base);
  Object.assign(base, {
    driveFileId: uploaded.fileId || '',
    driveWebViewLink: uploaded.webViewLink || '',
    driveDownloadLink: uploaded.downloadLink || '',
  });

  const cloud = await syncResourceViaServer(base);
  if (!cloud.ok) throw new Error(cloud.reason || 'Không thể lưu font vào tài khoản.');
  const saved = { ...base, ...cloud.item };
  const dataUrl = await blobToDataUrl(file);
  const savedId = saved.cloudId || saved.id;

  removeAllAccountHtmlFonts(savedId).catch(() => {});
  return { item: saved, dataUrl, mimeType };
}

export function applyAccountHtmlFont(html, profile) {
  const source = String(html || '');
  if (!source || !profile?.dataUrl) return source;
  const item = profile.item || {};
  const format = fontFormat(profile.mimeType, item.fileName);
  const safeDataUrl = String(profile.dataUrl).replace(/"/g, '%22');
  const style = `<style id="bes-account-html-font">
@font-face{font-family:'BESAccountHtmlFont';src:url("${safeDataUrl}") format('${format}');font-style:normal;font-weight:normal;font-display:block;}
:root{--bes-account-html-font:'BESAccountHtmlFont',sans-serif;}
html,body,button,input,textarea,select,option,h1,h2,h3,h4,h5,h6,p,span,a,label,li,dt,dd,th,td,caption,legend,summary,blockquote,small,strong,b,em,[role='button'],[role='tab'],[role='menuitem'],[role='option']{font-family:var(--bes-account-html-font)!important;}
.material-icons,.material-symbols-outlined,.material-symbols-rounded,.material-symbols-sharp,[class*='material-icons'],[class*='material-symbol'],[class^='fa-'],[class*=' fa-'],code,pre,kbd,samp{font-family:revert!important;}
</style>`;
  const cleaned = source.replace(/<style\s+id=["']bes-account-html-font["'][\s\S]*?<\/style>/i, '');
  if (/<\/head>/i.test(cleaned)) return cleaned.replace(/<\/head>/i, `${style}</head>`);
  if (/<body\b/i.test(cleaned)) return cleaned.replace(/<body\b/i, `${style}<body`);
  return `${style}${cleaned}`;
}
