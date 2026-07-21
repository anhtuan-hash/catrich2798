import { PROVIDER_CATALOG, getProviderCatalogEntry, mergeProviderInfo } from '../data/aiProviderCatalog.js';

export const AI_PROVIDER_KEY = 'bes-ai-provider';
export const AI_CONFIGS_KEY = 'bes-ai-configs';
export const AI_FALLBACK_KEY = 'bes-ai-fallback-enabled';
export const AI_USER_SCOPE_KEY = 'bes-ai-user-scope';
export const DEFAULT_PROVIDER = 'openrouter';
export const PROVIDERS = PROVIDER_CATALOG;
export const SERVER_MANAGED_AI_KEY = '__OPENROUTER_SERVER_GATEWAY__';

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

function removeBrowserProviderSecrets() {
  if (typeof localStorage === 'undefined') return;
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && (/bes-ai-configs/i.test(key) || /aiProviderOverrides/i.test(key))) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(scopedKey(AI_PROVIDER_KEY), DEFAULT_PROVIDER);
  localStorage.setItem(scopedKey(AI_FALLBACK_KEY), 'false');
}

export function getProviderInfo() {
  return mergeProviderInfo('openrouter', getProviderCatalogEntry('openrouter'));
}

export function defaultConfigs() {
  const info = getProviderInfo();
  return {
    openrouter: {
      apiKey: SERVER_MANAGED_AI_KEY,
      model: info.defaultModel,
      visionModel: info.defaultVisionModel,
      imageModel: info.defaultImageModel,
      baseUrl: '/api/ai',
      enabled: true,
      serverManaged: true,
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
  removeBrowserProviderSecrets();
  if (oldScope !== scope && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
  return scope;
}

export function getAiProvider() {
  return DEFAULT_PROVIDER;
}

export function setAiProvider() {
  removeBrowserProviderSecrets();
  return DEFAULT_PROVIDER;
}

export function getFallbackEnabled() {
  return false;
}

export function setFallbackEnabled() {
  if (typeof localStorage !== 'undefined') localStorage.setItem(scopedKey(AI_FALLBACK_KEY), 'false');
  return false;
}

export function getAiConfigs() {
  removeBrowserProviderSecrets();
  return defaultConfigs();
}

export function saveAiConfigs() {
  removeBrowserProviderSecrets();
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bes-ai-settings-updated'));
  return defaultConfigs();
}

export function getActiveAiConfig() {
  const config = defaultConfigs().openrouter;
  return {
    provider: DEFAULT_PROVIDER,
    providerInfo: getProviderInfo(),
    fallbackEnabled: false,
    ...config,
  };
}

export function getProviderSummary() {
  const active = defaultConfigs().openrouter;
  return {
    provider: DEFAULT_PROVIDER,
    providerName: 'OpenRouter',
    model: active.model,
    // The browser cannot know whether the server key is present. Consumers must
    // use the authenticated /api/ai health check before enabling AI controls.
    hasKey: false,
    serverManaged: true,
    readinessRequired: true,
    fallbackEnabled: false,
  };
}
