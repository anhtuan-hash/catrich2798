export const AI_PROVIDER_KEY = '';
export const AI_CONFIGS_KEY = '';
export const AI_FALLBACK_KEY = '';
export const AI_USER_SCOPE_KEY = '';
export const PROVIDERS = [];
export const DEFAULT_PROVIDER = '';
export function getProviderInfo() { return { id: '', label: '', defaultModel: '', baseUrl: '', kind: 'removed', descriptionVi: '', descriptionEn: '' }; }
export function defaultConfigs() { return {}; }
export function getAiSettingsScope() { return 'removed'; }
export function setAiStorageUser() {}
export function getAiProvider() { return ''; }
export function setAiProvider() {}
export function getFallbackEnabled() { return false; }
export function setFallbackEnabled() {}
export function getAiConfigs() { return {}; }
export function saveAiConfigs() { return {}; }
export function getActiveAiConfig() { return { provider: '', apiKey: '', model: '', baseUrl: '' }; }
export function getProviderSummary() { return { hasKey: false, serverManaged: false, providerName: '', model: '', configuredCount: 0 }; }
