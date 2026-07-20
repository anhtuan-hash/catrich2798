export const AI_GOVERNANCE_SETTINGS_KEY = '';
export const AI_GOVERNANCE_USAGE_KEY = '';
export const AI_GOVERNANCE_AUDIT_KEY = '';
export const AI_GOVERNANCE_EVENT = '';
export const DEFAULT_AI_GOVERNANCE = Object.freeze({ enabled: false });
export function normalizeAiGovernanceSettings() { return DEFAULT_AI_GOVERNANCE; }
export function getAiGovernanceSettings() { return DEFAULT_AI_GOVERNANCE; }
export function saveAiGovernanceSettings() { return DEFAULT_AI_GOVERNANCE; }
export function resetAiGovernanceSettings() { return DEFAULT_AI_GOVERNANCE; }
export function setAiGovernanceUser() {}
export function estimateTokens() { return 0; }
export function getAiUsageSummary() { return { requests: 0, tokens: 0 }; }
export function getAiUsageDays() { return []; }
export function resolveAiProfile() { return { profileKey: 'removed', maxOutputTokens: 0 }; }
export function guardAiRequest() { const error = new Error('AI features removed'); error.code = 'AI_FEATURE_REMOVED'; throw error; }
export function recordAiRequest() {}
export function recordAiAction() {}
export function readAiAudit() { return []; }
export function appendAiAudit() {}
export function clearAiAudit() {}
export function resetAiUsage() {}
export function exportAiGovernanceReport() { return { removed: true }; }
export function isAiActionAllowed() { return false; }
