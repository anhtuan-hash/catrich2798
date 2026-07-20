import { DEFAULT_PROVIDER, getAiConfigs, getActiveAiConfig } from './aiProviders.js';

const ROUTING_KEY = 'bes-ai-routing-server-only';
const DEFAULT_ROUTING = Object.freeze({ mode: 'server', manualProvider: DEFAULT_PROVIDER, manualModel: '', fallbackOrder: [DEFAULT_PROVIDER], providerHealth: {} });

export function getProviderOverrideState() { return { activeProvider: DEFAULT_PROVIDER, overrides: {} }; }
export function getProviderOverrides() { return {}; }
export function getProviderOverride() { return null; }
export function saveProviderOverride() { return getProviderOverrideState(); }
export function setActiveProviderOverride() { return DEFAULT_PROVIDER; }
export function removeProviderOverride() { return true; }
export function getRoutingPreferences() { return { ...DEFAULT_ROUTING }; }
export function saveRoutingPreferences() { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bes-ai-routing-updated')); return getRoutingPreferences(); }
export function mergeAiConfigs() { return getAiConfigs(); }
export function getEffectiveActiveProvider() { return DEFAULT_PROVIDER; }
export function getSmartProviderSummary() { const active=getActiveAiConfig(); return { provider: DEFAULT_PROVIDER, providerName: 'OpenRouter · Server Gateway', model: active.model, hasKey: true, configured: active.configured, enabled: active.enabled, serverManaged: true, routingMode: 'server' }; }
export function getStorageKeys() { return { routing: ROUTING_KEY }; }
