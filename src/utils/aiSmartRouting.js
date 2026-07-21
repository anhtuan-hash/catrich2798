import { getProviderCatalogEntry } from '../data/aiProviderCatalog.js';
import { getRoutingPreferences } from './aiProviderOverrides.js';
import { isAiProviderCircuitOpen } from './aiRuntimeManager.js';

const HEALTH_KEY = 'bes-ai-provider-health-v1157';
const OPENROUTER_ID = 'openrouter';

export const AI_ROUTING_MODES = [
  { id: 'openrouter', label: 'OpenRouter thống nhất', shortLabel: 'OpenRouter', description: 'Mọi tác vụ AI dùng chung một OpenRouter API key.' },
];

function safeParse(value, fallback) {
  try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
}

function readHealth() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  return safeParse(window.localStorage.getItem(HEALTH_KEY), {});
}

function writeHealth(value) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(HEALTH_KEY, JSON.stringify(value));
}

export function getRoutingModeInfo() {
  return AI_ROUTING_MODES[0];
}

export function analyzeAiRequest(options = {}) {
  const attachments = Array.isArray(options.attachments) ? options.attachments : [];
  const hasImages = attachments.some((item) => String(item?.mimeType || '').startsWith('image/'));
  return {
    requiresVision: Boolean(options.requiresVision || hasImages),
    requiresImageGeneration: Boolean(options.requiresImageGeneration),
    requiresLongContext: String(options.prompt || '').length > 16000,
    requiresJson: options.responseMimeType === 'application/json' || options.outputContract?.kind === 'json',
    privacySensitive: Boolean(options.privacySensitive),
  };
}

export function buildAiRoutingCandidates({ legacyConfigs = {}, options = {} } = {}) {
  const provider = getProviderCatalogEntry(OPENROUTER_ID);
  const config = legacyConfigs.openrouter || {};
  const apiKey = String(options.apiKey || config.apiKey || '').trim();
  if (!apiKey) return [];
  const requirements = analyzeAiRequest(options);
  const preferredModel = String(
    options.manualModel
      || options.model
      || (requirements.requiresImageGeneration ? config.imageModel : '')
      || (requirements.requiresVision ? config.visionModel : '')
      || config.model
      || provider.defaultModel,
  ).trim();
  return [{
    id: OPENROUTER_ID,
    provider,
    config: { ...config, enabled: true },
    apiKey,
    model: preferredModel || provider.defaultModel,
    baseUrl: String(options.baseUrl || config.baseUrl || provider.baseUrl).replace(/\/+$/, ''),
    rank: 1,
    score: 100,
    requirements,
    circuitOpen: isAiProviderCircuitOpen(OPENROUTER_ID, options.runtimeSettings),
  }];
}

export function classifyAiError(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();
  if (code.includes('circuit')) return 'circuit-open';
  if (code.includes('timeout') || message.includes('timeout') || message.includes('timed out')) return 'timeout';
  if (status === 401 || status === 403 || /api key|unauthor|forbidden|authentication/.test(message)) return 'auth';
  if (status === 429 || /rate limit|too many requests/.test(message)) return 'rate-limit';
  if (status >= 500 || /overloaded|capacity|temporarily unavailable/.test(message)) return 'capacity';
  if (/credit|billing|can only afford/.test(message)) return 'credit';
  if (/network|failed to fetch|load failed|cors/.test(message)) return 'network';
  if (/validation|invalid json|output contract/.test(message)) return 'validation';
  return 'unknown';
}

export function shouldFallbackAiError() {
  return false;
}

export function noteProviderHealth(_providerId, { success = false, error = '' } = {}) {
  const health = readHealth();
  const previous = health.openrouter || {};
  const next = {
    ...health,
    openrouter: {
      successAt: success ? Date.now() : previous.successAt || 0,
      failureAt: success ? previous.failureAt || 0 : Date.now(),
      failures: success ? 0 : Number(previous.failures || 0) + 1,
      lastError: success ? '' : String(error || '').slice(0, 240),
    },
  };
  writeHealth(next);
  return next.openrouter;
}

export function getRoutingDisplay() {
  const prefs = getRoutingPreferences();
  return {
    mode: 'openrouter',
    modeInfo: AI_ROUTING_MODES[0],
    manualProvider: OPENROUTER_ID,
    manualModel: prefs.manualModel || '',
    allowPaid: true,
    fallbackEnabled: false,
    fallbackOrder: [OPENROUTER_ID],
  };
}
