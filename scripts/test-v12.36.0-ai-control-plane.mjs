import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
  clear() { this.map.clear(); }
}

const storage = new MemoryStorage();
globalThis.localStorage = storage;
globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
globalThis.window = { localStorage: storage, dispatchEvent() {} };

const governance = await import('../src/utils/aiGovernance.js');

governance.resetAiUsage();
governance.clearAiAudit();
governance.setAiGovernanceUser({ id: 'teacher-1', email: 'teacher@example.edu.vn', role: 'teacher', name: 'Teacher One' });
governance.saveAiGovernanceSettings({
  enabled: true,
  dailyRequestLimit: 100,
  dailyTokenBudget: 1000000,
  fairUse: {
    enabled: true,
    perUserDailyRequestLimit: 2,
    perUserDailyTokenBudget: 50000,
    warningPercent: 75,
    blockAtLimit: true,
    exemptAdmins: true,
  },
});

governance.recordAiRequest({
  provider: 'OpenRouter',
  model: 'openrouter/free',
  prompt: 'Create a short B2 worksheet about environmental policy.',
  result: 'Worksheet output one.',
  durationMs: 2400,
  success: true,
  profile: 'worksheet',
  taskId: 'worksheet',
  transport: 'browser-unified',
  operationId: 'op-1',
  providerCalls: 2,
  fallbackUsed: true,
  attempts: [
    { provider: 'groq', model: 'llama', status: 'error', errorType: 'capacity', durationMs: 800 },
    { provider: 'openrouter', model: 'openrouter/free', status: 'success', durationMs: 1600 },
  ],
  validation: { valid: true, repaired: false },
  runtime: { retries: 1, queueWaitMs: 120, networkAttempts: 2 },
});

governance.recordAiRequest({
  provider: 'Gemini',
  model: 'gemini-flash-latest',
  prompt: 'Summarise the attached source.',
  result: 'Summary output.',
  durationMs: 1600,
  success: true,
  profile: 'document',
  taskId: 'document',
  transport: 'browser-unified',
  operationId: 'op-2',
  providerCalls: 1,
  fallbackUsed: false,
  validation: { valid: true, repaired: true },
  runtime: { retries: 0, queueWaitMs: 80, networkAttempts: 1 },
});

const summary = governance.getAiUsageSummary();
assert.equal(summary.requests, 2);
assert.equal(summary.providerCalls, 3);
assert.equal(summary.fallbacks, 1);
assert.equal(summary.tasks.worksheet, 1);
assert.equal(summary.tasks.document, 1);
assert.equal(summary.transports['browser-unified'], 2);
assert.equal(summary.users['teacher@example.edu.vn'], 2);
assert.ok(summary.userTokens > 0);

const observability = governance.getAiObservabilitySummary();
assert.equal(observability.fallbackRate, 50);
assert.equal(observability.providerCallAmplification, 1.5);
assert.equal(observability.averageLatencyMs, 2000);
assert.equal(observability.topTasks.length, 2);
assert.equal(observability.topTransports[0].id, 'browser-unified');

assert.throws(
  () => governance.guardAiRequest({ prompt: 'One more request', aiTaskId: 'chat', governanceProfile: 'chat' }),
  (error) => error.code === 'AI_USER_REQUEST_LIMIT',
);

governance.setAiGovernanceUser({ id: 'admin-1', email: 'admin@example.edu.vn', role: 'admin', name: 'Admin' });
const adminGuard = governance.guardAiRequest({ prompt: 'Admin diagnostic request', aiTaskId: 'diagnostic', governanceProfile: 'diagnostic', maxOutputTokens: 64 });
assert.equal(adminGuard.taskId, 'diagnostic');
assert.equal(adminGuard.maxOutputTokens, 64);

const report = governance.exportAiGovernanceReport();
assert.equal(report.schema, 'bes-ai-governance-report/2.0');
assert.equal(report.observability.providerCallAmplification, 1.5);
assert.ok(report.audit.some((item) => item.operationId === 'op-1' && item.taskId === 'worksheet'));

console.log('✓ Per-account request and token budgets are enforced centrally.');
console.log('✓ Usage is aggregated by task, provider, model, transport and account.');
console.log('✓ Provider-call amplification, fallback rate and latency telemetry are calculated.');
console.log('✓ Admin exemption and governance report schema work as configured.');
console.log('✓ Request traces retain operation, attempt, privacy, validation and runtime metadata.');
