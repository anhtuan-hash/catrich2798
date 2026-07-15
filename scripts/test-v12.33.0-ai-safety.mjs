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
globalThis.window = {
  localStorage: storage,
  location: { origin: 'https://brian.test' },
  dispatchEvent() {},
};
storage.setItem('bes-ai-user-scope', 'safety-test-user');

const { applyAiPrivacyFilter } = await import('../src/utils/aiPrivacyFilter.js');
const { validateAiOutput } = await import('../src/utils/aiOutputValidator.js');
const overrides = await import('../src/utils/aiProviderOverrides.js');
const governance = await import('../src/utils/aiGovernance.js');
const { callAIWithMeta } = await import('../src/utils/gemini.js');

// Privacy Filter must redact personal data before transport and restore safe
// placeholders locally after the response returns.
const privacy = applyAiPrivacyFilter({
  aiTaskId: 'administration',
  prompt: 'Họ và tên: Nguyễn Văn An\nEmail: an@school.edu.vn\nSĐT: 0912345678\nMã học sinh: HS12001',
}, { enabled: true, mode: 'mask' });
assert.doesNotMatch(privacy.options.prompt, /Nguyễn Văn An|an@school\.edu\.vn|0912345678|HS12001/);
assert.match(privacy.options.prompt, /\[PERSON_1\]/);
assert.match(privacy.options.prompt, /\[EMAIL_1\]/);
assert.equal(privacy.report.riskLevel, 'high');
assert.match(privacy.restoreText('Student: [PERSON_1]'), /Nguyễn Văn An/);

// Output Guard must validate strict JSON, required fields and exact item count.
const invalid = validateAiOutput('{"title":"Set","cards":[]}', {
  options: {
    responseMimeType: 'application/json',
    validation: { kind: 'json', requiredFields: ['title', 'cards'], collectionKey: 'cards', expectedCount: 1 },
  },
  task: { outputKind: 'json' },
  settings: { enabled: true, validateJson: true, autoRepair: true, maxRepairAttempts: 1 },
});
assert.equal(invalid.valid, false);
assert.ok(invalid.issues.some((item) => item.code === 'wrong_item_count'));

// Configure one provider and enable centralized privacy + validation.
overrides.saveProviderOverride('openrouter', {
  apiKey: 'or-key',
  model: 'openrouter/free',
  baseUrl: 'https://openrouter.ai/api/v1',
  enabled: true,
}, { activate: true });
overrides.saveRoutingPreferences({ mode: 'smart', fallbackEnabled: false, fallbackOrder: ['openrouter'] });
governance.saveAiGovernanceSettings({
  privacy: { ...governance.getAiGovernanceSettings().privacy, enabled: true, mode: 'mask' },
  outputValidation: { ...governance.getAiGovernanceSettings().outputValidation, enabled: true, autoRepair: true, maxRepairAttempts: 1 },
});

let providerCalls = 0;
const outboundBodies = [];
globalThis.fetch = async (url, init) => {
  assert.match(String(url), /openrouter\.ai\/api\/v1\/chat\/completions/);
  providerCalls += 1;
  const body = JSON.parse(init.body);
  outboundBodies.push(body);
  const joined = JSON.stringify(body.messages);
  assert.doesNotMatch(joined, /Nguyễn Văn An|an@school\.edu\.vn/);
  assert.match(joined, /\[PERSON_1\]|FAILED OUTPUT/);
  const content = providerCalls === 1
    ? '{"title":"Student card","cards":[]}'
    : '{"title":"Student card","cards":[{"student":"[PERSON_1]","email":"[EMAIL_1]"}]}';
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

const response = await callAIWithMeta({
  provider: 'openrouter',
  apiKey: 'or-key',
  model: 'openrouter/free',
  baseUrl: 'https://openrouter.ai/api/v1',
  prompt: 'Tạo thẻ cho học sinh. Họ và tên: Nguyễn Văn An\nEmail: an@school.edu.vn',
  responseMimeType: 'application/json',
  validation: { kind: 'json', requiredFields: ['title', 'cards'], collectionKey: 'cards', expectedCount: 1 },
  fallback: false,
  maxOutputTokens: 500,
});
assert.equal(providerCalls, 2);
assert.match(response.text, /Nguyễn Văn An/);
assert.match(response.text, /an@school\.edu\.vn/);
assert.equal(response.meta.privacy.applied, true);
assert.equal(response.meta.privacy.restored, true);
assert.equal(response.meta.validation.valid, true);
assert.equal(response.meta.validation.repairAttempted, true);
assert.equal(response.meta.validation.repaired, true);
assert.equal(response.meta.providerCalls, 2);
assert.equal(outboundBodies[0].response_format?.type, 'json_object');

// Block mode must stop sensitive prompts before any provider request.
governance.saveAiGovernanceSettings({
  privacy: { ...governance.getAiGovernanceSettings().privacy, enabled: true, mode: 'block' },
});
let blockedFetchCalled = false;
globalThis.fetch = async () => { blockedFetchCalled = true; throw new Error('should not run'); };
await assert.rejects(
  () => callAIWithMeta({
    provider: 'openrouter',
    apiKey: 'or-key',
    prompt: 'Email học sinh: learner@school.edu.vn',
    fallback: false,
  }),
  (error) => error?.code === 'AI_PRIVACY_BLOCKED',
);
assert.equal(blockedFetchCalled, false);

console.log('✓ Privacy Filter masks personal data before provider transport.');
console.log('✓ Placeholder restoration returns usable names and contact data locally.');
console.log('✓ Output Guard validates JSON, schema and exact item count.');
console.log('✓ Invalid structured output is repaired automatically before apps receive it.');
console.log('✓ Strict privacy mode blocks sensitive requests before network access.');
