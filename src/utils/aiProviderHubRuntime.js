import { getProviderCatalogEntry } from '../data/aiProviderCatalog.js';
import { getAiConfigs, saveAiConfigs } from './aiProviders.js';
import { runAITask } from './aiTaskRuntime.js';

const HUB_ID = 'bes-openrouter-one-key-hub';
const STYLE_ID = 'bes-openrouter-one-key-style';
let installed = false;
let observer = null;
let timer = null;
let status = '';
let statusKind = '';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${HUB_ID}{margin:0 0 24px;padding:24px;border:1px solid rgba(99,102,241,.18);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(244,247,255,.98));box-shadow:0 22px 60px rgba(51,65,85,.1);font-family:inherit}
    #${HUB_ID} *{box-sizing:border-box}
    #${HUB_ID} .or-head{display:flex;gap:18px;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
    #${HUB_ID} .or-brand{display:flex;gap:14px;align-items:center}
    #${HUB_ID} .or-logo{width:54px;height:54px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,#5b5fe9,#8b5cf6);color:#fff;font-size:28px;box-shadow:0 14px 30px rgba(91,95,233,.28)}
    #${HUB_ID} h2{margin:0;color:#172033;font-size:22px} #${HUB_ID} p{margin:6px 0 0;color:#667085;line-height:1.55}
    #${HUB_ID} .or-badge{padding:8px 12px;border-radius:999px;background:#e8f8ef;color:#157347;font-weight:800;font-size:12px;white-space:nowrap}
    #${HUB_ID} .or-grid{display:grid;grid-template-columns:minmax(260px,1.25fr) repeat(3,minmax(180px,.75fr));gap:14px}
    #${HUB_ID} label{display:grid;gap:7px;color:#344054;font-size:12px;font-weight:800} #${HUB_ID} input{width:100%;min-height:46px;border:1px solid #d8deea;border-radius:14px;padding:0 13px;background:#fff;color:#172033;font:inherit;outline:none}
    #${HUB_ID} input:focus{border-color:#777af0;box-shadow:0 0 0 4px rgba(99,102,241,.1)}
    #${HUB_ID} .or-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:18px} #${HUB_ID} button{border:0;border-radius:14px;padding:11px 16px;font:inherit;font-weight:800;cursor:pointer}
    #${HUB_ID} .primary{background:linear-gradient(135deg,#5b5fe9,#7c4dff);color:#fff} #${HUB_ID} .secondary{background:#eef0ff;color:#4448c8} #${HUB_ID} a{color:#4b50d8;font-weight:800;text-decoration:none}
    #${HUB_ID} .or-note{margin-left:auto;color:#667085;font-size:12px} #${HUB_ID} .or-status{margin-top:14px;padding:11px 13px;border-radius:13px;background:#eef3ff;color:#344054} #${HUB_ID} .or-status.ok{background:#eaf8ef;color:#147a42} #${HUB_ID} .or-status.error{background:#fff0f0;color:#b42318}
    .bes-openrouter-inline{display:flex;align-items:center;gap:7px;margin:0 0 8px;padding:7px 9px;border:1px solid rgba(99,102,241,.18);border-radius:13px;background:rgba(247,248,255,.94);width:max-content;max-width:100%}.bes-openrouter-inline b{font-size:12px;color:#4b50d8}.bes-openrouter-inline select{max-width:240px;border:0;background:transparent;color:#344054;font:inherit;font-size:12px;outline:none}.bes-openrouter-inline button{border:0;background:transparent;cursor:pointer}
    @media(max-width:1050px){#${HUB_ID} .or-grid{grid-template-columns:1fr 1fr}} @media(max-width:650px){#${HUB_ID} .or-grid{grid-template-columns:1fr}#${HUB_ID} .or-head{flex-direction:column}#${HUB_ID} .or-note{margin-left:0}}
  `;
  document.head.appendChild(style);
}

function findLegacyProviderCard() {
  return Array.from(document.querySelectorAll('article,section')).filter((node) => node.id !== HUB_ID).find((node) => {
    const text = String(node.textContent || '').replace(/\s+/g, ' ').slice(0, 700).toLowerCase();
    return (text.includes('ai provider') || text.includes('nhà cung cấp ai')) && (text.includes('api key') || text.includes('model'));
  }) || null;
}

function renderHub() {
  if (!location.hash.includes('/settings')) return;
  ensureStyle();
  const info = getProviderCatalogEntry('openrouter');
  const config = getAiConfigs().openrouter || {};
  let root = document.getElementById(HUB_ID);
  const legacy = findLegacyProviderCard();
  if (!root) {
    root = document.createElement('section');
    root.id = HUB_ID;
    if (legacy?.parentElement) legacy.parentElement.insertBefore(root, legacy);
    else (document.querySelector('main') || document.body).prepend(root);
  }
  if (legacy && legacy.id !== HUB_ID) legacy.style.display = 'none';
  root.innerHTML = `
    <div class="or-head"><div class="or-brand"><span class="or-logo">↗</span><div><h2>OpenRouter AI Gateway</h2><p>Một API key dùng xuyên suốt toàn bộ website, mọi ứng dụng và mọi chức năng AI.</p></div></div><span class="or-badge">Provider duy nhất</span></div>
    <div class="or-grid">
      <label>OpenRouter API key<input data-key type="password" autocomplete="off" placeholder="sk-or-v1-…" value="${escapeHtml(config.apiKey || '')}"></label>
      <label>Model văn bản<input data-model value="${escapeHtml(config.model || info.defaultModel)}"></label>
      <label>Model Vision<input data-vision value="${escapeHtml(config.visionModel || info.defaultVisionModel)}"></label>
      <label>Model tạo/chỉnh ảnh<input data-image value="${escapeHtml(config.imageModel || info.defaultImageModel)}"></label>
    </div>
    <div class="or-actions"><button class="primary" data-save>Lưu cho toàn website</button><button class="secondary" data-test>Kiểm tra kết nối</button><a href="${escapeHtml(info.apiKeyUrl)}" target="_blank" rel="noreferrer">Lấy API key ↗</a><span class="or-note">Base URL cố định: ${escapeHtml(info.baseUrl)}</span></div>
    ${status ? `<div class="or-status ${statusKind}">${escapeHtml(status)}</div>` : ''}`;
  root.querySelector('[data-save]')?.addEventListener('click', () => {
    const next = {
      apiKey: root.querySelector('[data-key]')?.value || '',
      model: root.querySelector('[data-model]')?.value || info.defaultModel,
      visionModel: root.querySelector('[data-vision]')?.value || info.defaultVisionModel,
      imageModel: root.querySelector('[data-image]')?.value || info.defaultImageModel,
      baseUrl: info.baseUrl,
      enabled: true,
    };
    saveAiConfigs({ openrouter: next });
    status = 'Đã lưu OpenRouter API key và áp dụng cho toàn bộ website.';
    statusKind = 'ok';
    renderHub();
  });
  root.querySelector('[data-test]')?.addEventListener('click', async () => {
    const next = {
      apiKey: root.querySelector('[data-key]')?.value || '',
      model: root.querySelector('[data-model]')?.value || info.defaultModel,
      visionModel: root.querySelector('[data-vision]')?.value || info.defaultVisionModel,
      imageModel: root.querySelector('[data-image]')?.value || info.defaultImageModel,
      baseUrl: info.baseUrl,
      enabled: true,
    };
    saveAiConfigs({ openrouter: next });
    status = 'Đang kiểm tra OpenRouter…'; statusKind = ''; renderHub();
    try {
      const result = await runAITask('system.connectionTest', { provider: 'openrouter', apiKey: next.apiKey, model: next.model, baseUrl: next.baseUrl, prompt: 'Reply with exactly: BRIAN_OK', maxOutputTokens: 40, fallback: false, loadingLabel: 'Kiểm tra OpenRouter' });
      status = `Kết nối thành công · ${String(result || 'BRIAN_OK').trim().slice(0, 48)}`; statusKind = 'ok';
    } catch (error) {
      status = `Kết nối thất bại: ${String(error?.message || error)}`; statusKind = 'error';
    }
    renderHub();
  });
}

function removeHubOutsideSettings() {
  if (location.hash.includes('/settings')) return;
  document.getElementById(HUB_ID)?.remove();
}

function addInlineSelectors() {
  if (location.hash.includes('/settings')) return;
  const config = getAiConfigs().openrouter || {};
  for (const textarea of document.querySelectorAll('textarea')) {
    if (textarea.closest('.bes-openrouter-inline') || textarea.parentElement?.querySelector(':scope > .bes-openrouter-inline')) continue;
    let container = textarea.parentElement;
    let matched = false;
    for (let depth = 0; depth < 5 && container; depth += 1, container = container.parentElement) {
      if (/Brian AI|AI Copilot|Tạo bằng AI|AI hỗ trợ|Generate with AI/i.test(String(container.textContent || '').slice(0, 1500))) { matched = true; break; }
    }
    if (!matched) continue;
    const row = document.createElement('div');
    row.className = 'bes-openrouter-inline';
    row.innerHTML = `<b>↗ OpenRouter</b><select><option>${escapeHtml(config.model || 'openrouter/free')}</option></select><button type="button" title="OpenRouter settings">⚙</button>`;
    row.querySelector('button')?.addEventListener('click', () => { location.hash = '#/settings'; });
    textarea.parentElement?.insertBefore(row, textarea);
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (location.hash.includes('/settings')) renderHub(); else removeHubOutsideSettings();
    addInlineSelectors();
  }, 120);
}

export function installAIProviderHubRuntime() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  ensureStyle();
  window.addEventListener('hashchange', schedule);
  window.addEventListener('bes-ai-settings-updated', schedule);
  observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  schedule();
}

export function uninstallAIProviderHubRuntime() {
  installed = false;
  observer?.disconnect();
  observer = null;
  clearTimeout(timer);
  document.getElementById(HUB_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
}
