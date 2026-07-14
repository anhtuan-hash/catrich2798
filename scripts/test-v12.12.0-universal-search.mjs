import assert from 'node:assert/strict';

const store = new Map();
const session = new Map();
const dispatched = [];

globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
globalThis.BroadcastChannel = class BroadcastChannel { postMessage() {} close() {} };
globalThis.localStorage = {
  get length() { return store.size; },
  key(index) { return [...store.keys()][index] || null; },
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { store.set(key, String(value)); },
  removeItem(key) { store.delete(key); },
};
globalThis.window = {
  localStorage: globalThis.localStorage,
  sessionStorage: {
    getItem(key) { return session.has(key) ? session.get(key) : null; },
    setItem(key, value) { session.set(key, String(value)); },
    removeItem(key) { session.delete(key); },
  },
  location: { hash: '' },
  dispatchEvent(event) { dispatched.push(event); },
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
};

const user = { id: 'teacher-1', email: 'teacher@example.com', role: 'teacher', provider: 'local' };
store.set('bet-v4-history::guest', JSON.stringify([{ id: 'h1', title: 'Climate change worksheet', content: 'A complete B2 worksheet about biodiversity and renewable energy.', createdAt: '2026-07-14T08:00:00Z' }]));
store.set('bet-v4-prompts::guest', JSON.stringify([{ id: 'p1', title: 'THPT cloze prompt', body: 'Create a C1 cloze passage with answer key.', category: 'Assessment', createdAt: '2026-07-14T09:00:00Z' }]));
store.set('bet-v4-question-bank::guest', JSON.stringify([{ id: 'q1', question: 'Which option best completes the sentence?', options: ['A', 'B', 'C', 'D'], answer: 'A', topic: 'Grammar', level: 'B2', createdAt: '2026-07-14T10:00:00Z' }]));
store.set('bes-resource-library-v10-81', JSON.stringify({ version: 2, items: [
  { id: 'r1', title: 'Environment Unit 3', description: 'Global Success resource', extractedText: 'biodiversity conserve contaminate renewable', status: 'approved', visibility: 'department', uploaderId: 'other', createdAt: '2026-07-14T11:00:00Z' },
  { id: 'r2', title: 'Private manager file', description: 'secret', status: 'approved', visibility: 'private', uploaderId: 'other', createdAt: '2026-07-14T12:00:00Z' },
  { id: 'r3', title: 'Deleted file', description: 'removed', status: 'approved', visibility: 'department', deletedAt: '2026-07-14T12:00:00Z' },
] }));
store.set('brian-activity-center-v12.10:teacher-1', JSON.stringify({ items: [{ id: 'a1', category: 'work', title: 'Submit lesson plan', body: 'Due tomorrow', createdAt: Date.now(), read: false }] }));

const command = await import('../src/ui-core/runtime/commandCenter.js');
assert.equal(command.parseCommandQuery('~ biodiversity', 'all').mode, 'content');
assert.equal(command.parseCommandQuery('~ biodiversity', 'all').query, 'biodiversity');

const search = await import('../src/ui-core/runtime/universalSearchIndex.js');
const entries = search.buildUniversalSearchEntries({ user, language: 'vi' });
assert.ok(entries.some((entry) => entry.id === 'content:history:h1'));
assert.ok(entries.some((entry) => entry.id === 'content:prompt:p1'));
assert.ok(entries.some((entry) => entry.id === 'content:question:q1'));
assert.ok(entries.some((entry) => entry.id === 'content:resource:r1'));
assert.ok(entries.some((entry) => entry.id === 'content:activity:a1'));
assert.equal(entries.some((entry) => entry.id === 'content:resource:r2'), false);
assert.equal(entries.some((entry) => entry.id === 'content:resource:r3'), false);
assert.ok(entries.find((entry) => entry.id === 'content:resource:r1')?.keywords.includes('biodiversity'));

search.openUniversalSearchEntry(entries.find((entry) => entry.id === 'content:resource:r1'));
assert.equal(window.location.hash, '#/resource-library?resource=r1');
search.openUniversalSearchEntry(entries.find((entry) => entry.id === 'content:prompt:p1'));
assert.equal(window.location.hash, '#/library?tab=prompts&item=p1');
search.openUniversalSearchEntry(entries.find((entry) => entry.id === 'content:activity:a1'));
assert.ok(dispatched.some((event) => event.type === 'brian:activity-center-open' && event.detail?.tab === 'work'));

const savedTarget = search.readUniversalSearchTarget();
assert.equal(savedTarget.contentType, 'activity');
assert.equal(savedTarget.contentId, 'a1');

console.log('V12.12.0 Universal Search runtime tests PASS (18/18)');
