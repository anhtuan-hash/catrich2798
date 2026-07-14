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
  clearCommandHistory,
  isCommandPinned,
  loadCommandCenterState,
  parseCommandQuery,
  recordCommandQuery,
  scoreCommandEntry,
  setCommandCenterMode,
  toggleCommandPinned,
} = await import('../src/ui-core/runtime/commandCenter.js');

const user = { id: 'teacher-1', email: 'teacher@example.com' };
assert.deepEqual(parseCommandQuery('> notifications', 'all'), { raw: '> notifications', query: 'notifications', normalized: 'notifications', mode: 'actions', prefix: '>' });
assert.equal(parseCommandQuery('@ quản lí', 'all').mode, 'workspaces');
assert.equal(parseCommandQuery('/ settings', 'all').mode, 'pages');
assert.equal(parseCommandQuery('# worksheet', 'all').mode, 'apps');
assert.equal(parseCommandQuery('worksheet', 'apps').mode, 'apps');

recordCommandQuery(user, 'worksheet', 'apps');
recordCommandQuery(user, 'worksheet', 'apps');
recordCommandQuery(user, 'notifications', 'actions');
let state = loadCommandCenterState(user);
assert.equal(state.history.length, 2);
assert.equal(state.history.find((item) => item.query === 'worksheet')?.count, 2);

state = toggleCommandPinned(user, 'tool:worksheet-factory');
assert.equal(isCommandPinned(state, 'tool:worksheet-factory'), true);
state = toggleCommandPinned(user, 'tool:worksheet-factory');
assert.equal(isCommandPinned(state, 'tool:worksheet-factory'), false);

state = setCommandCenterMode(user, 'workspaces');
assert.equal(state.lastMode, 'workspaces');

const exact = scoreCommandEntry({ title: 'Worksheet Factory', subtitle: '', keywords: 'worksheet factory' }, 'worksheet factory');
const loose = scoreCommandEntry({ title: 'Grammar Builder', subtitle: '', keywords: 'worksheet grammar' }, 'worksheet factory');
assert.ok(exact > loose);

state = clearCommandHistory(user);
assert.equal(state.history.length, 0);

console.log('V12.11.0 command center runtime tests PASS (15/15)');
