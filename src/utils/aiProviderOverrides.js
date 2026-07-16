import { getProviderCatalogEntry } from '../data/aiProviderCatalog.js';

const STORAGE_KEY = 'bes-ai-provider-overrides-v1157';
const ROUTING_KEY = 'bes-ai-smart-routing-v1157';
const USER_SCOPE_KEY = 'bes-ai-user-scope';
const MIGRATION_KEY = 'bes-openrouter-only-migration-v1239';
const OPENROUTER_ID = 'openrouter';
const DEFAULT_ROUTING = {
  mode: 'openrouter',
  manualProvider: OPENROUTER_ID,
  manualModel: '',
  allowPaid: true,
  fallbackEnabled: false,
  fallbackOrder: [OPENROUTER_ID],
};

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizeScope(value = '') {
  return String(value || 'guest').trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-').replace(/^-+|-+$/g, '') || 'guest';
}

function scopedStorageKey(key) {
  if (typeof window === 'undefined' || !window.localStorage) return key;
  const scope = normalizeScope(window.localStorage.getItem(USER_SCOPE_KEY) || 'guest');
  return `${key}:${scope}`;
}

function readStore(key, fallback) {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  const scopedKey = scopedStorageKey(key);
  const scopedRaw = window.localStorage.getItem(scopedKey);
  if (scopedRaw) return safeParse(scopedRaw, fallback);
  const legacyRaw = window.localStorage.getItem(key);
  const migrated = legacyRaw ? safeParse(legacyRaw, fallback) : fallback;
  window.localStorage.setItem(scopedKey, JSON.stringify(migrated));
  if (scopedKey !== key) window.localStorage.removeItem(key);
  return migrated;
}

function writeStore(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(scopedStorageKey(key), JSON.stringify(value));
}

function emitSettingsUpdated(detail = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  const payload = { source: 'v12.39.0', provider: OPENROUTER_ID, ...detail };
  window.dispatchEvent(new CustomEvent('bes-ai-settings-updated', { detail: payload }));
  window.dispatchEvent(new CustomEvent('bes-ai-routing-updated', { detail: payload }));
}

function normalizeOpenRouterConfig(input = {}) {
  const info = getProviderCatalogEntry(OPENROUTER_ID);
  return {
    apiKey: String(input.apiKey || '').trim().replace(/^Bearer\s+/i, ''),
    model: String(input.model || info.defaultModel).trim() || info.defaultModel,
    visionModel: String(input.visionModel || info.defaultVisionModel).trim() || info.defaultVisionModel,
    imageModel: String(input.imageModel || info.defaultImageModel).trim() || info.defaultImageModel,
    baseUrl: String(input.baseUrl || info.baseUrl).trim().replace(/\/+$/, '') || info.baseUrl,
    enabled: true,
    updatedAt: input.updatedAt || new Date().toISOString(),
    lastSuccessAt: input.lastSuccessAt || '',
    lastError: input.lastError || '',
    lastErrorAt: input.lastErrorAt || '',
  };
}

function migrateToOpenRouterOnly(rawState = {}) {
  const configs = rawState?.configs && typeof rawState.configs === 'object' ? rawState.configs : {};
  const direct = configs.openrouter || {};
  let apiKey = String(direct.apiKey || '').trim();
  if (!apiKey) {
    const legacyWithKey = Object.values(configs).find((item) => String(item?.apiKey || '').trim());
    if (legacyWithKey && String(rawState.activeProvider || '') === OPENROUTER_ID) apiKey = String(legacyWithKey.apiKey || '').trim();
  }
  return {
    activeProvider: OPENROUTER_ID,
    configs: { openrouter: normalizeOpenRouterConfig({ ...direct, apiKey }) },
    migrations: { ...(rawState.migrations || {}), [MIGRATION_KEY]: true },
    updatedAt: new Date().toISOString(),
  };
}

export function getProviderOverrideState() {
  const raw = readStore(STORAGE_KEY, {});
  const migrated = migrateToOpenRouterOnly(raw);
  if (JSON.stringify(raw) !== JSON.stringify(migrated)) writeStore(STORAGE_KEY, migrated);
  return migrated;
}

export function getProviderOverrides() {
  return getProviderOverrideState().configs;
}

export function getProviderOverride() {
  return getProviderOverrides().openrouter || normalizeOpenRouterConfig();
}

export function saveProviderOverride(_providerId, patch = {}, { activate = true } = {}) {
  const current = getProviderOverrideState();
  const nextConfig = normalizeOpenRouterConfig({ ...current.configs.openrouter, ...patch });
  const next = {
    ...current,
    activeProvider: activate ? OPENROUTER_ID : current.activeProvider,
    configs: { openrouter: nextConfig },
    updatedAt: new Date().toISOString(),
  };
  writeStore(STORAGE_KEY, next);
  emitSettingsUpdated({ action: 'save-openrouter' });
  return nextConfig;
}

export function setActiveProviderOverride() {
  const current = getProviderOverrideState();
  writeStore(STORAGE_KEY, { ...current, activeProvider: OPENROUTER_ID, updatedAt: new Date().toISOString() });
  emitSettingsUpdated({ action: 'set-openrouter-active' });
  return OPENROUTER_ID;
}

export function removeProviderOverride() {
  const empty = normalizeOpenRouterConfig({ apiKey: '' });
  const current = getProviderOverrideState();
  writeStore(STORAGE_KEY, { ...current, activeProvider: OPENROUTER_ID, configs: { openrouter: empty }, updatedAt: new Date().toISOString() });
  emitSettingsUpdated({ action: 'clear-openrouter-key' });
}

export function getRoutingPreferences() {
  const stored = readStore(ROUTING_KEY, {});
  const next = {
    ...DEFAULT_ROUTING,
    manualModel: String(stored.manualModel || ''),
    mode: 'openrouter',
    manualProvider: OPENROUTER_ID,
    fallbackEnabled: false,
    fallbackOrder: [OPENROUTER_ID],
  };
  writeStore(ROUTING_KEY, next);
  return next;
}

export function saveRoutingPreferences(patch = {}) {
  const current = getRoutingPreferences();
  const next = {
    ...current,
    ...patch,
    mode: 'openrouter',
    manualProvider: OPENROUTER_ID,
    fallbackEnabled: false,
    fallbackOrder: [OPENROUTER_ID],
    updatedAt: new Date().toISOString(),
  };
  writeStore(ROUTING_KEY, next);
  emitSettingsUpdated({ action: 'save-openrouter-routing' });
  return next;
}

export function mergeAiConfigs(legacyConfigs = {}) {
  const stored = getProviderOverride();
  const legacy = legacyConfigs?.openrouter || {};
  return { openrouter: normalizeOpenRouterConfig({ ...legacy, ...stored, apiKey: stored.apiKey || legacy.apiKey || '' }) };
}

export function getEffectiveActiveProvider() {
  return OPENROUTER_ID;
}

export function getSmartProviderSummary(legacy = {}) {
  const config = getProviderOverride();
  return {
    provider: OPENROUTER_ID,
    providerName: 'OpenRouter',
    model: config.model || legacy.model || 'openrouter/free',
    mode: 'openrouter',
    fallbackEnabled: false,
    configured: Boolean(config.apiKey),
  };
}

export function getStorageKeys() {
  return { providerOverrides: STORAGE_KEY, routing: ROUTING_KEY };
}
