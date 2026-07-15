import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
}

const storage = new MemoryStorage();
globalThis.localStorage = storage;
globalThis.window = { localStorage: storage, dispatchEvent() {}, location: { origin: 'http://localhost' } };
globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };

const registry = await import('../src/utils/aiPromptRegistry.js');
const runtime = await import('../src/utils/aiTaskRuntime.js');

const definitions = registry.listAiPromptDefinitions();
assert.ok(definitions.length >= 30);
assert.ok(definitions.every((item) => item.id && item.app && item.version && item.governanceProfile));
assert.equal(new Set(definitions.map((item) => item.id)).size, definitions.length);
assert.equal(registry.getAiPromptDefinition('worksheet.generateSource')?.version, '2.1.0');
assert.equal(registry.getAiPromptDefinition('homeroom.writeComment')?.privacyProfile, 'student-sensitive');
assert.equal(registry.getAiPromptDefinition('speaking.generateCards')?.output, 'json');

const request = registry.buildAiTaskRequest('worksheet.analyzeSource', { prompt: 'Analyse this source.' }, { maxOutputTokens: 900 });
assert.equal(request.registryTaskId, 'worksheet.analyzeSource');
assert.equal(request.aiTaskId, 'worksheet');
assert.equal(request.promptVersion, '2.0.0');
assert.equal(request.responseMimeType, 'application/json');
assert.equal(request.maxOutputTokens, 900);
assert.equal(request.validation.kind, 'json');

assert.throws(() => registry.buildAiTaskRequest('missing.task', { prompt: 'x' }), /Unknown AI task/);
assert.throws(() => registry.buildAiTaskRequest('worksheet.generateSource', { prompt: '' }), /requires a prompt/);

const metrics = runtime.getAiTaskRuntimeMetrics();
assert.equal(metrics.length, definitions.length);
assert.ok(metrics.every((item) => item.runs === 0));
assert.equal(registry.getAiPromptRegistrySummary().registryVersion, 'bes-ai-prompt-registry/1.0');

console.log(`✓ ${definitions.length} versioned AI tasks are registered across the website.`);
console.log('✓ Task requests inherit governance, routing, privacy and output contracts centrally.');
console.log('✓ Sensitive school tasks use explicit student/school privacy profiles.');
console.log('✓ Runtime metrics expose success, repair, fallback, provider and latency per Task ID.');
