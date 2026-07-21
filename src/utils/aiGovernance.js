import { getAiRuntimeSnapshot } from './aiRuntimeManager.js';
import {
  getAiGovernanceCloudStatus,
  pullAiGovernanceCloudSettings,
  queueAiGovernanceCloudEvent,
  saveAiGovernanceCloudSettings,
  setAiGovernanceCloudUser,
} from './aiGovernanceCloud.js';

export const AI_GOVERNANCE_SETTINGS_KEY = 'bes-ai-governance-settings:v1';
export const AI_GOVERNANCE_USAGE_KEY = 'bes-ai-governance-usage:v2';
export const AI_GOVERNANCE_AUDIT_KEY = 'bes-ai-governance-audit:v1';
export const AI_GOVERNANCE_EVENT = 'bes-ai-governance-updated';

const MAX_AUDIT_ITEMS = 420;
const MAX_USAGE_DAYS = 45;
let currentUser = { id: 'guest', email: '', role: 'guest', name: 'Guest' };

export const DEFAULT_AI_GOVERNANCE = Object.freeze({
  schemaVersion: 5,
  enabled: true,
  allowActions: true,
  requireActionConfirmation: true,
  dailyRequestLimit: 120,
  dailyTokenBudget: 180000,
  maxOutputTokens: 8192,
  fairUse: {
    enabled: true,
    perUserDailyRequestLimit: 60,
    perUserDailyTokenBudget: 90000,
    warningPercent: 80,
    blockAtLimit: true,
    exemptAdmins: true,
  },
  privacy: {
    enabled: true,
    mode: 'mask',
    maskEmails: true,
    maskPhones: true,
    maskStudentIds: true,
    maskNationalIds: true,
    maskBirthDates: true,
    maskAddresses: true,
    maskNamedPeople: true,
    maskSecrets: true,
    scanAttachments: true,
    blockSensitiveImages: false,
    forceLocalForSensitive: false,
  },
  outputValidation: {
    enabled: true,
    validateJson: true,
    rejectEmpty: true,
    detectDuplicates: true,
    autoRepair: true,
    maxRepairAttempts: 1,
  },
  runtime: {
    enabled: true,
    maxConcurrent: 3,
    requestTimeoutMs: 175000,
    transientRetries: 0,
    retryBaseDelayMs: 650,
    dedupeInFlight: true,
    cacheEnabled: true,
    cacheTtlMs: 300000,
    cacheMaxEntries: 40,
    circuitBreakerEnabled: true,
    circuitFailureThreshold: 4,
    circuitFailureWindowMs: 120000,
    circuitCooldownMs: 45000,
  },
  actionTargets: {
    'word2graph': true,
    'textlab-activities': true,
    library: true,
    'current-app': true,
  },
  profiles: {
    chat: { label: 'Brian AI Chat', maxOutputTokens: 3200 },
    worksheet: { label: 'Teaching content', maxOutputTokens: 7200 },
    document: { label: 'Document analysis', maxOutputTokens: 8000 },
    administration: { label: 'School administration', maxOutputTokens: 4000 },
    diagnostic: { label: 'Provider connection test', maxOutputTokens: 128 },
    default: { label: 'Default', maxOutputTokens: 4800 },
  },
  updatedAt: '',
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeRead(key, fallback) {
  if (typeof window === 'undefined') return clone(fallback);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return clone(fallback);
    return JSON.parse(raw);
  } catch {
    return clone(fallback);
  }
}

function safeWrite(key, value) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(AI_GOVERNANCE_EVENT, { detail: { key, value } }));
    return true;
  } catch {
    return false;
  }
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeCountMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const next = {};
  Object.entries(value).slice(0, 240).forEach(([key, count]) => {
    const cleanKey = String(key || 'Unknown').slice(0, 160);
    next[cleanKey] = clampNumber(count, 0, 1000000000, 0);
  });
  return next;
}

function normalizeProfile(profile, fallback) {
  const source = profile && typeof profile === 'object' ? profile : {};
  return {
    label: String(source.label || fallback.label || 'AI profile').slice(0, 80),
    maxOutputTokens: clampNumber(source.maxOutputTokens, 32, 8192, fallback.maxOutputTokens || 2200),
  };
}

export function normalizeAiGovernanceSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const defaults = DEFAULT_AI_GOVERNANCE;
  const sourceSchema = Number(source.schemaVersion || 0);
  const legacyRuntime = sourceSchema < 5;
  const targets = { ...defaults.actionTargets };
  Object.keys(targets).forEach((key) => {
    if (typeof source.actionTargets?.[key] === 'boolean') targets[key] = source.actionTargets[key];
  });
  const profiles = {};
  Object.keys(defaults.profiles).forEach((key) => {
    profiles[key] = legacyRuntime ? normalizeProfile(defaults.profiles[key], defaults.profiles[key]) : normalizeProfile(source.profiles?.[key], defaults.profiles[key]);
  });
  const fairUseSource = source.fairUse && typeof source.fairUse === 'object' ? source.fairUse : {};
  const privacySource = source.privacy && typeof source.privacy === 'object' ? source.privacy : {};
  const validationSource = source.outputValidation && typeof source.outputValidation === 'object' ? source.outputValidation : {};
  const runtimeSource = source.runtime && typeof source.runtime === 'object' ? source.runtime : {};
  return {
    schemaVersion: 5,
    enabled: source.enabled !== false,
    allowActions: source.allowActions !== false,
    requireActionConfirmation: source.requireActionConfirmation !== false,
    dailyRequestLimit: clampNumber(source.dailyRequestLimit, 1, 5000, defaults.dailyRequestLimit),
    dailyTokenBudget: clampNumber(source.dailyTokenBudget, 1000, 5000000, defaults.dailyTokenBudget),
    maxOutputTokens: legacyRuntime ? defaults.maxOutputTokens : clampNumber(source.maxOutputTokens, 256, 8192, defaults.maxOutputTokens),
    fairUse: {
      ...defaults.fairUse,
      ...fairUseSource,
      enabled: fairUseSource.enabled !== false,
      perUserDailyRequestLimit: clampNumber(fairUseSource.perUserDailyRequestLimit, 1, 5000, defaults.fairUse.perUserDailyRequestLimit),
      perUserDailyTokenBudget: clampNumber(fairUseSource.perUserDailyTokenBudget, 1000, 5000000, defaults.fairUse.perUserDailyTokenBudget),
      warningPercent: clampNumber(fairUseSource.warningPercent, 50, 99, defaults.fairUse.warningPercent),
      blockAtLimit: fairUseSource.blockAtLimit !== false,
      exemptAdmins: fairUseSource.exemptAdmins !== false,
    },
    privacy: {
      ...defaults.privacy,
      ...privacySource,
      enabled: privacySource.enabled !== false,
      mode: ['mask', 'block', 'off'].includes(privacySource.mode) ? privacySource.mode : defaults.privacy.mode,
      forceLocalForSensitive: false,
      blockSensitiveImages: Boolean(privacySource.blockSensitiveImages),
    },
    outputValidation: {
      ...defaults.outputValidation,
      ...validationSource,
      enabled: validationSource.enabled !== false,
      validateJson: validationSource.validateJson !== false,
      rejectEmpty: validationSource.rejectEmpty !== false,
      detectDuplicates: validationSource.detectDuplicates !== false,
      autoRepair: validationSource.autoRepair !== false,
      maxRepairAttempts: clampNumber(validationSource.maxRepairAttempts, 0, 2, defaults.outputValidation.maxRepairAttempts),
    },
    runtime: {
      ...defaults.runtime,
      ...(legacyRuntime ? {} : runtimeSource),
      enabled: legacyRuntime ? defaults.runtime.enabled : runtimeSource.enabled !== false,
      maxConcurrent: legacyRuntime ? defaults.runtime.maxConcurrent : clampNumber(runtimeSource.maxConcurrent, 1, 6, defaults.runtime.maxConcurrent),
      requestTimeoutMs: legacyRuntime ? defaults.runtime.requestTimeoutMs : clampNumber(runtimeSource.requestTimeoutMs, 5000, 240000, defaults.runtime.requestTimeoutMs),
      transientRetries: legacyRuntime ? defaults.runtime.transientRetries : clampNumber(runtimeSource.transientRetries, 0, 3, defaults.runtime.transientRetries),
      retryBaseDelayMs: legacyRuntime ? defaults.runtime.retryBaseDelayMs : clampNumber(runtimeSource.retryBaseDelayMs, 100, 5000, defaults.runtime.retryBaseDelayMs),
      dedupeInFlight: legacyRuntime ? defaults.runtime.dedupeInFlight : runtimeSource.dedupeInFlight !== false,
      cacheEnabled: legacyRuntime ? defaults.runtime.cacheEnabled : runtimeSource.cacheEnabled !== false,
      cacheTtlMs: legacyRuntime ? defaults.runtime.cacheTtlMs : clampNumber(runtimeSource.cacheTtlMs, 10000, 3600000, defaults.runtime.cacheTtlMs),
      cacheMaxEntries: legacyRuntime ? defaults.runtime.cacheMaxEntries : clampNumber(runtimeSource.cacheMaxEntries, 5, 200, defaults.runtime.cacheMaxEntries),
      circuitBreakerEnabled: legacyRuntime ? defaults.runtime.circuitBreakerEnabled : runtimeSource.circuitBreakerEnabled !== false,
      circuitFailureThreshold: legacyRuntime ? defaults.runtime.circuitFailureThreshold : clampNumber(runtimeSource.circuitFailureThreshold, 2, 10, defaults.runtime.circuitFailureThreshold),
      circuitFailureWindowMs: legacyRuntime ? defaults.runtime.circuitFailureWindowMs : clampNumber(runtimeSource.circuitFailureWindowMs, 10000, 900000, defaults.runtime.circuitFailureWindowMs),
      circuitCooldownMs: legacyRuntime ? defaults.runtime.circuitCooldownMs : clampNumber(runtimeSource.circuitCooldownMs, 10000, 900000, defaults.runtime.circuitCooldownMs),
    },
    actionTargets: targets,
    profiles,
    updatedAt: String(source.updatedAt || ''),
  };
}

export function getAiGovernanceSettings() {
  return normalizeAiGovernanceSettings(safeRead(AI_GOVERNANCE_SETTINGS_KEY, DEFAULT_AI_GOVERNANCE));
}

export async function syncAiGovernanceSettingsFromCloud() {
  const localSettings = getAiGovernanceSettings();
  const remoteSettings = await pullAiGovernanceCloudSettings();
  if (!remoteSettings || typeof remoteSettings !== 'object') return null;
  if (currentUser.role === 'admin' && localSettings.updatedAt && !remoteSettings.updatedAt) {
    await saveAiGovernanceCloudSettings(localSettings);
    return localSettings;
  }
  const normalized = normalizeAiGovernanceSettings(remoteSettings);
  safeWrite(AI_GOVERNANCE_SETTINGS_KEY, normalized);
  return normalized;
}

export function saveAiGovernanceSettings(next) {
  const normalized = normalizeAiGovernanceSettings({ ...getAiGovernanceSettings(), ...(next || {}), updatedAt: new Date().toISOString() });
  safeWrite(AI_GOVERNANCE_SETTINGS_KEY, normalized);
  void saveAiGovernanceCloudSettings(normalized);
  appendAiAudit({
    type: 'settings',
    status: 'success',
    label: 'AI governance settings updated',
    detail: {
      enabled: normalized.enabled,
      allowActions: normalized.allowActions,
      dailyRequestLimit: normalized.dailyRequestLimit,
      dailyTokenBudget: normalized.dailyTokenBudget,
      fairUseEnabled: normalized.fairUse.enabled,
      perUserDailyRequestLimit: normalized.fairUse.perUserDailyRequestLimit,
      perUserDailyTokenBudget: normalized.fairUse.perUserDailyTokenBudget,
      privacyMode: normalized.privacy.mode,
      outputValidation: normalized.outputValidation.enabled,
      runtimeEnabled: normalized.runtime.enabled,
      maxConcurrent: normalized.runtime.maxConcurrent,
    },
  });
  return normalized;
}

export function resetAiGovernanceSettings() {
  const next = normalizeAiGovernanceSettings({ ...DEFAULT_AI_GOVERNANCE, updatedAt: new Date().toISOString() });
  safeWrite(AI_GOVERNANCE_SETTINGS_KEY, next);
  void saveAiGovernanceCloudSettings(next);
  appendAiAudit({ type: 'settings', status: 'success', label: 'AI governance settings reset', detail: {} });
  return next;
}

export function setAiGovernanceUser(user) {
  currentUser = user?.id || user?.email
    ? { id: user.id || user.email, email: user.email || '', role: user.role || 'teacher', name: user.name || user.email || 'User' }
    : { id: 'guest', email: '', role: 'guest', name: 'Guest' };
  setAiGovernanceCloudUser(currentUser);
  if (currentUser.role !== 'guest') void syncAiGovernanceSettingsFromCloud();
}

function getCurrentUserKey() {
  return String(currentUser?.email || currentUser?.id || 'guest').slice(0, 120);
}

function dayKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emptyDay() {
  return {
    attempts: 0,
    requests: 0,
    successes: 0,
    errors: 0,
    inputTokens: 0,
    outputTokens: 0,
    actions: 0,
    durationMs: 0,
    privacyRedactions: 0,
    validationFailures: 0,
    validationRepairs: 0,
    runtimeRetries: 0,
    runtimeCacheHits: 0,
    runtimeDedupeHits: 0,
    runtimeTimeouts: 0,
    runtimeQueueWaitMs: 0,
    providerCalls: 0,
    fallbacks: 0,
    providers: {},
    models: {},
    tasks: {},
    transports: {},
    users: {},
    userTokens: {},
    taskTokens: {},
  };
}

function normalizeUsage(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const days = source.days && typeof source.days === 'object' ? source.days : {};
  const cleanDays = {};
  Object.entries(days)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, MAX_USAGE_DAYS)
    .forEach(([date, item]) => {
      const fallback = emptyDay();
      cleanDays[date] = {
        attempts: clampNumber(item?.attempts, 0, 1000000, item?.requests || 0),
        requests: clampNumber(item?.requests, 0, 1000000, 0),
        successes: clampNumber(item?.successes, 0, 1000000, 0),
        errors: clampNumber(item?.errors, 0, 1000000, 0),
        inputTokens: clampNumber(item?.inputTokens, 0, 1000000000, 0),
        outputTokens: clampNumber(item?.outputTokens, 0, 1000000000, 0),
        actions: clampNumber(item?.actions, 0, 1000000, 0),
        durationMs: clampNumber(item?.durationMs, 0, 1000000000, 0),
        privacyRedactions: clampNumber(item?.privacyRedactions, 0, 1000000000, 0),
        validationFailures: clampNumber(item?.validationFailures, 0, 1000000000, 0),
        validationRepairs: clampNumber(item?.validationRepairs, 0, 1000000000, 0),
        runtimeRetries: clampNumber(item?.runtimeRetries, 0, 1000000000, 0),
        runtimeCacheHits: clampNumber(item?.runtimeCacheHits, 0, 1000000000, 0),
        runtimeDedupeHits: clampNumber(item?.runtimeDedupeHits, 0, 1000000000, 0),
        runtimeTimeouts: clampNumber(item?.runtimeTimeouts, 0, 1000000000, 0),
        runtimeQueueWaitMs: clampNumber(item?.runtimeQueueWaitMs, 0, 1000000000, 0),
        providerCalls: clampNumber(item?.providerCalls, 0, 1000000000, item?.requests || 0),
        fallbacks: clampNumber(item?.fallbacks, 0, 1000000000, 0),
        providers: normalizeCountMap(item?.providers || fallback.providers),
        models: normalizeCountMap(item?.models || fallback.models),
        tasks: normalizeCountMap(item?.tasks || fallback.tasks),
        transports: normalizeCountMap(item?.transports || fallback.transports),
        users: normalizeCountMap(item?.users || fallback.users),
        userTokens: normalizeCountMap(item?.userTokens || fallback.userTokens),
        taskTokens: normalizeCountMap(item?.taskTokens || fallback.taskTokens),
      };
    });
  return { schemaVersion: 4, days: cleanDays };
}

function readUsage() {
  return normalizeUsage(safeRead(AI_GOVERNANCE_USAGE_KEY, { schemaVersion: 4, days: {} }));
}

function writeUsage(usage) {
  return safeWrite(AI_GOVERNANCE_USAGE_KEY, normalizeUsage(usage));
}

function ensureDay(usage, date) {
  if (!usage.days[date]) usage.days[date] = emptyDay();
  return usage.days[date];
}

export function estimateTokens(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '');
  return Math.max(1, Math.ceil(text.length / 4));
}

function topEntries(map = {}, limit = 8) {
  return Object.entries(map || {})
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .slice(0, limit)
    .map(([id, value]) => ({ id, value: Number(value) || 0 }));
}

export function getAiUsageSummary(date = dayKey()) {
  const usage = readUsage();
  const day = ensureDay(usage, date);
  const settings = getAiGovernanceSettings();
  const tokenTotal = day.inputTokens + day.outputTokens;
  const userKey = getCurrentUserKey();
  const userRequests = Number(day.users?.[userKey] || 0);
  const userTokens = Number(day.userTokens?.[userKey] || 0);
  return {
    date,
    ...day,
    tokenTotal,
    requestLimit: settings.dailyRequestLimit,
    tokenBudget: settings.dailyTokenBudget,
    requestPercent: Math.min(100, Math.round((day.requests / Math.max(1, settings.dailyRequestLimit)) * 100)),
    tokenPercent: Math.min(100, Math.round((tokenTotal / Math.max(1, settings.dailyTokenBudget)) * 100)),
    currentUserKey: userKey,
    userRequests,
    userTokens,
    userRequestLimit: settings.fairUse.perUserDailyRequestLimit,
    userTokenBudget: settings.fairUse.perUserDailyTokenBudget,
    userRequestPercent: Math.min(100, Math.round((userRequests / Math.max(1, settings.fairUse.perUserDailyRequestLimit)) * 100)),
    userTokenPercent: Math.min(100, Math.round((userTokens / Math.max(1, settings.fairUse.perUserDailyTokenBudget)) * 100)),
  };
}

export function getAiObservabilitySummary(date = dayKey()) {
  const summary = getAiUsageSummary(date);
  const requestCount = Math.max(1, Number(summary.attempts) || 0);
  return {
    date,
    requestCount: summary.attempts,
    successRate: summary.attempts ? Math.round((summary.successes / summary.attempts) * 100) : 0,
    averageLatencyMs: summary.attempts ? Math.round(summary.durationMs / summary.attempts) : 0,
    averageQueueWaitMs: summary.attempts ? Math.round(summary.runtimeQueueWaitMs / summary.attempts) : 0,
    providerCallAmplification: summary.attempts ? Number((summary.providerCalls / summary.attempts).toFixed(2)) : 0,
    fallbackRate: summary.attempts ? Math.round((summary.fallbacks / summary.attempts) * 100) : 0,
    repairRate: summary.attempts ? Math.round((summary.validationRepairs / summary.attempts) * 100) : 0,
    retryRate: summary.attempts ? Math.round((summary.runtimeRetries / requestCount) * 100) : 0,
    topProviders: topEntries(summary.providers),
    topModels: topEntries(summary.models),
    topTasks: topEntries(summary.tasks),
    topTransports: topEntries(summary.transports),
    topUsers: topEntries(summary.users),
    topTaskTokens: topEntries(summary.taskTokens),
  };
}

export function getAiUsageDays() {
  const usage = readUsage();
  return Object.entries(usage.days)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, item]) => ({ date, ...item, tokenTotal: item.inputTokens + item.outputTokens }));
}

export function resolveAiProfile(options = {}) {
  const source = String(options.governanceProfile || options.profile || options.aiProfile || '').trim().toLowerCase();
  if (source) return source;
  const label = String(options.loadingLabel || options.aiLabel || '').toLowerCase();
  if (label.includes('worksheet') || label.includes('phiếu')) return 'worksheet';
  if (label.includes('document') || label.includes('tài liệu') || label.includes('đọc')) return 'document';
  if (label.includes('báo cáo') || label.includes('thông báo') || label.includes('hành chính')) return 'administration';
  if (label.includes('brian ai') || label.includes('chat')) return 'chat';
  return 'default';
}

function createGovernanceError(message, code, detail = {}) {
  const error = new Error(message);
  error.code = code;
  error.governance = detail;
  return error;
}

export function guardAiRequest(options = {}) {
  const settings = getAiGovernanceSettings();
  if (!settings.enabled) throw createGovernanceError('AI has been paused by the administrator.', 'AI_GOVERNANCE_DISABLED');

  const summary = getAiUsageSummary();
  if (summary.requests >= settings.dailyRequestLimit) {
    throw createGovernanceError(`Daily AI request limit reached (${settings.dailyRequestLimit}).`, 'AI_REQUEST_LIMIT', { requests: summary.requests, limit: settings.dailyRequestLimit });
  }

  const inputTokens = estimateTokens(options.prompt || '');
  if (summary.tokenTotal + inputTokens >= settings.dailyTokenBudget) {
    throw createGovernanceError(`Daily AI token budget reached (${settings.dailyTokenBudget}).`, 'AI_TOKEN_BUDGET', { tokens: summary.tokenTotal, incoming: inputTokens, budget: settings.dailyTokenBudget });
  }

  const fairUseApplies = settings.fairUse.enabled && !(settings.fairUse.exemptAdmins && currentUser.role === 'admin');
  if (fairUseApplies && settings.fairUse.blockAtLimit) {
    if (summary.userRequests >= settings.fairUse.perUserDailyRequestLimit) {
      throw createGovernanceError(`Daily AI request limit for this account reached (${settings.fairUse.perUserDailyRequestLimit}).`, 'AI_USER_REQUEST_LIMIT', { user: summary.currentUserKey, requests: summary.userRequests, limit: settings.fairUse.perUserDailyRequestLimit });
    }
    if (summary.userTokens + inputTokens >= settings.fairUse.perUserDailyTokenBudget) {
      throw createGovernanceError(`Daily AI token budget for this account reached (${settings.fairUse.perUserDailyTokenBudget}).`, 'AI_USER_TOKEN_BUDGET', { user: summary.currentUserKey, tokens: summary.userTokens, incoming: inputTokens, budget: settings.fairUse.perUserDailyTokenBudget });
    }
  }

  const profileKey = resolveAiProfile(options);
  const profile = settings.profiles[profileKey] || settings.profiles.default;
  const minimumOutputTokens = profileKey === 'diagnostic' ? 16 : 256;
  const requestedMax = clampNumber(options.maxOutputTokens, minimumOutputTokens, 8192, profile.maxOutputTokens);
  const cappedMaxOutputTokens = Math.min(requestedMax, settings.maxOutputTokens, profile.maxOutputTokens);
  const warningThreshold = settings.fairUse.warningPercent;
  const warnings = [];
  if (summary.requestPercent >= warningThreshold) warnings.push('global-request-budget');
  if (summary.tokenPercent >= warningThreshold) warnings.push('global-token-budget');
  if (fairUseApplies && summary.userRequestPercent >= warningThreshold) warnings.push('user-request-budget');
  if (fairUseApplies && summary.userTokenPercent >= warningThreshold) warnings.push('user-token-budget');

  return {
    settings,
    profileKey,
    taskId: String(options.aiTaskId || options.taskId || 'default').slice(0, 80),
    inputTokens,
    maxOutputTokens: cappedMaxOutputTokens,
    summary,
    warnings,
  };
}

function incrementMap(map, key, amount = 1, maxKeyLength = 160) {
  const normalized = String(key || 'Unknown').slice(0, maxKeyLength);
  map[normalized] = clampNumber(map[normalized], 0, 1000000000, 0) + Math.max(0, Math.round(Number(amount) || 0));
}

export function recordAiRequest({
  provider = '',
  model = '',
  prompt = '',
  result = '',
  durationMs = 0,
  success = true,
  error = '',
  profile = 'default',
  taskId = 'default',
  transport = 'browser-unified',
  operationId = '',
  privacy = {},
  validation = {},
  providerCalls = 1,
  fallbackUsed = false,
  attempts = [],
  runtime = {},
} = {}) {
  const usage = readUsage();
  const date = dayKey();
  const day = ensureDay(usage, date);
  const estimatedInputTokens = estimateTokens(prompt);
  // Failed upstream requests remain in diagnostics/audit, but must not consume
  // the user's successful-request or token budget and lock every AI tool.
  const inputTokens = success ? estimatedInputTokens : 0;
  const outputTokens = success ? estimateTokens(result) : 0;
  const tokenTotal = inputTokens + outputTokens;
  const normalizedProviderCalls = Math.max(0, Math.round(Number(providerCalls) || 0));
  const userKey = getCurrentUserKey();
  const cleanTaskId = String(taskId || profile || 'default').slice(0, 80);
  const cleanTransport = String(transport || 'unknown').slice(0, 80);

  day.attempts += 1;
  day.requests += success ? 1 : 0;
  day.successes += success ? 1 : 0;
  day.errors += success ? 0 : 1;
  day.inputTokens += inputTokens;
  day.outputTokens += outputTokens;
  day.durationMs += Math.max(0, Math.round(Number(durationMs) || 0));
  day.privacyRedactions += Math.max(0, Math.round(Number(privacy?.maskedCount) || 0));
  day.validationFailures += validation?.valid === false ? 1 : 0;
  day.validationRepairs += validation?.repaired ? 1 : 0;
  day.runtimeRetries += Math.max(0, Math.round(Number(runtime?.retries) || 0));
  day.runtimeCacheHits += runtime?.cacheHit ? 1 : 0;
  day.runtimeDedupeHits += runtime?.deduplicated ? 1 : 0;
  day.runtimeTimeouts += runtime?.timedOut ? 1 : 0;
  day.runtimeQueueWaitMs += Math.max(0, Math.round(Number(runtime?.queueWaitMs) || 0));
  day.providerCalls += normalizedProviderCalls;
  day.fallbacks += fallbackUsed ? 1 : 0;
  incrementMap(day.providers, provider || 'Unknown');
  incrementMap(day.models, model || 'Unknown');
  incrementMap(day.tasks, cleanTaskId);
  incrementMap(day.transports, cleanTransport);
  if (success) {
    incrementMap(day.users, userKey);
    incrementMap(day.userTokens, userKey, tokenTotal);
    incrementMap(day.taskTokens, cleanTaskId, tokenTotal);
  }
  writeUsage(usage);

  appendAiAudit({
    type: 'request',
    status: success ? 'success' : 'error',
    label: success ? 'AI request completed' : 'AI request failed',
    provider,
    model,
    profile,
    taskId: cleanTaskId,
    transport: cleanTransport,
    operationId,
    detail: {
      taskId: cleanTaskId,
      transport: cleanTransport,
      inputTokens: estimatedInputTokens,
      outputTokens,
      durationMs: Math.max(0, Math.round(Number(durationMs) || 0)),
      error: String(error || '').slice(0, 500),
      providerCalls: normalizedProviderCalls,
      fallbackUsed: Boolean(fallbackUsed),
      attempts: Array.isArray(attempts) ? attempts.slice(0, 8).map((item) => ({
        provider: String(item?.provider || '').slice(0, 80),
        model: String(item?.model || '').slice(0, 120),
        status: String(item?.status || '').slice(0, 30),
        errorType: String(item?.errorType || '').slice(0, 60),
        durationMs: Math.max(0, Math.round(Number(item?.durationMs) || 0)),
      })) : [],
      privacy: {
        applied: Boolean(privacy?.applied),
        riskLevel: privacy?.riskLevel || 'low',
        maskedCount: Number(privacy?.maskedCount) || 0,
        categories: Array.isArray(privacy?.categories) ? privacy.categories.slice(0, 12) : [],
      },
      validation: {
        valid: validation?.valid !== false,
        kind: validation?.kind || 'text',
        issueCount: Number(validation?.issueCount) || 0,
        issueCodes: Array.isArray(validation?.issueCodes) ? validation.issueCodes.slice(0, 12) : [],
        repairAttempted: Boolean(validation?.repairAttempted),
        repaired: Boolean(validation?.repaired),
      },
      runtime: {
        queueWaitMs: Math.max(0, Math.round(Number(runtime?.queueWaitMs) || 0)),
        retries: Math.max(0, Math.round(Number(runtime?.retries) || 0)),
        cacheHit: Boolean(runtime?.cacheHit),
        deduplicated: Boolean(runtime?.deduplicated),
        timedOut: Boolean(runtime?.timedOut),
        networkAttempts: Math.max(0, Math.round(Number(runtime?.networkAttempts) || 0)),
      },
    },
  });
  return { inputTokens, outputTokens, tokenTotal };
}

export function recordAiAction({ actionId = '', label = '', target = '', source = '', status = 'success', detail = {} } = {}) {
  const usage = readUsage();
  const day = ensureDay(usage, dayKey());
  day.actions += 1;
  incrementMap(day.users, getCurrentUserKey());
  writeUsage(usage);
  return appendAiAudit({ type: 'action', status, label: label || actionId || 'AI action', actionId, target, source, detail });
}

export function readAiAudit() {
  const list = safeRead(AI_GOVERNANCE_AUDIT_KEY, []);
  return Array.isArray(list) ? list.filter((item) => item && typeof item === 'object').slice(0, MAX_AUDIT_ITEMS) : [];
}

export function appendAiAudit(entry = {}) {
  const item = {
    id: String(entry.id || `ai-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    createdAt: Number(entry.createdAt) || Date.now(),
    type: String(entry.type || 'event'),
    status: ['success', 'error', 'blocked', 'cancelled', 'info'].includes(entry.status) ? entry.status : 'info',
    label: String(entry.label || 'AI event').slice(0, 180),
    provider: String(entry.provider || '').slice(0, 80),
    model: String(entry.model || '').slice(0, 120),
    profile: String(entry.profile || '').slice(0, 60),
    taskId: String(entry.taskId || entry.detail?.taskId || '').slice(0, 80),
    transport: String(entry.transport || entry.detail?.transport || '').slice(0, 80),
    operationId: String(entry.operationId || '').slice(0, 100),
    actionId: String(entry.actionId || '').slice(0, 100),
    target: String(entry.target || '').slice(0, 120),
    source: String(entry.source || '').slice(0, 120),
    actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role, name: currentUser.name },
    detail: entry.detail && typeof entry.detail === 'object' ? entry.detail : {},
  };
  const next = [item, ...readAiAudit().filter((existing) => existing.id !== item.id)].slice(0, MAX_AUDIT_ITEMS);
  safeWrite(AI_GOVERNANCE_AUDIT_KEY, next);
  queueAiGovernanceCloudEvent(item);
  return item;
}

export function clearAiAudit() {
  safeWrite(AI_GOVERNANCE_AUDIT_KEY, []);
}

export function resetAiUsage() {
  safeWrite(AI_GOVERNANCE_USAGE_KEY, { schemaVersion: 4, days: {} });
  appendAiAudit({ type: 'usage', status: 'success', label: 'AI usage counters reset', detail: {} });
}

export function exportAiGovernanceReport() {
  return {
    schema: 'bes-ai-governance-report/2.1',
    exportedAt: new Date().toISOString(),
    settings: getAiGovernanceSettings(),
    summary: getAiUsageSummary(),
    observability: getAiObservabilitySummary(),
    usage: getAiUsageDays(),
    audit: readAiAudit(),
    runtime: getAiRuntimeSnapshot(getAiGovernanceSettings().runtime),
    cloud: getAiGovernanceCloudStatus(),
  };
}

export function isAiActionAllowed(target) {
  const settings = getAiGovernanceSettings();
  return settings.enabled && settings.allowActions && settings.actionTargets?.[target] !== false;
}
