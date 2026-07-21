import assert from 'node:assert/strict';

const store = new Map();
globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
globalThis.BroadcastChannel = class BroadcastChannel { postMessage() {} close() {} };
globalThis.window = {
  localStorage: {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
  },
  dispatchEvent() {},
};

const {
  clearActivityState,
  loadActivityState,
  markActivityRead,
  markAllActivitiesRead,
  recordActivity,
} = await import('../src/ui-core/runtime/activityCenter.js');

const user = { id: 'teacher-1', email: 'teacher@example.com' };
recordActivity(user, { id: 'notice-1', category: 'notification', title: 'New assignment', body: 'Prepare Unit 3', createdAt: 1000 });
recordActivity(user, { id: 'sync-summary', category: 'sync', title: 'Sync', status: 'pending', createdAt: 2000 });
recordActivity(user, { id: 'ai-current', category: 'ai', title: 'AI running', status: 'running', createdAt: 3000 });
let state = loadActivityState(user);
assert.equal(state.items.length, 3);
assert.equal(state.items[0].category, 'ai');
assert.equal(state.items.filter((item) => !item.read).length, 3);

state = markActivityRead(user, 'notice-1');
assert.equal(state.items.find((item) => item.id === 'notice-1')?.read, true);
state = markAllActivitiesRead(user, 'ai');
assert.equal(state.items.find((item) => item.id === 'ai-current')?.read, true);

recordActivity(user, { id: 'sync-summary', category: 'sync', title: 'Synced', status: 'completed', createdAt: 4000 }, { replace: true });
state = loadActivityState(user);
assert.equal(state.items.filter((item) => item.id === 'sync-summary').length, 1);
assert.equal(state.items.find((item) => item.id === 'sync-summary')?.status, 'completed');

state = clearActivityState(user, 'sync');
assert.equal(state.items.some((item) => item.category === 'sync'), false);
state = clearActivityState(user);
assert.equal(state.items.length, 0);

console.log('V12.10.0 activity runtime tests PASS (10/10)');
