export const AI_GOVERNANCE_SETTINGS_KEY = 'bes-ai-governance-settings:v1';
export const AI_GOVERNANCE_USAGE_KEY = 'bes-ai-governance-usage:v1';
export const AI_GOVERNANCE_AUDIT_KEY = 'bes-ai-governance-audit:v1';
export const AI_GOVERNANCE_EVENT = 'bes-ai-governance-updated';

const MAX_AUDIT_ITEMS = 360;
const MAX_USAGE_DAYS = 45;
let currentUser = { id: 'guest', email: '', role: 'guest', name: 'Guest' };

export const DEFAULT_AI_GOVERNANCE = Object.freeze({
  schemaVersion: 1,
  enabled: true,
  allowActions: true,
  requireActionConfirmation: true,
  dailyRequestLimit: 120,
  dailyTokenBudget: 180000,
  maxOutputTokens: 2800,
  actionTargets: {
    'worksheet-factory': true,
    'exam-studio': true,
    'word2graph': true,
    'textlab-activities': true,
    library: true,
    'current-app': true,
  },
  profiles: {
    chat: { label: 'Brian AI Chat', maxOutputTokens: 2400 },
    worksheet: { label: 'Worksheet Factory', maxOutputTokens: 3200 },
    document: { label: 'Document analysis', maxOutputTokens: 2800 },
    administration: { label: 'School administration', maxOutputTokens: 1800 },
    diagnostic: { label: 'Provider connection test', maxOutputTokens: 64 },
    default: { label: 'Default', maxOutputTokens: 2200 },
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
  const targets = { ...defaults.actionTargets };
  Object.keys(targets).forEach((key) => {
    if (typeof source.actionTargets?.[key] === 'boolean') targets[key] = source.actionTargets[key];
  });
  const profiles = {};
  Object.keys(defaults.profiles).forEach((key) => {
    profiles[key] = normalizeProfile(source.profiles?.[key], defaults.profiles[key]);
  });
  return {
    schemaVersion: 1,
    enabled: source.enabled !== false,
    allowActions: source.allowActions !== false,
    requireActionConfirmation: source.requireActionConfirmation !== false,
    dailyRequestLimit: clampNumber(source.dailyRequestLimit, 1, 5000, defaults.dailyRequestLimit),
    dailyTokenBudget: clampNumber(source.dailyTokenBudget, 1000, 5000000, defaults.dailyTokenBudget),
    maxOutputTokens: clampNumber(source.maxOutputTokens, 256, 8192, defaults.maxOutputTokens),
    actionTargets: targets,
    profiles,
    updatedAt: String(source.updatedAt || ''),
  };
}

export function getAiGovernanceSettings() {
  return normalizeAiGovernanceSettings(safeRead(AI_GOVERNANCE_SETTINGS_KEY, DEFAULT_AI_GOVERNANCE));
}

export function saveAiGovernanceSettings(next) {
  const normalized = normalizeAiGovernanceSettings({ ...getAiGovernanceSettings(), ...(next || {}), updatedAt: new Date().toISOString() });
  safeWrite(AI_GOVERNANCE_SETTINGS_KEY, normalized);
  appendAiAudit({
    type: 'settings',
    status: 'success',
    label: 'AI governance settings updated',
    detail: { enabled: normalized.enabled, allowActions: normalized.allowActions, dailyRequestLimit: normalized.dailyRequestLimit, dailyTokenBudget: normalized.dailyTokenBudget },
  });
  return normalized;
}

export function resetAiGovernanceSettings() {
  const next = normalizeAiGovernanceSettings({ ...DEFAULT_AI_GOVERNANCE, updatedAt: new Date().toISOString() });
  safeWrite(AI_GOVERNANCE_SETTINGS_KEY, next);
  appendAiAudit({ type: 'settings', status: 'success', label: 'AI governance settings reset', detail: {} });
  return next;
}

export function setAiGovernanceUser(user) {
  currentUser = user?.id || user?.email
    ? { id: user.id || user.email, email: user.email || '', role: user.role || 'teacher', name: user.name || user.email || 'User' }
    : { id: 'guest', email: '', role: 'guest', name: 'Guest' };
}

function dayKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeUsage(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const days = source.days && typeof source.days === 'object' ? source.days : {};
  const cleanDays = {};
  Object.entries(days)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, MAX_USAGE_DAYS)
    .forEach(([date, item]) => {
      cleanDays[date] = {
        requests: clampNumber(item?.requests, 0, 1000000, 0),
        successes: clampNumber(item?.successes, 0, 1000000, 0),
        errors: clampNumber(item?.errors, 0, 1000000, 0),
        inputTokens: clampNumber(item?.inputTokens, 0, 1000000000, 0),
        outputTokens: clampNumber(item?.outputTokens, 0, 1000000000, 0),
        actions: clampNumber(item?.actions, 0, 1000000, 0),
        durationMs: clampNumber(item?.durationMs, 0, 1000000000, 0),
        providers: item?.providers && typeof item.providers === 'object' ? item.providers : {},
        users: item?.users && typeof item.users === 'object' ? item.users : {},
      };
    });
  return { schemaVersion: 1, days: cleanDays };
}

function readUsage() {
  return normalizeUsage(safeRead(AI_GOVERNANCE_USAGE_KEY, { schemaVersion: 1, days: {} }));
}

function writeUsage(usage) {
  return safeWrite(AI_GOVERNANCE_USAGE_KEY, normalizeUsage(usage));
}

function ensureDay(usage, date) {
  if (!usage.days[date]) {
    usage.days[date] = { requests: 0, successes: 0, errors: 0, inputTokens: 0, outputTokens: 0, actions: 0, durationMs: 0, providers: {}, users: {} };
  }
  return usage.days[date];
}

export function estimateTokens(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '');
  return Math.max(1, Math.ceil(text.length / 4));
}

export function getAiUsageSummary(date = dayKey()) {
  const usage = readUsage();
  const day = ensureDay(usage, date);
  const settings = getAiGovernanceSettings();
  const tokenTotal = day.inputTokens + day.outputTokens;
  return {
    date,
    ...day,
    tokenTotal,
    requestLimit: settings.dailyRequestLimit,
    tokenBudget: settings.dailyTokenBudget,
    requestPercent: Math.min(100, Math.round((day.requests / Math.max(1, settings.dailyRequestLimit)) * 100)),
    tokenPercent: Math.min(100, Math.round((tokenTotal / Math.max(1, settings.dailyTokenBudget)) * 100)),
  };
}

export function getAiUsageDays() {
  const usage = readUsage();
  return Object.entries(usage.days).sort(([a], [b]) => b.localeCompare(a)).map(([date, item]) => ({ date, ...item, tokenTotal: item.inputTokens + item.outputTokens }));
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

export function guardAiRequest(options = {}) {
  const settings = getAiGovernanceSettings();
  if (!settings.enabled) {
    const error = new Error('AI has been paused by the administrator.');
    error.code = 'AI_GOVERNANCE_DISABLED';
    throw error;
  }
  const summary = getAiUsageSummary();
  if (summary.requests >= settings.dailyRequestLimit) {
    const error = new Error(`Daily AI request limit reached (${settings.dailyRequestLimit}).`);
    error.code = 'AI_REQUEST_LIMIT';
    throw error;
  }
  const inputTokens = estimateTokens(options.prompt || '');
  if (summary.tokenTotal + inputTokens >= settings.dailyTokenBudget) {
    const error = new Error(`Daily AI token budget reached (${settings.dailyTokenBudget}).`);
    error.code = 'AI_TOKEN_BUDGET';
    throw error;
  }
  const profileKey = resolveAiProfile(options);
  const profile = settings.profiles[profileKey] || settings.profiles.default;
  const minimumOutputTokens = profileKey === 'diagnostic' ? 16 : 256;
  const requestedMax = clampNumber(options.maxOutputTokens, minimumOutputTokens, 8192, profile.maxOutputTokens);
  const cappedMaxOutputTokens = Math.min(requestedMax, settings.maxOutputTokens, profile.maxOutputTokens);
  return { settings, profileKey, inputTokens, maxOutputTokens: cappedMaxOutputTokens, summary };
}

function incrementProvider(map, provider, amount = 1) {
  const key = String(provider || 'Unknown').slice(0, 80);
  map[key] = clampNumber(map[key], 0, 1000000, 0) + amount;
}

function incrementUser(map, user, amount = 1) {
  const key = String(user?.email || user?.id || 'guest').slice(0, 120);
  map[key] = clampNumber(map[key], 0, 1000000, 0) + amount;
}

export function recordAiRequest({ provider = '', model = '', prompt = '', result = '', durationMs = 0, success = true, error = '', profile = 'default', operationId = '' } = {}) {
  const usage = readUsage();
  const date = dayKey();
  const day = ensureDay(usage, date);
  const inputTokens = estimateTokens(prompt);
  const outputTokens = success ? estimateTokens(result) : 0;
  day.requests += 1;
  day.successes += success ? 1 : 0;
  day.errors += success ? 0 : 1;
  day.inputTokens += inputTokens;
  day.outputTokens += outputTokens;
  day.durationMs += Math.max(0, Math.round(Number(durationMs) || 0));
  incrementProvider(day.providers, provider || model || 'Unknown');
  incrementUser(day.users, currentUser);
  writeUsage(usage);
  appendAiAudit({
    type: 'request',
    status: success ? 'success' : 'error',
    label: success ? 'AI request completed' : 'AI request failed',
    provider,
    model,
    profile,
    operationId,
    detail: { inputTokens, outputTokens, durationMs: Math.max(0, Math.round(Number(durationMs) || 0)), error: String(error || '').slice(0, 500) },
  });
  return { inputTokens, outputTokens };
}

export function recordAiAction({ actionId = '', label = '', target = '', source = '', status = 'success', detail = {} } = {}) {
  const usage = readUsage();
  const day = ensureDay(usage, dayKey());
  day.actions += 1;
  incrementUser(day.users, currentUser);
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
    operationId: String(entry.operationId || '').slice(0, 100),
    actionId: String(entry.actionId || '').slice(0, 100),
    target: String(entry.target || '').slice(0, 120),
    source: String(entry.source || '').slice(0, 120),
    actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role, name: currentUser.name },
    detail: entry.detail && typeof entry.detail === 'object' ? entry.detail : {},
  };
  const next = [item, ...readAiAudit().filter((existing) => existing.id !== item.id)].slice(0, MAX_AUDIT_ITEMS);
  safeWrite(AI_GOVERNANCE_AUDIT_KEY, next);
  return item;
}

export function clearAiAudit() {
  safeWrite(AI_GOVERNANCE_AUDIT_KEY, []);
}

export function resetAiUsage() {
  safeWrite(AI_GOVERNANCE_USAGE_KEY, { schemaVersion: 1, days: {} });
  appendAiAudit({ type: 'usage', status: 'success', label: 'AI usage counters reset', detail: {} });
}

export function exportAiGovernanceReport() {
  return {
    exportedAt: new Date().toISOString(),
    settings: getAiGovernanceSettings(),
    usage: getAiUsageDays(),
    audit: readAiAudit(),
  };
}

export function isAiActionAllowed(target) {
  const settings = getAiGovernanceSettings();
  return settings.enabled && settings.allowActions && settings.actionTargets?.[target] !== false;
}
