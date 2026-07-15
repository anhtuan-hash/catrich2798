import { appendAiAudit } from './aiGovernance.js';
import { callAIWithMeta } from './gemini.js';
import {
  AI_PROMPT_REGISTRY_VERSION,
  buildAiTaskRequest,
  getAiPromptDefinition,
  listAiPromptDefinitions,
} from './aiPromptRegistry.js';

export const AI_TASK_RUNTIME_EVENT = 'bes-ai-task-runtime-updated';
const METRICS_KEY = 'bes-ai-task-metrics:v1';
const MAX_RECENT_RUNS = 120;

function safeParse(raw, fallback) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

function readMetrics() {
  if (typeof window === 'undefined') return { tasks: {}, recent: [] };
  const parsed = safeParse(window.localStorage.getItem(METRICS_KEY), { tasks: {}, recent: [] });
  return {
    tasks: parsed?.tasks && typeof parsed.tasks === 'object' ? parsed.tasks : {},
    recent: Array.isArray(parsed?.recent) ? parsed.recent.slice(0, MAX_RECENT_RUNS) : [],
  };
}

function writeMetrics(value) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(METRICS_KEY, JSON.stringify(value)); } catch { /* local metrics are best effort */ }
  window.dispatchEvent(new CustomEvent(AI_TASK_RUNTIME_EVENT));
}

function recordTaskRun({ definition, success, meta = {}, error = null, startedAt }) {
  if (!definition) return;
  const store = readMetrics();
  const previous = store.tasks[definition.id] || {
    taskId: definition.id,
    app: definition.app,
    label: definition.label,
    promptVersion: definition.version,
    runs: 0,
    successes: 0,
    errors: 0,
    repairs: 0,
    fallbacks: 0,
    totalDurationMs: 0,
    totalProviderCalls: 0,
    lastRunAt: '',
    lastProvider: '',
    lastModel: '',
    lastError: '',
  };
  const durationMs = Math.max(0, Number(meta.durationMs) || (Date.now() - startedAt));
  const next = {
    ...previous,
    promptVersion: definition.version,
    runs: previous.runs + 1,
    successes: previous.successes + (success ? 1 : 0),
    errors: previous.errors + (success ? 0 : 1),
    repairs: previous.repairs + (meta.validation?.repaired ? 1 : 0),
    fallbacks: previous.fallbacks + (meta.fallbackUsed ? 1 : 0),
    totalDurationMs: previous.totalDurationMs + durationMs,
    totalProviderCalls: previous.totalProviderCalls + Math.max(0, Number(meta.providerCalls) || 0),
    lastRunAt: new Date().toISOString(),
    lastProvider: meta.provider || previous.lastProvider,
    lastModel: meta.model || previous.lastModel,
    lastError: success ? '' : String(error?.message || error || '').slice(0, 300),
  };
  store.tasks[definition.id] = next;
  store.recent.unshift({
    id: meta.operationId || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    taskId: definition.id,
    app: definition.app,
    promptVersion: definition.version,
    success,
    provider: meta.provider || '',
    model: meta.model || '',
    durationMs,
    repaired: Boolean(meta.validation?.repaired),
    fallbackUsed: Boolean(meta.fallbackUsed),
    createdAt: new Date().toISOString(),
    error: success ? '' : String(error?.message || error || '').slice(0, 300),
  });
  store.recent = store.recent.slice(0, MAX_RECENT_RUNS);
  writeMetrics(store);
}

function normalizeInvocation(input = {}, overrides = {}) {
  if (typeof input === 'string') return { input: { prompt: input }, overrides };
  const payload = input && typeof input === 'object' ? input : {};
  const explicitInput = payload.input && typeof payload.input === 'object' ? payload.input : payload;
  const explicitOverrides = payload.options && typeof payload.options === 'object'
    ? { ...payload, ...payload.options }
    : { ...payload };
  delete explicitOverrides.input;
  delete explicitOverrides.options;
  return { input: explicitInput, overrides: { ...explicitOverrides, ...overrides } };
}

export async function runAITaskWithMeta(taskId, input = {}, overrides = {}) {
  const definition = getAiPromptDefinition(taskId);
  const startedAt = Date.now();
  const normalized = normalizeInvocation(input, overrides);
  const request = buildAiTaskRequest(taskId, normalized.input, normalized.overrides);
  try {
    const response = await callAIWithMeta(request);
    const meta = {
      ...response.meta,
      taskId: definition.id,
      taskGroup: definition.group,
      taskApp: definition.app,
      taskLabel: definition.label,
      promptVersion: definition.version,
      promptRegistryVersion: AI_PROMPT_REGISTRY_VERSION,
      taskContract: definition.validation || null,
    };
    recordTaskRun({ definition, success: true, meta, startedAt });
    appendAiAudit({
      type: 'task',
      status: 'success',
      label: `${definition.app} · ${definition.label}`,
      taskId: definition.id,
      provider: meta.provider,
      model: meta.model,
      transport: meta.transport,
      operationId: meta.operationId,
      detail: {
        promptVersion: definition.version,
        registryVersion: AI_PROMPT_REGISTRY_VERSION,
        durationMs: meta.durationMs,
        providerCalls: meta.providerCalls,
        fallbackUsed: meta.fallbackUsed,
        validation: meta.validation,
      },
    });
    return { text: response.text, meta };
  } catch (error) {
    recordTaskRun({ definition, success: false, meta: error?.meta || {}, error, startedAt });
    appendAiAudit({
      type: 'task',
      status: 'error',
      label: `${definition?.app || 'AI'} · ${definition?.label || taskId}`,
      taskId,
      detail: {
        promptVersion: definition?.version || '',
        registryVersion: AI_PROMPT_REGISTRY_VERSION,
        error: error?.message || String(error),
        code: error?.code || '',
      },
    });
    throw error;
  }
}

export async function runAITask(taskId, input = {}, overrides = {}) {
  const response = await runAITaskWithMeta(taskId, input, overrides);
  return response.text;
}

/** Compatibility bridge used while old components are being migrated. */
export async function runLegacyAITask(taskId, options = {}) {
  return runAITask(taskId, options);
}

export function getAiTaskRuntimeMetrics() {
  const store = readMetrics();
  const registered = listAiPromptDefinitions();
  return registered.map((definition) => {
    const metric = store.tasks[definition.id] || {};
    const runs = Number(metric.runs) || 0;
    return {
      ...definition,
      ...metric,
      runs,
      successes: Number(metric.successes) || 0,
      errors: Number(metric.errors) || 0,
      repairs: Number(metric.repairs) || 0,
      fallbacks: Number(metric.fallbacks) || 0,
      averageDurationMs: runs ? Math.round((Number(metric.totalDurationMs) || 0) / runs) : 0,
      averageProviderCalls: runs ? Number(((Number(metric.totalProviderCalls) || 0) / runs).toFixed(2)) : 0,
      successRate: runs ? Math.round(((Number(metric.successes) || 0) / runs) * 100) : 0,
    };
  });
}

export function getRecentAiTaskRuns() {
  return readMetrics().recent;
}

export function resetAiTaskRuntimeMetrics() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(METRICS_KEY);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(AI_TASK_RUNTIME_EVENT));
}
