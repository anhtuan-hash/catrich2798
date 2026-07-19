import { PROVIDER_CATALOG, getProviderCatalogEntry } from '../data/aiProviderCatalog.js';

const STORAGE_KEY = 'bes-ai-provider-overrides-v1157';
const ROUTING_KEY = 'bes-ai-smart-routing-v1157';

const DEFAULT_ROUTING = {
  mode: 'smart',
  manualProvider: '',
  manualModel: '',
  allowPaid: false,
  fallbackEnabled: true,
  fallbackOrder: ['cerebras', 'groq', 'gemini', 'mistral', 'openrouter', 'github-models', 'cohere', 'huggingface', 'nvidia', 'sambanova', 'vercel', 'ollama', 'lmstudio', 'localai'],
};

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function readStore(key, fallback) {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  return safeParse(window.localStorage.getItem(key) || '', fallback);
}

function writeStore(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function emitSettingsUpdated(detail = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent('bes-ai-settings-updated', { detail: { source: 'v11.5.7', ...detail } }));
  window.dispatchEvent(new CustomEvent('bes-ai-routing-updated', { detail: { source: 'v11.5.7', ...detail } }));
}

export function getProviderOverrideState() {
  const state = readStore(STORAGE_KEY, {});
  return {
    activeProvider: String(state.activeProvider || ''),
    configs: state.configs && typeof state.configs === 'object' ? state.configs : {},
    updatedAt: state.updatedAt || '',
  };
}

export function getProviderOverrides() {
  return getProviderOverrideState().configs;
}

export function getProviderOverride(providerId) {
  return getProviderOverrides()[providerId] || {};
}

export function saveProviderOverride(providerId, patch = {}, { activate = true } = {}) {
  const id = String(providerId || '').trim();
  if (!id) throw new Error('Thiếu mã provider.');
  const current = getProviderOverrideState();
  const previous = current.configs[id] || {};
  const nextConfig = {
    ...previous,
    ...patch,
    apiKey: String(patch.apiKey ?? previous.apiKey ?? '').trim().replace(/^Bearer\s+/i, ''),
    model: String(patch.model ?? previous.model ?? getProviderCatalogEntry(id)?.defaultModel ?? '').trim(),
    baseUrl: String(patch.baseUrl ?? previous.baseUrl ?? getProviderCatalogEntry(id)?.baseUrl ?? '').trim().replace(/\/+$/, ''),
    enabled: patch.enabled ?? previous.enabled ?? true,
    updatedAt: new Date().toISOString(),
  };
  const next = {
    activeProvider: activate ? id : current.activeProvider,
    configs: { ...current.configs, [id]: nextConfig },
    updatedAt: new Date().toISOString(),
  };
  writeStore(STORAGE_KEY, next);
  emitSettingsUpdated({ provider: id, action: 'save-provider' });
  return nextConfig;
}

export function setActiveProviderOverride(providerId) {
  const id = String(providerId || '').trim();
  const current = getProviderOverrideState();
  writeStore(STORAGE_KEY, { ...current, activeProvider: id, updatedAt: new Date().toISOString() });
  emitSettingsUpdated({ provider: id, action: 'set-active-provider' });
  return id;
}

export function removeProviderOverride(providerId) {
  const id = String(providerId || '').trim();
  const current = getProviderOverrideState();
  const nextConfigs = { ...current.configs };
  delete nextConfigs[id];
  writeStore(STORAGE_KEY, {
    ...current,
    activeProvider: current.activeProvider === id ? '' : current.activeProvider,
    configs: nextConfigs,
    updatedAt: new Date().toISOString(),
  });
  emitSettingsUpdated({ provider: id, action: 'remove-provider' });
}

export function getRoutingPreferences() {
  const stored = readStore(ROUTING_KEY, {});
  const order = Array.isArray(stored.fallbackOrder) ? stored.fallbackOrder.filter((id) => PROVIDER_CATALOG.some((provider) => provider.id === id)) : [];
  return {
    ...DEFAULT_ROUTING,
    ...stored,
    fallbackOrder: [...order, ...DEFAULT_ROUTING.fallbackOrder.filter((id) => !order.includes(id))],
  };
}

export function saveRoutingPreferences(patch = {}) {
  const current = getRoutingPreferences();
  const next = {
    ...current,
    ...patch,
    fallbackOrder: Array.isArray(patch.fallbackOrder) ? [...new Set(patch.fallbackOrder)] : current.fallbackOrder,
    updatedAt: new Date().toISOString(),
  };
  writeStore(ROUTING_KEY, next);
  emitSettingsUpdated({ action: 'save-routing', routing: next });
  return next;
}

export function mergeAiConfigs(legacyConfigs = {}) {
  const overrides = getProviderOverrides();
  const merged = { ...(legacyConfigs || {}) };
  for (const provider of PROVIDER_CATALOG) {
    const legacy = merged[provider.id] || {};
    const override = overrides[provider.id] || {};
    merged[provider.id] = {
      ...legacy,
      ...override,
      model: override.model || legacy.model || provider.defaultModel,
      baseUrl: override.baseUrl || legacy.baseUrl || provider.baseUrl,
      apiKey: override.apiKey ?? legacy.apiKey ?? '',
      enabled: override.enabled ?? legacy.enabled ?? true,
    };
  }
  return merged;
}

export function getEffectiveActiveProvider(legacyProvider = '') {
  const state = getProviderOverrideState();
  const routing = getRoutingPreferences();
  if (routing.mode === 'manual' && routing.manualProvider) return routing.manualProvider;
  return state.activeProvider || legacyProvider || 'gemini';
}

export function getSmartProviderSummary(legacy = {}) {
  const state = getProviderOverrideState();
  const routing = getRoutingPreferences();
  const providerId = getEffectiveActiveProvider(legacy.provider || legacy.id || '');
  const provider = getProviderCatalogEntry(providerId);
  const config = state.configs[providerId] || {};
  const model = routing.mode === 'manual' && routing.manualModel ? routing.manualModel : (config.model || legacy.model || provider.defaultModel);
  const hasKey = provider.requiresApiKey === false || Boolean(String(config.apiKey || legacy.apiKey || '').trim());
  return {
    provider: providerId,
    providerName: provider.label,
    model,
    hasKey,
    routingMode: routing.mode,
    modeLabel: routing.mode,
  };
}

export function getStorageKeys() {
  return { providerOverrides: STORAGE_KEY, routing: ROUTING_KEY };
}
