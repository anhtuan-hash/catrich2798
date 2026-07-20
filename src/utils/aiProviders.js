export const AI_PROVIDER_KEY = 'bes-ai-provider';
export const AI_CONFIGS_KEY = 'bes-ai-configs';
export const AI_FALLBACK_KEY = 'bes-ai-fallback-enabled';
export const AI_USER_SCOPE_KEY = 'bes-ai-user-scope';
export const AI_SERVER_STATUS_KEY = 'bes-ai-server-status:v1';

export const PROVIDERS = Object.freeze([
  Object.freeze({
    id: 'openrouter',
    name: 'OpenRouter',
    label: 'OpenRouter · Server Gateway',
    shortLabel: 'OpenRouter',
    defaultModel: 'Admin quản lý trên máy chủ',
    baseUrl: '/api/ai',
    kind: 'server',
    plan: 'server-managed',
    recommended: true,
    requiresApiKey: false,
    descriptionVi: 'OpenRouter duy nhất. API key nằm trong Vercel Environment Variables và không được gửi xuống trình duyệt.',
    descriptionEn: 'OpenRouter only. The API key stays in Vercel Environment Variables and is never exposed to the browser.',
    helpUrl: 'https://openrouter.ai/docs/quickstart',
    keyUrl: '',
    models: [],
  }),
]);

export const DEFAULT_PROVIDER = 'openrouter';

function safeStorage() {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

function normalizeScope(value = '') {
  return String(value || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'guest';
}

function getStorageScope() {
  return normalizeScope(safeStorage()?.getItem(AI_USER_SCOPE_KEY) || 'guest');
}

function readServerStatus() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage?.getItem(AI_SERVER_STATUS_KEY) || '';
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setServerAiStatus(status = {}) {
  if (typeof window === 'undefined') return status;
  const normalized = {
    configured: status.configured !== false,
    enabled: status.enabled !== false,
    model: String(status.model || ''),
    updatedAt: String(status.updatedAt || new Date().toISOString()),
  };
  try { window.sessionStorage?.setItem(AI_SERVER_STATUS_KEY, JSON.stringify(normalized)); } catch { /* optional cache */ }
  window.dispatchEvent(new CustomEvent('bes-ai-settings-updated', { detail: normalized }));
  return normalized;
}

export function getProviderInfo() {
  return PROVIDERS[0];
}

export function defaultConfigs() {
  const status = readServerStatus();
  return {
    openrouter: {
      apiKey: '__BRIAN_SERVER_GATEWAY__',
      model: status.model || PROVIDERS[0].defaultModel,
      baseUrl: '/api/ai',
      enabled: status.enabled !== false,
      serverManaged: true,
    },
  };
}

export function getAiSettingsScope() {
  return getStorageScope();
}

export function setAiStorageUser(user = null) {
  const storage = safeStorage();
  const scope = normalizeScope(user?.id || user?.email || 'guest');
  if (!storage) return scope;
  const previous = storage.getItem(AI_USER_SCOPE_KEY);
  storage.setItem(AI_USER_SCOPE_KEY, scope);
  if (previous !== scope && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
  }
  return scope;
}

export function getAiProvider() {
  return DEFAULT_PROVIDER;
}

export function setAiProvider() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
  return DEFAULT_PROVIDER;
}

export function getFallbackEnabled() {
  return false;
}

export function setFallbackEnabled() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
  return false;
}

export function getAiConfigs() {
  return defaultConfigs();
}

export function saveAiConfigs() {
  // Deliberately do not persist provider keys or endpoints in the browser.
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
  return defaultConfigs();
}

export function getActiveAiConfig() {
  const status = readServerStatus();
  return {
    provider: DEFAULT_PROVIDER,
    providerInfo: PROVIDERS[0],
    fallbackEnabled: false,
    apiKey: '__BRIAN_SERVER_GATEWAY__',
    model: status.model || PROVIDERS[0].defaultModel,
    baseUrl: '/api/ai',
    enabled: status.enabled !== false,
    configured: status.configured !== false,
    serverManaged: true,
  };
}

export function getProviderSummary() {
  const active = getActiveAiConfig();
  return {
    provider: DEFAULT_PROVIDER,
    providerName: 'OpenRouter · Server Gateway',
    model: active.model,
    hasKey: true,
    configured: active.configured,
    enabled: active.enabled,
    fallbackEnabled: false,
    serverManaged: true,
  };
}
