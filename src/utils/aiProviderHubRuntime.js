import { PROVIDER_CATALOG, AI_PROVIDER_CATEGORIES, getProviderCatalogEntry } from '../data/aiProviderCatalog.js';
import { getAiConfigs, getAiProvider } from './aiProviders.js';
import { callAI } from './gemini.js';
import {
  getEffectiveActiveProvider,
  getProviderOverrideState,
  getRoutingPreferences,
  mergeAiConfigs,
  removeProviderOverride,
  saveProviderOverride,
  saveRoutingPreferences,
  setActiveProviderOverride,
} from './aiProviderOverrides.js';
import { AI_ROUTING_MODES, getRoutingModeInfo } from './aiSmartRouting.js';

const HUB_ID = 'v1157-ai-provider-hub';
const LEGACY_HIDDEN_CLASS = 'v1157-legacy-provider-card-hidden';
let installed = false;
let selectedProviderId = '';
let currentFilter = 'all';
let searchTerm = '';
let statusMessage = '';
let statusKind = '';
let observer = null;
let scanTimer = null;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function normalizeKey(value = '') {
  return String(value || '').trim().replace(/^Bearer\s+/i, '');
}

function getLegacyConfigs() {
  try { return typeof getAiConfigs === 'function' ? getAiConfigs() : {}; } catch { return {}; }
}

function getMergedConfigs() {
  return mergeAiConfigs(getLegacyConfigs());
}

function getActiveProvider() {
  let legacy = '';
  try { legacy = typeof getAiProvider === 'function' ? getAiProvider() : ''; } catch { legacy = ''; }
  return getEffectiveActiveProvider(legacy);
}

function isProviderConfigured(provider, config = {}) {
  if (config.enabled === false) return false;
  if (provider.requiresApiKey === false) return Boolean(String(config.baseUrl || provider.baseUrl || '').trim());
  return Boolean(normalizeKey(config.apiKey));
}

function providerStatus(provider, config = {}, activeProvider = '') {
  if (!isProviderConfigured(provider, config)) return { id: 'empty', label: provider.requiresApiKey === false ? 'Chưa chạy local' : 'Chưa có key' };
  if (config.lastError) return { id: 'error', label: 'Cần kiểm tra' };
  if (provider.id === activeProvider) return { id: 'active', label: 'Đang dùng' };
  return { id: 'ready', label: 'Sẵn sàng' };
}

function categoryLabel(provider) {
  return AI_PROVIDER_CATEGORIES[provider.category]?.label || provider.category || 'Khác';
}

function matchesFilter(provider, config) {
  const configured = isProviderConfigured(provider, config);
  if (currentFilter === 'configured' && !configured) return false;
  if (currentFilter !== 'all' && currentFilter !== 'configured' && provider.category !== currentFilter) return false;
  const haystack = `${provider.label} ${provider.shortLabel} ${provider.note} ${provider.category}`.toLowerCase();
  return !searchTerm || haystack.includes(searchTerm.toLowerCase());
}

function providerCardHtml(provider, config, activeProvider) {
  const status = providerStatus(provider, config, activeProvider);
  const selected = provider.id === selectedProviderId;
  const actionUrl = provider.apiKeyUrl || provider.docsUrl || '#';
  const model = config.model || provider.defaultModel || 'Chưa chọn model';
  return `<article class="v1157-provider-item ${selected ? 'selected' : ''}" data-provider-id="${escapeHtml(provider.id)}">
    <button type="button" class="v1157-provider-select" data-provider-select="${escapeHtml(provider.id)}" aria-pressed="${selected}">
      <span class="v1157-provider-logo">${escapeHtml(provider.icon || provider.shortLabel?.slice(0, 2) || 'AI')}</span>
      <span class="v1157-provider-copy"><strong>${escapeHtml(provider.label)}</strong><small>${escapeHtml(model)}</small></span>
      <span class="v1157-provider-badges"><em class="tier ${escapeHtml(provider.category)}">${escapeHtml(provider.local ? 'LOCAL' : provider.freeTier ? 'FREE' : provider.category.toUpperCase())}</em><i class="status ${status.id}">${escapeHtml(status.label)}</i></span>
    </button>
    <div class="v1157-provider-links">
      <a href="${escapeHtml(actionUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(provider.actionLabel)} cho ${escapeHtml(provider.label)}">🔑 ${escapeHtml(provider.actionLabel)} <span>↗</span></a>
      ${provider.docsUrl ? `<a class="docs" href="${escapeHtml(provider.docsUrl)}" target="_blank" rel="noopener noreferrer" title="Mở tài liệu chính thức">Hướng dẫn ↗</a>` : ''}
    </div>
  </article>`;
}

function fallbackOrderHtml(configs) {
  const prefs = getRoutingPreferences();
  const ids = prefs.fallbackOrder.filter((id) => PROVIDER_CATALOG.some((provider) => provider.id === id));
  return ids.map((id, index) => {
    const provider = getProviderCatalogEntry(id);
    const configured = isProviderConfigured(provider, configs[id] || {});
    return `<li data-fallback-id="${escapeHtml(id)}" class="${configured ? 'configured' : 'unconfigured'}">
      <span class="number">${index + 1}</span><span class="name">${escapeHtml(provider.shortLabel)}</span>
      <span class="fallback-state">${configured ? 'Sẵn sàng' : 'Chưa cấu hình'}</span>
      <button type="button" data-fallback-up="${escapeHtml(id)}" aria-label="Đưa ${escapeHtml(provider.shortLabel)} lên">↑</button>
      <button type="button" data-fallback-down="${escapeHtml(id)}" aria-label="Đưa ${escapeHtml(provider.shortLabel)} xuống">↓</button>
    </li>`;
  }).join('');
}

function configurationHtml(provider, config, activeProvider) {
  const prefs = getRoutingPreferences();
  const status = providerStatus(provider, config, activeProvider);
  const keyValue = normalizeKey(config.apiKey || '');
  const modelValue = config.model || provider.defaultModel || '';
  const baseValue = config.baseUrl || provider.baseUrl || '';
  const modelOptions = (provider.models || []).map((model) => `<option value="${escapeHtml(model)}"></option>`).join('');
  const keyField = provider.requiresApiKey === false
    ? `<div class="v1157-local-note"><b>Không cần API key.</b><span>Ứng dụng sẽ kết nối tới server local tại Base URL bên dưới.</span></div>`
    : `<label class="v1157-form-field full"><span>API key</span><div class="v1157-secret-input"><input id="v1157-api-key" type="password" value="${escapeHtml(keyValue)}" autocomplete="off" placeholder="Dán API key; không thêm chữ Bearer" /><button type="button" id="v1157-toggle-key" title="Hiện/ẩn API key">👁</button></div><small>Key chỉ được lưu theo cơ chế cấu hình hiện có trên trình duyệt này. Không ghi vào log.</small></label>`;
  return `<div class="v1157-config-head">
      <div><span class="v1157-provider-logo large">${escapeHtml(provider.icon || 'AI')}</span><div><small>Provider đang cấu hình</small><h3>${escapeHtml(provider.label)}</h3><p>${escapeHtml(provider.note || '')}</p></div></div>
      <span class="v1157-config-status ${status.id}">● ${escapeHtml(status.label)}</span>
    </div>
    <div class="v1157-config-grid">
      ${keyField}
      <label class="v1157-form-field"><span>Model</span><input id="v1157-model" list="v1157-model-options" value="${escapeHtml(modelValue)}" placeholder="Nhập model do provider hỗ trợ" /><datalist id="v1157-model-options">${modelOptions}</datalist></label>
      <label class="v1157-form-field"><span>Base URL</span><input id="v1157-base-url" value="${escapeHtml(baseValue)}" placeholder="https://.../v1" /></label>
      <label class="v1157-form-field"><span>Chế độ dùng mặc định</span><select id="v1157-routing-mode">${AI_ROUTING_MODES.map((mode) => `<option value="${escapeHtml(mode.id)}" ${prefs.mode === mode.id ? 'selected' : ''}>${escapeHtml(mode.label)}</option>`).join('')}</select></label>
      <label class="v1157-form-field"><span>Phân loại</span><input value="${escapeHtml(categoryLabel(provider))}" readonly /></label>
    </div>
    <div class="v1157-provider-instructions"><b>Cách thiết lập nhanh</b><span>1. Nhấn “${escapeHtml(provider.actionLabel)}” → 2. Sao chép key → 3. Dán vào đây → 4. Kiểm tra kết nối → 5. Lưu cấu hình.</span></div>
    <div class="v1157-config-actions">
      <button type="button" id="v1157-test-provider">Kiểm tra kết nối</button>
      <button type="button" id="v1157-remove-provider" class="danger">Xóa cấu hình</button>
      <button type="button" id="v1157-save-provider" class="primary">Lưu & dùng provider này</button>
    </div>`;
}

function hubHtml() {
  const configs = getMergedConfigs();
  const activeProvider = getActiveProvider();
  if (!selectedProviderId) selectedProviderId = activeProvider || 'gemini';
  const selected = getProviderCatalogEntry(selectedProviderId);
  const selectedConfig = configs[selectedProviderId] || {};
  const filtered = PROVIDER_CATALOG.filter((provider) => matchesFilter(provider, configs[provider.id] || {}));
  const prefs = getRoutingPreferences();
  return `<section id="${HUB_ID}" class="v1157-provider-hub" aria-label="AI Provider Hub nâng cao">
    <header class="v1157-hub-header">
      <div class="v1157-hub-title"><span class="v1157-hub-icon">⚡</span><div><small>V11.5.7 · Free AI Provider Hub</small><h2>AI Provider Hub</h2><p>Chọn provider, lấy API key, đổi model và tự động chuyển khi provider lỗi hoặc hết quota.</p></div></div>
      <div class="v1157-hub-summary"><span>Đang dùng</span><b>${escapeHtml(getProviderCatalogEntry(activeProvider).shortLabel)}</b><small>${escapeHtml(getRoutingModeInfo(prefs.mode).label)}</small></div>
    </header>
    <div class="v1157-hub-toolbar">
      <div class="v1157-filter-tabs">
        ${[['all', 'Tất cả'], ['free', 'Miễn phí'], ['trial', 'Trial'], ['local', 'Local'], ['paid', 'Trả phí'], ['configured', 'Đã cấu hình']].map(([id, label]) => `<button type="button" data-provider-filter="${id}" class="${currentFilter === id ? 'active' : ''}">${label}</button>`).join('')}
      </div>
      <label class="v1157-provider-search"><span>⌕</span><input id="v1157-provider-search" value="${escapeHtml(searchTerm)}" placeholder="Tìm provider…" /></label>
    </div>
    ${statusMessage ? `<div class="v1157-hub-message ${escapeHtml(statusKind)}">${escapeHtml(statusMessage)}</div>` : ''}
    <div class="v1157-hub-workbench">
      <div class="v1157-provider-browser">
        <div class="v1157-section-heading"><div><small>Danh sách provider</small><h3>${filtered.length} lựa chọn</h3></div><span>Nhấn provider để cấu hình</span></div>
        <div class="v1157-provider-list">${filtered.map((provider) => providerCardHtml(provider, configs[provider.id] || {}, activeProvider)).join('') || '<div class="v1157-empty-provider">Không có provider phù hợp bộ lọc.</div>'}</div>
      </div>
      <div class="v1157-provider-config">${configurationHtml(selected, selectedConfig, activeProvider)}</div>
    </div>
    <div class="v1157-routing-panel">
      <div class="v1157-section-heading"><div><small>Smart fallback</small><h3>Chuỗi chuyển đổi linh động</h3></div><div class="v1157-routing-toggles"><label class="v1157-fallback-toggle"><input id="v1157-fallback-enabled" type="checkbox" ${prefs.fallbackEnabled !== false ? 'checked' : ''} /><span>Tự chuyển provider khi lỗi</span></label><label class="v1157-fallback-toggle"><input id="v1157-allow-paid" type="checkbox" ${prefs.allowPaid === true ? 'checked' : ''} /><span>Cho phép model trả phí</span></label></div></div>
      <ol class="v1157-fallback-list">${fallbackOrderHtml(configs)}</ol>
      <div class="v1157-routing-note"><span>401/403</span> bỏ provider và cảnh báo key · <span>429</span> chuyển provider · <span>5xx/timeout</span> thử lại rồi chuyển · <span>không hỗ trợ ảnh</span> chọn model vision.</div>
    </div>
  </section>`;
}

function findLegacyProviderCard() {
  const candidates = Array.from(document.querySelectorAll('section, article, div'));
  const exact = candidates.filter((element) => {
    const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
    return text.includes('AI Provider Hub') && text.length < 2500 && !element.closest(`#${HUB_ID}`);
  });
  exact.sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length);
  const match = exact[0];
  if (!match) return null;
  let card = match;
  for (let index = 0; index < 4 && card.parentElement; index += 1) {
    const parent = card.parentElement;
    const parentText = (parent.textContent || '').replace(/\s+/g, ' ').trim();
    if (parentText.length > 5000 || parent.querySelectorAll(':scope > section, :scope > article, :scope > div').length > 8) break;
    if (parent.getBoundingClientRect().width >= card.getBoundingClientRect().width) card = parent;
  }
  return card;
}

function attachHubEvents(root) {
  root.querySelectorAll('[data-provider-select]').forEach((button) => {
    button.addEventListener('click', () => { selectedProviderId = button.dataset.providerSelect || 'gemini'; statusMessage = ''; renderHub(); });
  });
  root.querySelectorAll('[data-provider-filter]').forEach((button) => {
    button.addEventListener('click', () => { currentFilter = button.dataset.providerFilter || 'all'; renderHub(); });
  });
  root.querySelector('#v1157-provider-search')?.addEventListener('input', (event) => {
    searchTerm = event.target.value;
    window.clearTimeout(event.target.__v1157Timer);
    event.target.__v1157Timer = window.setTimeout(renderHub, 120);
  });
  root.querySelector('#v1157-toggle-key')?.addEventListener('click', () => {
    const input = root.querySelector('#v1157-api-key');
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  });
  root.querySelector('#v1157-routing-mode')?.addEventListener('change', (event) => {
    saveRoutingPreferences({ mode: event.target.value, manualProvider: selectedProviderId });
  });
  root.querySelector('#v1157-fallback-enabled')?.addEventListener('change', (event) => {
    saveRoutingPreferences({ fallbackEnabled: event.target.checked });
    statusMessage = event.target.checked ? 'Đã bật Smart fallback.' : 'Đã tắt Smart fallback.';
    statusKind = 'success';
    renderHub();
  });
  root.querySelector('#v1157-allow-paid')?.addEventListener('change', (event) => {
    saveRoutingPreferences({ allowPaid: event.target.checked });
    statusMessage = event.target.checked ? 'Đã cho phép dùng provider trả phí khi cần.' : 'Đã khóa provider trả phí trong chế độ tự động.';
    statusKind = 'success';
    renderHub();
  });
  root.querySelector('#v1157-save-provider')?.addEventListener('click', () => saveCurrentProvider(root));
  root.querySelector('#v1157-test-provider')?.addEventListener('click', () => testCurrentProvider(root));
  root.querySelector('#v1157-remove-provider')?.addEventListener('click', () => {
    if (!window.confirm(`Xóa cấu hình ${getProviderCatalogEntry(selectedProviderId).label}?`)) return;
    removeProviderOverride(selectedProviderId);
    statusMessage = 'Đã xóa cấu hình provider.';
    statusKind = 'success';
    renderHub();
  });
  root.querySelectorAll('[data-fallback-up], [data-fallback-down]').forEach((button) => {
    button.addEventListener('click', () => moveFallback(button.dataset.fallbackUp || button.dataset.fallbackDown, Boolean(button.dataset.fallbackUp)));
  });
}

function readCurrentForm(root) {
  const provider = getProviderCatalogEntry(selectedProviderId);
  return {
    apiKey: normalizeKey(root.querySelector('#v1157-api-key')?.value || ''),
    model: String(root.querySelector('#v1157-model')?.value || provider.defaultModel || '').trim(),
    baseUrl: String(root.querySelector('#v1157-base-url')?.value || provider.baseUrl || '').trim().replace(/\/+$/, ''),
    enabled: true,
  };
}

function validateProviderForm(provider, form) {
  if (provider.requiresApiKey !== false && !form.apiKey) return 'Hãy nhập API key trước khi lưu.';
  if (!form.baseUrl) return 'Hãy nhập Base URL.';
  if (/YOUR_ACCOUNT_ID/i.test(form.baseUrl)) return 'Hãy thay YOUR_ACCOUNT_ID bằng Account ID thật của Cloudflare.';
  if (!/^https?:\/\//i.test(form.baseUrl)) return 'Base URL phải bắt đầu bằng http:// hoặc https://.';
  if (!form.model) return 'Hãy chọn hoặc nhập model.';
  return '';
}

function saveCurrentProvider(root) {
  const provider = getProviderCatalogEntry(selectedProviderId);
  const form = readCurrentForm(root);
  const validation = validateProviderForm(provider, form);
  if (validation) { statusMessage = validation; statusKind = 'error'; renderHub(); return; }
  const currentPrefs = getRoutingPreferences();
  if (provider.category === 'paid' && currentPrefs.allowPaid !== true) {
    const approved = window.confirm(`${provider.label} có thể phát sinh chi phí. Bật quyền dùng provider trả phí và tiếp tục?`);
    if (!approved) { statusMessage = 'Đã hủy để tránh phát sinh chi phí.'; statusKind = 'error'; renderHub(); return; }
  }
  saveProviderOverride(selectedProviderId, form, { activate: true });
  setActiveProviderOverride(selectedProviderId);
  const mode = root.querySelector('#v1157-routing-mode')?.value || currentPrefs.mode;
  saveRoutingPreferences({ mode, manualProvider: selectedProviderId, manualModel: mode === 'manual' ? form.model : '', allowPaid: provider.category === 'paid' ? true : currentPrefs.allowPaid });
  statusMessage = `Đã lưu ${provider.label} và đặt làm provider ưu tiên.`;
  statusKind = 'success';
  renderHub();
}

async function testCurrentProvider(root) {
  const provider = getProviderCatalogEntry(selectedProviderId);
  const form = readCurrentForm(root);
  const validation = validateProviderForm(provider, form);
  if (validation) { statusMessage = validation; statusKind = 'error'; renderHub(); return; }
  statusMessage = `Đang kiểm tra ${provider.label}…`;
  statusKind = 'working';
  renderHub();
  try {
    const result = await callAI({
      provider: selectedProviderId,
      apiKey: form.apiKey,
      model: form.model,
      baseUrl: form.baseUrl,
      prompt: 'Reply with exactly: BRIAN_OK',
      systemInstruction: 'This is a short connection test. Follow the exact requested output.',
      maxOutputTokens: 48,
      governanceProfile: 'diagnostic',
      fallback: false,
      routingMode: 'manual',
      manualProvider: selectedProviderId,
      manualModel: form.model,
      loadingLabel: `Kiểm tra kết nối ${provider.label}`,
    });
    saveProviderOverride(selectedProviderId, { ...form, lastSuccessAt: new Date().toISOString(), lastError: '' }, { activate: false });
    statusMessage = `Kết nối ${provider.label} thành công${String(result).trim() ? ` · ${String(result).trim().slice(0, 48)}` : ''}.`;
    statusKind = 'success';
  } catch (error) {
    saveProviderOverride(selectedProviderId, { ...form, lastError: String(error?.message || error).slice(0, 240), lastErrorAt: new Date().toISOString() }, { activate: false });
    statusMessage = `Kết nối thất bại: ${String(error?.message || error)}`;
    statusKind = 'error';
  }
  renderHub();
}

function moveFallback(providerId, up) {
  const prefs = getRoutingPreferences();
  const order = [...prefs.fallbackOrder];
  const index = order.indexOf(providerId);
  if (index < 0) return;
  const nextIndex = up ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= order.length) return;
  [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
  saveRoutingPreferences({ fallbackOrder: order });
  statusMessage = 'Đã cập nhật thứ tự fallback.';
  statusKind = 'success';
  renderHub();
}

function renderHub() {
  if (!location.hash.includes('/settings')) return;
  let root = document.getElementById(HUB_ID);
  const legacyCard = findLegacyProviderCard();
  if (!root) {
    root = document.createElement('div');
    root.id = HUB_ID;
    const insertionTarget = legacyCard || document.querySelector('main') || document.body;
    if (legacyCard?.parentElement) {
      legacyCard.classList.add(LEGACY_HIDDEN_CLASS);
      legacyCard.parentElement.insertBefore(root, legacyCard);
    } else {
      insertionTarget.prepend(root);
    }
  } else if (legacyCard && !legacyCard.classList.contains(LEGACY_HIDDEN_CLASS)) {
    legacyCard.classList.add(LEGACY_HIDDEN_CLASS);
  }
  root.outerHTML = hubHtml();
  root = document.getElementById(HUB_ID);
  if (root) attachHubEvents(root);
}

function removeHubOutsideSettings() {
  if (location.hash.includes('/settings')) return;
  document.getElementById(HUB_ID)?.remove();
  document.querySelectorAll(`.${LEGACY_HIDDEN_CLASS}`).forEach((element) => element.classList.remove(LEGACY_HIDDEN_CLASS));
}

function buildInlineSelector(container, id) {
  const prefs = getRoutingPreferences();
  const configs = getMergedConfigs();
  const configured = PROVIDER_CATALOG.filter((provider) => isProviderConfigured(provider, configs[provider.id] || {}));
  const providerId = prefs.manualProvider || getActiveProvider();
  const provider = getProviderCatalogEntry(providerId);
  const config = configs[providerId] || {};
  const currentModel = prefs.manualModel || config.model || provider.defaultModel || '';
  const models = [...new Set([currentModel, ...(provider.models || [])].filter(Boolean))];
  const wrapper = document.createElement('div');
  wrapper.className = 'v1157-inline-route-selector';
  wrapper.dataset.selectorId = id;
  wrapper.innerHTML = `<label title="Hệ thống tự chọn provider/model phù hợp"><span>✦</span><select data-inline-mode>${AI_ROUTING_MODES.map((mode) => `<option value="${mode.id}" ${prefs.mode === mode.id ? 'selected' : ''}>${escapeHtml(mode.shortLabel)}</option>`).join('')}</select></label>
    <label title="Chọn provider"><select data-inline-provider>${configured.map((item) => `<option value="${item.id}" ${item.id === providerId ? 'selected' : ''}>${escapeHtml(item.shortLabel)}</option>`).join('') || `<option value="${provider.id}">${escapeHtml(provider.shortLabel)}</option>`}</select></label>
    <label class="model" title="Chọn model"><select data-inline-model>${models.map((model) => `<option value="${escapeHtml(model)}" ${model === currentModel ? 'selected' : ''}>${escapeHtml(model)}</option>`).join('') || '<option value="">Model tự động</option>'}</select></label>
    <button type="button" data-inline-settings title="Mở AI Provider Hub">⚙</button>`;
  wrapper.querySelector('[data-inline-mode]')?.addEventListener('change', (event) => saveRoutingPreferences({ mode: event.target.value }));
  wrapper.querySelector('[data-inline-provider]')?.addEventListener('change', (event) => {
    const nextProvider = event.target.value;
    setActiveProviderOverride(nextProvider);
    const nextInfo = getProviderCatalogEntry(nextProvider);
    saveRoutingPreferences({ manualProvider: nextProvider, manualModel: (configs[nextProvider]?.model || nextInfo.defaultModel || ''), mode: 'manual' });
  });
  wrapper.querySelector('[data-inline-model]')?.addEventListener('change', (event) => {
    saveRoutingPreferences({ manualProvider: providerId, manualModel: event.target.value, mode: 'manual' });
  });
  wrapper.querySelector('[data-inline-settings]')?.addEventListener('click', () => { location.hash = '#/settings'; });
  const textarea = container.querySelector('textarea');
  const actions = textarea?.parentElement || container;
  actions.insertBefore(wrapper, textarea || actions.firstChild);
}

function scanInlineSelectors() {
  if (location.hash.includes('/settings')) return;
  const textareas = Array.from(document.querySelectorAll('textarea'));
  let serial = 0;
  for (const textarea of textareas) {
    if (textarea.closest('.v1157-provider-hub') || textarea.closest('.v1157-inline-route-selector')) continue;
    let container = textarea.parentElement;
    let matched = false;
    for (let depth = 0; depth < 6 && container; depth += 1, container = container.parentElement) {
      const text = (container.textContent || '').replace(/\s+/g, ' ').slice(0, 1800);
      if (/Brian AI|AI Workspace|AI Copilot|Tạo bằng AI|Chạy Brian AI|AI nhận diện|AI hỗ trợ|Generate with AI/i.test(text)) { matched = true; break; }
    }
    if (!matched || !container || container.querySelector('.v1157-inline-route-selector, .v1157-model-selector')) continue;
    serial += 1;
    buildInlineSelector(container, `inline-${serial}`);
  }
}

function scheduleRender() {
  window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => {
    if (location.hash.includes('/settings')) renderHub(); else removeHubOutsideSettings();
    scanInlineSelectors();
  }, 120);
}

export function installAIProviderHubRuntime() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  const state = getProviderOverrideState();
  selectedProviderId = state.activeProvider || getActiveProvider() || 'gemini';
  window.addEventListener('hashchange', scheduleRender);
  window.addEventListener('bes-ai-settings-updated', scheduleRender);
  window.addEventListener('bes-ai-routing-updated', scheduleRender);
  observer = new MutationObserver((mutations) => {
    const relevant = mutations.some((mutation) => {
      const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
      if (target?.closest?.(`#${HUB_ID}`)) return false;
      const added = Array.from(mutation.addedNodes || []);
      if (added.length && added.every((node) => node?.nodeType === 1 && (node.id === HUB_ID || node.closest?.(`#${HUB_ID}`)))) return false;
      return true;
    });
    if (relevant) scheduleRender();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scheduleRender();
}

export function uninstallAIProviderHubRuntime() {
  observer?.disconnect();
  observer = null;
  window.removeEventListener('hashchange', scheduleRender);
  window.removeEventListener('bes-ai-settings-updated', scheduleRender);
  window.removeEventListener('bes-ai-routing-updated', scheduleRender);
  removeHubOutsideSettings();
  installed = false;
}
