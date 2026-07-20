import { DEFAULT_PROVIDER, getActiveAiConfig } from './aiProviders.js';
export const AI_ROUTING_MODES = Object.freeze([{ id: 'server', label: 'OpenRouter Server Gateway', shortLabel: 'Server', description: 'Admin-managed OpenRouter model and quotas.' }]);
export function getRoutingModeInfo() { return AI_ROUTING_MODES[0]; }
export function analyzeAiRequest(options = {}) { return { profile: String(options.profile || 'default'), provider: DEFAULT_PROVIDER, serverManaged: true }; }
export function buildAiRoutingCandidates() { const active=getActiveAiConfig(); return [{ providerId: DEFAULT_PROVIDER, provider: DEFAULT_PROVIDER, model: active.model, baseUrl: '/api/ai', serverManaged: true }]; }
export function classifyAiError(error) { const status=Number(error?.status||0); if(status===429) return 'rate-limit'; if(status===401||status===403) return 'auth'; if(status>=500) return 'provider-unavailable'; return 'unknown'; }
export function shouldFallbackAiError() { return false; }
export function noteProviderHealth() {}
export function getRoutingDisplay() { return { mode: 'server', modeInfo: AI_ROUTING_MODES[0], provider: DEFAULT_PROVIDER }; }
