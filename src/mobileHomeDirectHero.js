import mobileHomeHeroImage from './assets/mobileHero/index.js';
import { getCurrentUser, subscribeToAuthChanges } from './utils/auth.js';
import { isDepartmentLeaderRole } from './utils/roles.js';
import { uploadHomeHeroMedia } from './utils/homepageHeroMediaOptimizer.js';
import { supabase } from './utils/supabase.js';

const HERO_SELECTOR = '[data-mobile-home-hero]';
const HERO_IMAGE_SELECTOR = '[data-mobile-home-hero-art]';
const MOBILE_HERO_DOCUMENT = '/hero/mobile-current.json';
const EDIT_BUTTON_ATTR = 'data-mobile-hero-edit';
const EDITOR_ID = 'bes-mobile-hero-editor';
const EDITOR_STYLE_ID = 'bes-mobile-hero-editor-style';
const DEFAULT_VISUAL = Object.freeze({
  fit: 'contain',
  positionX: 50,
  positionY: 50,
  zoom: 1,
});

let publishedMobileHero = {
  url: '',
  fileName: '',
  mimeType: '',
  ...DEFAULT_VISUAL,
};
let currentEditorUser = null;
let stopAuthSubscription = null;

function cleanUrl(value) {
  return String(value || '').trim();
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeMobileHero(input = {}) {
  return {
    url: cleanUrl(input?.url),
    fileName: String(input?.fileName || '').trim(),
    mimeType: String(input?.mimeType || '').trim(),
    fit: ['cover', 'contain'].includes(input?.fit) ? input.fit : DEFAULT_VISUAL.fit,
    positionX: clampNumber(input?.positionX, DEFAULT_VISUAL.positionX, 0, 100),
    positionY: clampNumber(input?.positionY, DEFAULT_VISUAL.positionY, 0, 100),
    zoom: clampNumber(input?.zoom, DEFAULT_VISUAL.zoom, 0.5, 2),
  };
}

function sameMobileHero(left, right) {
  const a = normalizeMobileHero(left);
  const b = normalizeMobileHero(right);
  return a.url === b.url
    && a.fit === b.fit
    && a.positionX === b.positionX
    && a.positionY === b.positionY
    && Math.abs(a.zoom - b.zoom) < 0.001;
}

async function loadPublishedMobileHero() {
  try {
    const separator = MOBILE_HERO_DOCUMENT.includes('?') ? '&' : '?';
    const response = await fetch(`${MOBILE_HERO_DOCUMENT}${separator}t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return normalizeMobileHero();
    const document = await response.json();
    return normalizeMobileHero(document?.mobileHero);
  } catch {
    return normalizeMobileHero();
  }
}

function canEditMobileHero() {
  return isDepartmentLeaderRole(currentEditorUser?.role);
}

function injectEditorStyles() {
  if (document.getElementById(EDITOR_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = EDITOR_STYLE_ID;
  style.textContent = `
    [${EDIT_BUTTON_ATTR}] {
      position: absolute !important;
      z-index: 14 !important;
      top: 12px !important;
      right: 12px !important;
      min-height: 38px !important;
      padding: 8px 12px !important;
      border: 1px solid rgba(15,23,42,.14) !important;
      border-radius: 14px !important;
      background: rgba(255,255,255,.94) !important;
      color: #102b55 !important;
      box-shadow: 0 8px 24px rgba(15,23,42,.14) !important;
      backdrop-filter: blur(14px) !important;
      font: 800 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      cursor: pointer !important;
    }
    #${EDITOR_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      display: grid;
      place-items: end center;
      padding: max(10px, env(safe-area-inset-top)) 10px max(10px, env(safe-area-inset-bottom));
      background: rgba(15,23,42,.42);
      backdrop-filter: blur(8px);
      font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }
    #${EDITOR_ID} .bes-mobile-hero-editor__sheet {
      width: min(720px, 100%);
      max-height: 92dvh;
      overflow: auto;
      border: 1px solid rgba(148,163,184,.35);
      border-radius: 28px 28px 20px 20px;
      background: #fff;
      color: #0f172a;
      box-shadow: 0 24px 80px rgba(15,23,42,.28);
      padding: 20px;
    }
    #${EDITOR_ID} .bes-mobile-hero-editor__head {
      display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px;
    }
    #${EDITOR_ID} h2 { margin:0;font-size:24px;line-height:1.1;letter-spacing:-.02em; }
    #${EDITOR_ID} .bes-mobile-hero-editor__head p { margin:6px 0 0;color:#64748b;font-size:13px;line-height:1.45; }
    #${EDITOR_ID} button { font:inherit; }
    #${EDITOR_ID} .bes-mobile-hero-editor__close {
      width:38px;height:38px;border:1px solid #dbe3ef;border-radius:12px;background:#f8fafc;color:#0f172a;font-size:22px;cursor:pointer;
    }
    #${EDITOR_ID} .bes-mobile-hero-editor__preview {
      aspect-ratio:4/3;overflow:hidden;border:1px solid #dbe3ef;border-radius:22px;background:#f5f9ff;margin-bottom:16px;
      display:grid;place-items:center;
    }
    #${EDITOR_ID} .bes-mobile-hero-editor__preview img { width:100%;height:100%;display:block;transition:transform .18s ease; }
    #${EDITOR_ID} .bes-mobile-hero-editor__controls { display:grid;gap:14px; }
    #${EDITOR_ID} .bes-mobile-hero-editor__row { display:grid;grid-template-columns:minmax(110px, .8fr) minmax(0, 1.4fr);gap:12px;align-items:center; }
    #${EDITOR_ID} .bes-mobile-hero-editor__row label { font-weight:800;font-size:13px;color:#334155; }
    #${EDITOR_ID} select, #${EDITOR_ID} input[type="range"] { width:100%; }
    #${EDITOR_ID} select { min-height:42px;border:1px solid #dbe3ef;border-radius:12px;background:#fff;padding:0 12px;color:#0f172a; }
    #${EDITOR_ID} .bes-mobile-hero-editor__range { display:grid;grid-template-columns:1fr 54px;gap:10px;align-items:center; }
    #${EDITOR_ID} output { text-align:right;font-size:12px;font-weight:800;color:#475569; }
    #${EDITOR_ID} .bes-mobile-hero-editor__actions { display:flex;flex-wrap:wrap;gap:10px;margin-top:18px; }
    #${EDITOR_ID} .bes-mobile-hero-editor__actions button {
      min-height:44px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#0f172a;padding:0 15px;font-weight:800;cursor:pointer;
    }
    #${EDITOR_ID} .bes-mobile-hero-editor__actions .is-primary { background:#1d63d8;color:#fff;border-color:#1d63d8; }
    #${EDITOR_ID} .bes-mobile-hero-editor__actions .is-danger { color:#9f1239;border-color:#fecdd3;background:#fff7f8; }
    #${EDITOR_ID} .bes-mobile-hero-editor__actions button:disabled { opacity:.45;cursor:not-allowed; }
    #${EDITOR_ID} .bes-mobile-hero-editor__status { margin-top:14px;padding:12px 14px;border-radius:14px;background:#eff6ff;color:#1e3a8a;font-size:13px;line-height:1.5; }
    #${EDITOR_ID} .bes-mobile-hero-editor__status.is-error { background:#fff1f2;color:#9f1239; }
    #${EDITOR_ID} .bes-mobile-hero-editor__status.is-success { background:#ecfdf5;color:#166534; }
    #${EDITOR_ID} .bes-mobile-hero-editor__scope { margin:14px 0 0;padding:11px 13px;border-radius:13px;background:#f8fafc;color:#475569;font-size:12px;line-height:1.5; }
    @media (max-width: 520px) {
      #${EDITOR_ID} .bes-mobile-hero-editor__sheet { padding:17px 15px; }
      #${EDITOR_ID} .bes-mobile-hero-editor__row { grid-template-columns:1fr;gap:7px; }
      #${EDITOR_ID} .bes-mobile-hero-editor__actions { display:grid;grid-template-columns:1fr 1fr; }
      #${EDITOR_ID} .bes-mobile-hero-editor__actions .is-primary { grid-column:1/-1; }
    }
  `;
  document.head.appendChild(style);
}

function ensureEditButton(hero) {
  if (!hero) return;
  const existing = hero.querySelector(`[${EDIT_BUTTON_ATTR}]`);
  if (!canEditMobileHero()) {
    existing?.remove();
    return;
  }
  if (existing) return;

  injectEditorStyles();
  if (getComputedStyle(hero).position === 'static') hero.style.setProperty('position', 'relative');
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute(EDIT_BUTTON_ATTR, 'true');
  button.setAttribute('aria-label', 'Chỉnh sửa Hero Mobile');
  button.innerHTML = '<span aria-hidden="true">✎</span><span>Chỉnh Hero</span>';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openMobileHeroEditor();
  });
  hero.appendChild(button);
}

function applyDirectMobileHero(root = document) {
  const hero = root.querySelector?.(HERO_SELECTOR) || document.querySelector(HERO_SELECTOR);
  if (!hero) return false;

  const image = hero.querySelector(HERO_IMAGE_SELECTOR);
  if (!image) return false;

  const config = normalizeMobileHero(publishedMobileHero);
  const source = config.url || mobileHomeHeroImage;
  if (image.getAttribute('src') !== source) image.setAttribute('src', source);
  image.setAttribute('alt', 'Brian English — Học tiếng Anh thật vui');
  image.setAttribute('data-mobile-home-direct-hero', config.url ? 'cms' : 'fallback');
  image.style.setProperty('object-fit', config.fit, 'important');
  image.style.setProperty('object-position', `${config.positionX}% ${config.positionY}%`, 'important');
  image.style.setProperty('transform', `scale(${config.zoom})`, 'important');
  image.style.setProperty('transform-origin', `${config.positionX}% ${config.positionY}%`, 'important');

  hero.style.setProperty('aspect-ratio', '4 / 3', 'important');
  hero.style.setProperty('min-height', '0', 'important');
  hero.style.setProperty('overflow', 'hidden', 'important');

  hero.querySelectorAll('.bes-mobile-home__hero-hotspot').forEach((button) => button.remove());
  ensureEditButton(hero);
  return true;
}

async function sendPublishRequest(payload) {
  if (!supabase) throw new Error('Supabase Auth chưa được cấu hình.');
  const { data, error } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;
  if (error || !accessToken) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');

  const response = await fetch('/api/homepage-mobile-hero-publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || `Không thể công bố Hero Mobile (${response.status}).`);
  return result;
}

function formatStatusError(error) {
  const message = String(error?.message || error || 'Không thể cập nhật Hero Mobile.');
  if (/Only Admin\/TTCM/i.test(message)) return 'Tài khoản này chưa có quyền chỉnh Hero. Hãy dùng tài khoản TTCM/Admin được cấp quyền.';
  if (/GITHUB_HERO_TOKEN/i.test(message)) return 'Vercel chưa có GITHUB_HERO_TOKEN để công bố Hero.';
  if (/session|token|đăng nhập/i.test(message)) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi thử lại.';
  return message;
}

async function waitForPublishedMobileHero(expected, { timeoutMs = 5 * 60 * 1000 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => window.setTimeout(resolve, 8000));
    const latest = await loadPublishedMobileHero();
    if (sameMobileHero(latest, expected)) {
      publishedMobileHero = latest;
      applyDirectMobileHero();
      return true;
    }
  }
  return false;
}

function closeMobileHeroEditor() {
  document.getElementById(EDITOR_ID)?.remove();
}

function openMobileHeroEditor() {
  if (!canEditMobileHero()) return;
  closeMobileHeroEditor();
  injectEditorStyles();

  let draft = normalizeMobileHero(publishedMobileHero);
  let temporaryUpload = false;
  let busy = false;
  const overlay = document.createElement('div');
  overlay.id = EDITOR_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Chỉnh sửa Hero Mobile');
  overlay.innerHTML = `
    <section class="bes-mobile-hero-editor__sheet">
      <header class="bes-mobile-hero-editor__head">
        <div>
          <h2>Hero Mobile</h2>
          <p>Chỉnh ảnh dành riêng cho phiên bản điện thoại.</p>
        </div>
        <button type="button" class="bes-mobile-hero-editor__close" aria-label="Đóng">×</button>
      </header>
      <div class="bes-mobile-hero-editor__preview"><img alt="Xem trước Hero Mobile" /></div>
      <div class="bes-mobile-hero-editor__controls">
        <div class="bes-mobile-hero-editor__row">
          <label for="bes-mobile-hero-fit">Kiểu hiển thị</label>
          <select id="bes-mobile-hero-fit" data-mobile-hero-field="fit">
            <option value="contain">Contain · thấy toàn bộ ảnh</option>
            <option value="cover">Cover · phủ kín khung</option>
          </select>
        </div>
        <div class="bes-mobile-hero-editor__row">
          <label>Vị trí ngang</label>
          <div class="bes-mobile-hero-editor__range"><input type="range" min="0" max="100" step="1" data-mobile-hero-field="positionX" /><output data-mobile-hero-output="positionX"></output></div>
        </div>
        <div class="bes-mobile-hero-editor__row">
          <label>Vị trí dọc</label>
          <div class="bes-mobile-hero-editor__range"><input type="range" min="0" max="100" step="1" data-mobile-hero-field="positionY" /><output data-mobile-hero-output="positionY"></output></div>
        </div>
        <div class="bes-mobile-hero-editor__row">
          <label>Zoom</label>
          <div class="bes-mobile-hero-editor__range"><input type="range" min="0.5" max="2" step="0.05" data-mobile-hero-field="zoom" /><output data-mobile-hero-output="zoom"></output></div>
        </div>
      </div>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/apng" hidden data-mobile-hero-file />
      <div class="bes-mobile-hero-editor__actions">
        <button type="button" data-mobile-hero-action="upload">Chọn ảnh mới</button>
        <button type="button" class="is-danger" data-mobile-hero-action="reset">Ảnh mặc định</button>
        <button type="button" class="is-primary" data-mobile-hero-action="publish">Công bố cho Mobile</button>
      </div>
      <div class="bes-mobile-hero-editor__scope"><strong>Phạm vi:</strong> thay đổi tại đây chỉ áp dụng cho Hero trên điện thoại. Hero Desktop và cấu hình PC không bị thay đổi.</div>
      <div class="bes-mobile-hero-editor__status" data-mobile-hero-status>Đang dùng cấu hình Hero Mobile hiện tại.</div>
    </section>
  `;
  document.body.appendChild(overlay);

  const preview = overlay.querySelector('.bes-mobile-hero-editor__preview img');
  const fileInput = overlay.querySelector('[data-mobile-hero-file]');
  const uploadButton = overlay.querySelector('[data-mobile-hero-action="upload"]');
  const publishButton = overlay.querySelector('[data-mobile-hero-action="publish"]');
  const resetButton = overlay.querySelector('[data-mobile-hero-action="reset"]');
  const closeButton = overlay.querySelector('.bes-mobile-hero-editor__close');
  const status = overlay.querySelector('[data-mobile-hero-status]');

  const setStatus = (text, tone = 'info') => {
    status.textContent = text;
    status.className = `bes-mobile-hero-editor__status${tone === 'info' ? '' : ` is-${tone}`}`;
  };

  const setBusy = (value) => {
    busy = value;
    uploadButton.disabled = value;
    resetButton.disabled = value;
    publishButton.disabled = value || !cleanUrl(draft.url) || temporaryUpload;
  };

  const renderPreview = () => {
    preview.src = cleanUrl(draft.url) || mobileHomeHeroImage;
    preview.style.objectFit = draft.fit;
    preview.style.objectPosition = `${draft.positionX}% ${draft.positionY}%`;
    preview.style.transform = `scale(${draft.zoom})`;
    preview.style.transformOrigin = `${draft.positionX}% ${draft.positionY}%`;
    overlay.querySelector('[data-mobile-hero-field="fit"]').value = draft.fit;
    for (const key of ['positionX', 'positionY', 'zoom']) {
      const input = overlay.querySelector(`[data-mobile-hero-field="${key}"]`);
      const output = overlay.querySelector(`[data-mobile-hero-output="${key}"]`);
      input.value = draft[key];
      output.value = key === 'zoom' ? Number(draft[key]).toFixed(2) : `${Math.round(draft[key])}%`;
      output.textContent = output.value;
    }
    setBusy(busy);
  };

  overlay.querySelectorAll('[data-mobile-hero-field]').forEach((control) => {
    control.addEventListener('input', () => {
      const key = control.getAttribute('data-mobile-hero-field');
      if (key === 'fit') draft = { ...draft, fit: control.value === 'cover' ? 'cover' : 'contain' };
      if (key === 'positionX') draft = { ...draft, positionX: clampNumber(control.value, 50, 0, 100) };
      if (key === 'positionY') draft = { ...draft, positionY: clampNumber(control.value, 50, 0, 100) };
      if (key === 'zoom') draft = { ...draft, zoom: clampNumber(control.value, 1, 0.5, 2) };
      renderPreview();
      setStatus(cleanUrl(draft.url) ? 'Đang xem trước thay đổi. Bấm “Công bố cho Mobile” để áp dụng.' : 'Hãy chọn ảnh mới trước khi công bố các tuỳ chỉnh.');
    });
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus('Hero Mobile chỉ nhận tệp ảnh.', 'error');
      return;
    }
    setBusy(true);
    setStatus('Đang tải ảnh lên vùng bản nháp…');
    try {
      const result = await uploadHomeHeroMedia(file, currentEditorUser);
      if (result.type === 'video') throw new Error('Hero Mobile chỉ nhận tệp ảnh.');
      draft = {
        ...draft,
        url: result.url,
        fileName: result.fileName,
        mimeType: result.mimeType,
      };
      temporaryUpload = Boolean(result.temporary);
      renderPreview();
      setStatus(
        temporaryUpload
          ? 'Ảnh đang chỉ được xem trước trên thiết bị này; Storage chưa sẵn sàng nên chưa thể công bố.'
          : 'Đã tải ảnh. Hãy chỉnh vị trí/zoom nếu cần rồi bấm “Công bố cho Mobile”.',
        temporaryUpload ? 'error' : 'success',
      );
    } catch (error) {
      setStatus(formatStatusError(error), 'error');
    } finally {
      setBusy(false);
    }
  });

  uploadButton.addEventListener('click', () => fileInput.click());

  publishButton.addEventListener('click', async () => {
    if (!cleanUrl(draft.url) || temporaryUpload) return;
    setBusy(true);
    setStatus('Đang công bố cấu hình Hero Mobile…');
    try {
      const result = await sendPublishRequest(draft);
      const expected = normalizeMobileHero(result.mobileHero || draft);
      const shortCommit = String(result.commitSha || '').slice(0, 7);
      setStatus(`Đã tạo bản Mobile${shortCommit ? ` · commit ${shortCommit}` : ''}. Vercel đang triển khai; Hero Desktop không bị thay đổi.`, 'success');
      waitForPublishedMobileHero(expected).catch(() => {});
    } catch (error) {
      setStatus(formatStatusError(error), 'error');
    } finally {
      setBusy(false);
    }
  });

  resetButton.addEventListener('click', async () => {
    if (!window.confirm('Khôi phục ảnh Hero Mobile mặc định? Hero Desktop sẽ không thay đổi.')) return;
    setBusy(true);
    setStatus('Đang yêu cầu khôi phục ảnh mặc định…');
    try {
      const result = await sendPublishRequest({ remove: true });
      const expected = normalizeMobileHero(result.mobileHero);
      draft = expected;
      temporaryUpload = false;
      renderPreview();
      const shortCommit = String(result.commitSha || '').slice(0, 7);
      setStatus(`Đã tạo yêu cầu khôi phục${shortCommit ? ` · commit ${shortCommit}` : ''}. Chỉ Hero Mobile sẽ thay đổi sau deployment.`, 'success');
      waitForPublishedMobileHero(expected).catch(() => {});
    } catch (error) {
      setStatus(formatStatusError(error), 'error');
    } finally {
      setBusy(false);
    }
  });

  closeButton.addEventListener('click', closeMobileHeroEditor);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeMobileHeroEditor();
  });
  renderPreview();
}

function refreshEditorUser(user) {
  currentEditorUser = user || null;
  const hero = document.querySelector(HERO_SELECTOR);
  if (hero) ensureEditButton(hero);
}

function bootDirectMobileHero() {
  injectEditorStyles();
  applyDirectMobileHero();

  loadPublishedMobileHero().then((config) => {
    publishedMobileHero = config;
    applyDirectMobileHero();
  });

  getCurrentUser().then(refreshEditorUser).catch(() => refreshEditorUser(null));
  stopAuthSubscription = subscribeToAuthChanges((user) => refreshEditorUser(user));

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.(HERO_SELECTOR) || node.querySelector?.(HERO_SELECTOR)) {
          applyDirectMobileHero(node.matches?.(HERO_SELECTOR) ? node.parentElement || document : node);
          return;
        }
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('pagehide', () => {
    stopAuthSubscription?.();
    stopAuthSubscription = null;
  }, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootDirectMobileHero, { once: true });
} else {
  bootDirectMobileHero();
}
