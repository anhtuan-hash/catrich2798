import { getProviderCatalogEntry } from '../data/aiProviderCatalog.js';

const STORAGE_KEY = 'bes-ai-provider-overrides-v1157';
const ROUTING_KEY = 'bes-ai-smart-routing-v1157';
const USER_SCOPE_KEY = 'bes-ai-user-scope';
const OPENROUTER_ID = 'openrouter';
const SERVER_KEY = '__OPENROUTER_SERVER_GATEWAY__';

function normalizeScope(value = '') {
  return String(value || 'guest').trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-').replace(/^-+|-+$/g, '') || 'guest';
}

function scopedStorageKey(key) {
  if (typeof window === 'undefined' || !window.localStorage) return key;
  const scope = normalizeScope(window.localStorage.getItem(USER_SCOPE_KEY) || 'guest');
  return `${key}:${scope}`;
}

function clearLegacySecrets() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const keys = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && (key === STORAGE_KEY || key.startsWith(`${STORAGE_KEY}:`) || key === ROUTING_KEY || key.startsWith(`${ROUTING_KEY}:`))) keys.push(key);
  }
  keys.forEach((key) => window.localStorage.removeItem(key));
}

function emitSettingsUpdated(detail = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  const payload = { source: 'v12.40.0', provider: OPENROUTER_ID, serverManaged: true, ...detail };
  window.dispatchEvent(new CustomEvent('bes-ai-settings-updated', { detail: payload }));
  window.dispatchEvent(new CustomEvent('bes-ai-routing-updated', { detail: payload }));
}

function serverConfig() {
  const info = getProviderCatalogEntry(OPENROUTER_ID);
  return {
    apiKey: SERVER_KEY,
    model: info.defaultModel,
    visionModel: info.defaultVisionModel,
    imageModel: info.defaultImageModel,
    baseUrl: '/api/ai',
    enabled: true,
    serverManaged: true,
    updatedAt: new Date().toISOString(),
    lastSuccessAt: '',
    lastError: '',
    lastErrorAt: '',
  };
}

export function getProviderOverrideState() {
  clearLegacySecrets();
  return { activeProvider: OPENROUTER_ID, configs: { openrouter: serverConfig() }, serverManaged: true, updatedAt: new Date().toISOString() };
}

export function getProviderOverrides() {
  return getProviderOverrideState().configs;
}

export function getProviderOverride() {
  return serverConfig();
}

export function saveProviderOverride() {
  clearLegacySecrets();
  emitSettingsUpdated({ action: 'server-managed-openrouter' });
  return serverConfig();
}

export function setActiveProviderOverride() {
  clearLegacySecrets();
  emitSettingsUpdated({ action: 'set-openrouter-active' });
  return OPENROUTER_ID;
}

export function removeProviderOverride() {
  clearLegacySecrets();
  emitSettingsUpdated({ action: 'clear-browser-provider-secrets' });
}

export function getRoutingPreferences() {
  clearLegacySecrets();
  return {
    mode: 'openrouter-task-aware',
    manualProvider: OPENROUTER_ID,
    manualModel: '',
    allowPaid: true,
    fallbackEnabled: false,
    fallbackOrder: [OPENROUTER_ID],
    serverManaged: true,
  };
}

export function saveRoutingPreferences() {
  clearLegacySecrets();
  emitSettingsUpdated({ action: 'server-managed-routing' });
  return getRoutingPreferences();
}

export function mergeAiConfigs() {
  return { openrouter: serverConfig() };
}

export function getEffectiveActiveProvider() {
  return OPENROUTER_ID;
}

export function getSmartProviderSummary() {
  const config = serverConfig();
  return {
    provider: OPENROUTER_ID,
    providerName: 'OpenRouter',
    model: config.model,
    mode: 'openrouter-task-aware',
    fallbackEnabled: false,
    configured: true,
    serverManaged: true,
  };
}

export function getStorageKeys() {
  return { providerOverrides: scopedStorageKey(STORAGE_KEY), routing: scopedStorageKey(ROUTING_KEY) };
}
