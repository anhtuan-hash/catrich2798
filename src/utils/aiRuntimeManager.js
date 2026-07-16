/**
 * Brian Unified AI Runtime
 *
 * Centralizes queueing, transient retry, timeout, in-flight de-duplication,
 * short-lived response caching and provider circuit breakers. The runtime is
 * intentionally transport-agnostic: callers provide the provider executor.
 */

export const AI_RUNTIME_EVENT = 'bes-ai-runtime-updated';
export const AI_RUNTIME_CIRCUIT_KEY = 'bes-ai-runtime-circuits:v2';

export const DEFAULT_AI_RUNTIME_SETTINGS = Object.freeze({
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
});

const queue = [];
const inFlight = new Map();
const responseCache = new Map();
const recentOperations = [];
let activeCount = 0;
let sessionStats = {
  queued: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  retries: 0,
  timeouts: 0,
  cacheHits: 0,
  dedupeHits: 0,
  circuitRejects: 0,
  queueWaitMs: 0,
};

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function normalizeAiRuntimeSettings(raw = {}) {
  const defaults = DEFAULT_AI_RUNTIME_SETTINGS;
  return {
    enabled: raw.enabled !== false,
    maxConcurrent: clamp(raw.maxConcurrent, 1, 6, defaults.maxConcurrent),
    requestTimeoutMs: clamp(raw.requestTimeoutMs, 5000, 240000, defaults.requestTimeoutMs),
    transientRetries: clamp(raw.transientRetries, 0, 3, defaults.transientRetries),
    retryBaseDelayMs: clamp(raw.retryBaseDelayMs, 100, 5000, defaults.retryBaseDelayMs),
    dedupeInFlight: raw.dedupeInFlight !== false,
    cacheEnabled: raw.cacheEnabled !== false,
    cacheTtlMs: clamp(raw.cacheTtlMs, 10000, 3600000, defaults.cacheTtlMs),
    cacheMaxEntries: clamp(raw.cacheMaxEntries, 5, 200, defaults.cacheMaxEntries),
    circuitBreakerEnabled: raw.circuitBreakerEnabled !== false,
    circuitFailureThreshold: clamp(raw.circuitFailureThreshold, 2, 10, defaults.circuitFailureThreshold),
    circuitFailureWindowMs: clamp(raw.circuitFailureWindowMs, 10000, 900000, defaults.circuitFailureWindowMs),
    circuitCooldownMs: clamp(raw.circuitCooldownMs, 10000, 900000, defaults.circuitCooldownMs),
  };
}

function emit(detail = {}) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(AI_RUNTIME_EVENT, { detail: { ...getAiRuntimeSnapshot(), ...detail } }));
  }
}

function safeReadCircuits() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(AI_RUNTIME_CIRCUIT_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function safeWriteCircuits(value) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(AI_RUNTIME_CIRCUIT_KEY, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
}

function normalizeProviderId(providerId = '') {
  return String(providerId || 'unknown').trim().toLowerCase() || 'unknown';
}

function pruneCircuitEntry(entry = {}, now = Date.now()) {
  const failures = Array.isArray(entry.failures)
    ? entry.failures.map(Number).filter((item) => Number.isFinite(item) && now - item < 24 * 60 * 60 * 1000)
    : [];
  return {
    failures,
    openedAt: Number(entry.openedAt) || 0,
    openUntil: Number(entry.openUntil) || 0,
    lastError: String(entry.lastError || '').slice(0, 240),
    lastSuccessAt: Number(entry.lastSuccessAt) || 0,
  };
}

export function getAiProviderCircuit(providerId, runtimeSettings = DEFAULT_AI_RUNTIME_SETTINGS) {
  const settings = normalizeAiRuntimeSettings(runtimeSettings);
  const id = normalizeProviderId(providerId);
  const now = Date.now();
  const circuits = safeReadCircuits();
  const entry = pruneCircuitEntry(circuits[id], now);
  const failuresInWindow = entry.failures.filter((timestamp) => now - timestamp <= settings.circuitFailureWindowMs);
  const open = settings.circuitBreakerEnabled && entry.openUntil > now;
  return {
    providerId: id,
    open,
    openedAt: entry.openedAt,
    openUntil: entry.openUntil,
    remainingMs: open ? Math.max(0, entry.openUntil - now) : 0,
    failuresInWindow: failuresInWindow.length,
    lastError: entry.lastError,
    lastSuccessAt: entry.lastSuccessAt,
  };
}

export function isAiProviderCircuitOpen(providerId, runtimeSettings = DEFAULT_AI_RUNTIME_SETTINGS) {
  return getAiProviderCircuit(providerId, runtimeSettings).open;
}

export function recordAiProviderRuntimeSuccess(providerId) {
  const id = normalizeProviderId(providerId);
  const circuits = safeReadCircuits();
  const entry = pruneCircuitEntry(circuits[id]);
  circuits[id] = { ...entry, failures: [], openedAt: 0, openUntil: 0, lastError: '', lastSuccessAt: Date.now() };
  safeWriteCircuits(circuits);
  emit({ reason: 'provider-success', providerId: id });
}

export function recordAiProviderRuntimeFailure(providerId, error, runtimeSettings = DEFAULT_AI_RUNTIME_SETTINGS) {
  const settings = normalizeAiRuntimeSettings(runtimeSettings);
  const id = normalizeProviderId(providerId);
  if (!settings.circuitBreakerEnabled) return getAiProviderCircuit(id, settings);
  const now = Date.now();
  const circuits = safeReadCircuits();
  const entry = pruneCircuitEntry(circuits[id], now);
  const failures = [...entry.failures.filter((timestamp) => now - timestamp <= settings.circuitFailureWindowMs), now];
  const shouldOpen = failures.length >= settings.circuitFailureThreshold;
  circuits[id] = {
    ...entry,
    failures,
    openedAt: shouldOpen ? now : entry.openedAt,
    openUntil: shouldOpen ? now + settings.circuitCooldownMs : entry.openUntil,
    lastError: String(error?.message || error || '').slice(0, 240),
  };
  safeWriteCircuits(circuits);
  emit({ reason: shouldOpen ? 'circuit-opened' : 'provider-failure', providerId: id });
  return getAiProviderCircuit(id, settings);
}

export function resetAiProviderCircuits() {
  safeWriteCircuits({});
  emit({ reason: 'circuits-reset' });
}

function simpleHash(value = '') {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function createAiRuntimeFingerprint({ providerId = '', model = '', taskId = '', prompt = '', systemInstruction = '', responseMimeType = '', maxOutputTokens = 0, temperature = '', attachments = [] } = {}) {
  const attachmentSignature = (Array.isArray(attachments) ? attachments : []).map((item) => [item?.mimeType || item?.type || '', item?.name || '', String(item?.base64 || item?.dataUrl || '').length].join(':')).join('|');
  return `air-${simpleHash([providerId, model, taskId, responseMimeType, maxOutputTokens, temperature, systemInstruction, prompt, attachmentSignature].join('\u241f'))}`;
}

function cleanExpiredCache(now = Date.now()) {
  for (const [key, entry] of responseCache.entries()) {
    if (!entry || entry.expiresAt <= now) responseCache.delete(key);
  }
}

function trimCache(maxEntries) {
  cleanExpiredCache();
  while (responseCache.size > maxEntries) {
    const firstKey = responseCache.keys().next().value;
    if (!firstKey) break;
    responseCache.delete(firstKey);
  }
}

export function clearAiRuntimeCache() {
  responseCache.clear();
  emit({ reason: 'cache-cleared' });
}

function pushRecent(operation) {
  recentOperations.unshift(operation);
  if (recentOperations.length > 40) recentOperations.length = 40;
}

function makeAbortError(code = 'AI_REQUEST_CANCELLED', message = 'AI request was cancelled.') {
  const error = new Error(message);
  error.name = code === 'AI_REQUEST_TIMEOUT' ? 'TimeoutError' : 'AbortError';
  error.code = code;
  return error;
}

function wait(ms, signal) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        reject(makeAbortError('AI_REQUEST_CANCELLED'));
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

function mergeAbortSignals(externalSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', abort, { once: true });
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener?.('abort', abort);
    },
  };
}

function defaultClassifyError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const status = Number(error?.status || 0);
  if (error?.code === 'AI_REQUEST_TIMEOUT') return 'timeout';
  if (error?.code === 'AI_REQUEST_CANCELLED' || error?.name === 'AbortError') return 'cancelled';
  if (status === 429 || /rate limit|too many requests/.test(message)) return 'rate-limit';
  if (status >= 500 || /temporarily unavailable|overloaded|server error/.test(message)) return 'provider-unavailable';
  if (/network|failed to fetch|load failed|timeout|timed out/.test(message)) return 'network';
  return 'unknown';
}

function isTransientKind(kind) {
  return ['network', 'rate-limit', 'provider-unavailable', 'timeout'].includes(kind);
}

async function executeWithRetry({ executor, settings, signal, classifyError, onUpdate }) {
  const maxAttempts = settings.enabled ? settings.transientRetries + 1 : 1;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timeout = mergeAbortSignals(signal, settings.requestTimeoutMs);
    try {
      const value = await executor({ signal: timeout.signal, attempt });
      timeout.cleanup();
      return { value, attempts: attempt, retries: attempt - 1, timedOut: false };
    } catch (originalError) {
      const didTimeout = timeout.didTimeout();
      timeout.cleanup();
      let error = originalError;
      if (didTimeout) {
        error = makeAbortError('AI_REQUEST_TIMEOUT', `AI provider timed out after ${settings.requestTimeoutMs} ms.`);
        error.cause = originalError;
        sessionStats.timeouts += 1;
      } else if (signal?.aborted || originalError?.code === 'AI_REQUEST_CANCELLED') {
        throw makeAbortError('AI_REQUEST_CANCELLED');
      }
      lastError = error;
      const kind = (classifyError || defaultClassifyError)(error);
      const canRetry = attempt < maxAttempts && isTransientKind(kind);
      if (!canRetry) throw error;
      const delayMs = Math.min(12000, settings.retryBaseDelayMs * (2 ** (attempt - 1)) + Math.round(Math.random() * 180));
      sessionStats.retries += 1;
      onUpdate?.({ phase: 'retry', retryAttempt: attempt, retryDelayMs: delayMs, errorType: kind });
      emit({ reason: 'retry', retryDelayMs: delayMs, errorType: kind });
      await wait(delayMs, signal);
    }
  }
  throw lastError || new Error('AI runtime failed without an error.');
}

function processQueue() {
  if (!queue.length) return;
  const next = queue[0];
  const limit = next?.settings?.maxConcurrent || DEFAULT_AI_RUNTIME_SETTINGS.maxConcurrent;
  while (queue.length && activeCount < limit) {
    const item = queue.shift();
    if (item.signal?.aborted) {
      sessionStats.cancelled += 1;
      item.reject(makeAbortError());
      continue;
    }
    activeCount += 1;
    const queueWaitMs = Math.max(0, Date.now() - item.queuedAt);
    sessionStats.queueWaitMs += queueWaitMs;
    emit({ reason: 'dequeued', operationId: item.operationId, queueWaitMs });
    item.run(queueWaitMs).finally(() => {
      activeCount = Math.max(0, activeCount - 1);
      emit({ reason: 'slot-released', operationId: item.operationId });
      processQueue();
    });
  }
}

function schedule({ operationId, settings, signal, run }) {
  return new Promise((resolve, reject) => {
    const item = {
      operationId,
      settings,
      signal,
      queuedAt: Date.now(),
      reject,
      run: async (queueWaitMs) => {
        try { resolve(await run(queueWaitMs)); }
        catch (error) { reject(error); }
      },
    };
    queue.push(item);
    sessionStats.queued += 1;
    emit({ reason: 'queued', operationId });
    processQueue();
  });
}

export async function runAiProviderRuntime({
  operationId = `ai-runtime-${Date.now()}`,
  providerId = 'unknown',
  model = '',
  taskId = 'default',
  fingerprint = '',
  settings: rawSettings = {},
  signal,
  cacheAllowed = false,
  classifyError,
  onUpdate,
  executor,
} = {}) {
  if (typeof executor !== 'function') throw new TypeError('AI runtime executor is required.');
  const settings = normalizeAiRuntimeSettings(rawSettings);
  const provider = normalizeProviderId(providerId);
  const key = fingerprint || `${provider}:${model}:${taskId}:${operationId}`;
  const startedAt = Date.now();

  if (settings.enabled && settings.circuitBreakerEnabled && isAiProviderCircuitOpen(provider, settings)) {
    sessionStats.circuitRejects += 1;
    const circuit = getAiProviderCircuit(provider, settings);
    const error = new Error(`AI provider ${provider} is temporarily paused by the circuit breaker.`);
    error.code = 'AI_CIRCUIT_OPEN';
    error.provider = provider;
    error.retryAfterMs = circuit.remainingMs;
    emit({ reason: 'circuit-rejected', providerId: provider, operationId });
    throw error;
  }

  cleanExpiredCache();
  if (settings.enabled && cacheAllowed && settings.cacheEnabled) {
    const cached = responseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      sessionStats.cacheHits += 1;
      responseCache.delete(key);
      responseCache.set(key, cached);
      emit({ reason: 'cache-hit', providerId: provider, operationId });
      return {
        value: cached.value,
        runtime: { queueWaitMs: 0, networkAttempts: 0, retries: 0, cacheHit: true, deduplicated: false, timedOut: false, circuitOpen: false, durationMs: Date.now() - startedAt },
      };
    }
  }

  if (settings.enabled && settings.dedupeInFlight && !signal && inFlight.has(key)) {
    sessionStats.dedupeHits += 1;
    const shared = await inFlight.get(key);
    emit({ reason: 'dedupe-hit', providerId: provider, operationId });
    return { value: shared.value, runtime: { ...shared.runtime, deduplicated: true, durationMs: Date.now() - startedAt } };
  }

  const execute = schedule({
    operationId,
    settings,
    signal,
    run: async (queueWaitMs) => {
      const operation = { operationId, providerId: provider, model, taskId, startedAt: Date.now(), queueWaitMs, status: 'running' };
      pushRecent(operation);
      onUpdate?.({ phase: 'runtime-start', queueWaitMs });
      try {
        const execution = settings.enabled
          ? await executeWithRetry({ executor, settings, signal, classifyError, onUpdate })
          : { value: await executor({ signal, attempt: 1 }), attempts: 1, retries: 0, timedOut: false };
        recordAiProviderRuntimeSuccess(provider);
        const runtime = {
          queueWaitMs,
          networkAttempts: execution.attempts,
          retries: execution.retries,
          cacheHit: false,
          deduplicated: false,
          timedOut: execution.timedOut,
          circuitOpen: false,
          durationMs: Date.now() - startedAt,
        };
        operation.status = 'success';
        operation.completedAt = Date.now();
        operation.runtime = runtime;
        sessionStats.completed += 1;
        if (settings.enabled && cacheAllowed && settings.cacheEnabled) {
          responseCache.set(key, { value: execution.value, expiresAt: Date.now() + settings.cacheTtlMs, createdAt: Date.now() });
          trimCache(settings.cacheMaxEntries);
        }
        emit({ reason: 'completed', operationId, providerId: provider });
        return { value: execution.value, runtime };
      } catch (error) {
        const kind = (classifyError || defaultClassifyError)(error);
        // Only transient infrastructure failures should open a circuit. Auth,
        // credit, policy and validation errors are actionable and must not leave
        // every AI application blocked after a few attempts.
        if (isTransientKind(kind)) recordAiProviderRuntimeFailure(provider, error, settings);
        operation.status = kind === 'cancelled' ? 'cancelled' : 'error';
        operation.completedAt = Date.now();
        operation.error = String(error?.message || error).slice(0, 240);
        if (kind === 'cancelled') sessionStats.cancelled += 1;
        else sessionStats.failed += 1;
        emit({ reason: operation.status, operationId, providerId: provider, errorType: kind });
        throw error;
      }
    },
  });

  if (settings.enabled && settings.dedupeInFlight && !signal) inFlight.set(key, execute);
  try {
    return await execute;
  } finally {
    if (inFlight.get(key) === execute) inFlight.delete(key);
  }
}

export function getAiRuntimeSnapshot(runtimeSettings = DEFAULT_AI_RUNTIME_SETTINGS) {
  const settings = normalizeAiRuntimeSettings(runtimeSettings);
  const circuits = safeReadCircuits();
  const circuitRows = Object.keys(circuits).map((providerId) => getAiProviderCircuit(providerId, settings)).filter((item) => item.open);
  cleanExpiredCache();
  return {
    activeCount,
    queuedCount: queue.length,
    inFlightCount: inFlight.size,
    cacheEntries: responseCache.size,
    openCircuitCount: circuitRows.length,
    openCircuits: circuitRows,
    recentOperations: recentOperations.slice(0, 20),
    stats: { ...sessionStats },
  };
}

export function resetAiRuntimeSession() {
  clearAiRuntimeCache();
  resetAiProviderCircuits();
  recentOperations.length = 0;
  sessionStats = { queued: 0, completed: 0, failed: 0, cancelled: 0, retries: 0, timeouts: 0, cacheHits: 0, dedupeHits: 0, circuitRejects: 0, queueWaitMs: 0 };
  emit({ reason: 'runtime-reset' });
}
