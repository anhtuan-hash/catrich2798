export const AI_ROUTING_MODES = [];
export function getRoutingModeInfo() { return null; }
export function analyzeAiRequest() { return { removed: true }; }
export function buildAiRoutingCandidates() { return []; }
export function classifyAiError() { return 'removed'; }
export function shouldFallbackAiError() { return false; }
export function noteProviderHealth() {}
export function getRoutingDisplay() { return { mode: 'removed', label: '' }; }
