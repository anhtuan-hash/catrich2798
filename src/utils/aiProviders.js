import { PROVIDER_CATALOG, getProviderCatalogEntry, mergeProviderInfo } from '../data/aiProviderCatalog.js';
import { getProviderOverride, mergeAiConfigs, saveProviderOverride, setActiveProviderOverride } from './aiProviderOverrides.js';

export const AI_PROVIDER_KEY = 'bes-ai-provider';
export const AI_CONFIGS_KEY = 'bes-ai-configs';
export const AI_FALLBACK_KEY = 'bes-ai-fallback-enabled';
export const AI_USER_SCOPE_KEY = 'bes-ai-user-scope';
export const DEFAULT_PROVIDER = 'openrouter';
export const PROVIDERS = PROVIDER_CATALOG;

function normalizeScope(value = '') {
  return String(value || 'guest').trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-').replace(/^-+|-+$/g, '') || 'guest';
}

function getStorageScope() {
  if (typeof localStorage === 'undefined') return 'guest';
  return normalizeScope(localStorage.getItem(AI_USER_SCOPE_KEY) || 'guest');
}

function scopedKey(key) {
  return `${key}:${getStorageScope()}`;
}

function readLegacyOpenRouter() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const scoped = JSON.parse(localStorage.getItem(scopedKey(AI_CONFIGS_KEY)) || '{}');
    const legacy = JSON.parse(localStorage.getItem(AI_CONFIGS_KEY) || '{}');
    return scoped?.openrouter || legacy?.openrouter || {};
  } catch {
    return {};
  }
}

export function getProviderInfo() {
  return mergeProviderInfo('openrouter', getProviderCatalogEntry('openrouter'));
}

export function defaultConfigs() {
  const info = getProviderInfo();
  return {
    openrouter: {
      apiKey: '',
      model: info.defaultModel,
      visionModel: info.defaultVisionModel,
      imageModel: info.defaultImageModel,
      baseUrl: info.baseUrl,
      enabled: true,
    },
  };
}

export function getAiSettingsScope() {
  return getStorageScope();
}

export function setAiStorageUser(user = null) {
  if (typeof localStorage === 'undefined') return 'guest';
  const scope = normalizeScope(user?.id || user?.email || 'guest');
  const oldScope = localStorage.getItem(AI_USER_SCOPE_KEY);
  localStorage.setItem(AI_USER_SCOPE_KEY, scope);
  if (oldScope !== scope && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
  return scope;
}

export function getAiProvider() {
  return DEFAULT_PROVIDER;
}

export function setAiProvider() {
  if (typeof localStorage !== 'undefined') localStorage.setItem(scopedKey(AI_PROVIDER_KEY), DEFAULT_PROVIDER);
  setActiveProviderOverride(DEFAULT_PROVIDER);
  return DEFAULT_PROVIDER;
}

export function getFallbackEnabled() {
  return false;
}

export function setFallbackEnabled() {
  if (typeof localStorage !== 'undefined') localStorage.setItem(scopedKey(AI_FALLBACK_KEY), 'false');
  return false;
}


function persistOpenRouterOnly(config = {}) {
  if (typeof localStorage === 'undefined') return;
  const payload = { openrouter: { ...defaultConfigs().openrouter, ...config, enabled: true } };
  localStorage.setItem(scopedKey(AI_CONFIGS_KEY), JSON.stringify(payload));
  localStorage.setItem(scopedKey(AI_PROVIDER_KEY), DEFAULT_PROVIDER);
  localStorage.setItem(scopedKey(AI_FALLBACK_KEY), 'false');
  localStorage.removeItem(AI_CONFIGS_KEY);
  localStorage.removeItem(AI_PROVIDER_KEY);
  localStorage.removeItem(AI_FALLBACK_KEY);
}

export function getAiConfigs() {
  const defaults = defaultConfigs();
  const legacy = readLegacyOpenRouter();
  const merged = mergeAiConfigs({ openrouter: { ...defaults.openrouter, ...legacy } });
  const result = { openrouter: { ...defaults.openrouter, ...merged.openrouter, enabled: true } };
  persistOpenRouterOnly(result.openrouter);
  return result;
}

export function saveAiConfigs(configs = {}) {
  const patch = configs.openrouter || configs || {};
  const saved = saveProviderOverride('openrouter', patch, { activate: true });
  const result = { openrouter: saved };
  persistOpenRouterOnly(saved);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
  return result;
}

export function getActiveAiConfig() {
  const config = getAiConfigs().openrouter;
  return {
    provider: DEFAULT_PROVIDER,
    providerInfo: getProviderInfo(),
    fallbackEnabled: false,
    ...config,
  };
}

export function getProviderSummary() {
  const active = getAiConfigs().openrouter;
  return {
    provider: DEFAULT_PROVIDER,
    providerName: 'OpenRouter',
    model: active.model || 'openrouter/free',
    hasKey: Boolean(String(active.apiKey || '').trim()),
    fallbackEnabled: false,
  };
}
