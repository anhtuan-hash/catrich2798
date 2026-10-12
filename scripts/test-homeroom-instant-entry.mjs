import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  fastPreferredHomeroom,
  listFastHomeroomCatalog,
  readCachedAssignedHomeroom,
  rememberAssignedHomeroom,
} from '../src/utils/homeroomFastEntry.js';

const map = new Map();
globalThis.localStorage = {
  getItem: (key) => map.get(key) ?? null,
  setItem: (key, value) => map.set(key, value),
};
const user = { id: 'teacher-A', email: 'example@school.edu' };
const differentUser = { id: 'teacher-B' };
const index = [
  { id: 'school-10-5-2026-2027', className: '10.5', status: 'active' },
  { id: 'school-12-6-2026-2027', className: '12.6', status: 'active' },
];
map.set('bes-homeroom-workspace-index-v3:teacher-a', JSON.stringify(index));
map.set('bes-homeroom-class-types-v1:teacher-a', JSON.stringify({
  'school-10-5-2026-2027': 'subject',
  'school-12-6-2026-2027': 'homeroom',
}));
map.set('bes-homeroom-current-workspace-v3:teacher-a', 'school-10-5-2026-2027');

assert.deepEqual(fastPreferredHomeroom(user), {
  id: 'school-12-6-2026-2027', className: '12.6', source: 'indexed-homeroom',
});
assert.equal(readCachedAssignedHomeroom(user), null);
assert.equal(rememberAssignedHomeroom(user, { id: 'school-12-6-2026-2027', className: '12.6' }), true);
assert.equal(fastPreferredHomeroom(user)?.source, 'cached-server-assignment');
assert.equal(fastPreferredHomeroom(differentUser), null, 'Never leak last user's class across accounts');
assert.equal(fastPreferredHomeroom({}), null, 'Never use a guest cache');
assert.equal(listFastHomeroomCatalog(user).length, 2, 'Fast catalog uses index, no workspace payload needed');
map.set('bes-homeroom-class-types-v1:teacher-a', JSON.stringify({
  'school-10-5-2026-2027': 'homeroom', 'school-12-6-2026-2027': 'homeroom',
}));
map.delete('bes-assigned-homeroom-entry-v1:teacher-a');
assert.equal(fastPreferredHomeroom(user), null, 'Ambiguous local homeroom types must not be guessed');

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const bootstrap = read('src/applicationBootstrap.jsx');
const selected = read('src/preferredHomeroomEntry.js');
const workspace = read('src/pages/HomeroomWorkspace.jsx');
const start = bootstrap.split('async function startApplication() {')[1];
assert.doesNotMatch(start, /await preparePreferredHomeroomBeforeMain\(\)/, 'No remote RPC blocking entry');
assert.match(start, /void preparePreferredHomeroomBeforeMain\(\)/);
assert.match(selected, /readCachedAssignedHomeroom/);
assert.match(selected, /rememberAssignedHomeroom/);
assert.match(workspace, /fastPreferredHomeroom\(currentUser\)/);
assert.match(workspace, /listFastHomeroomCatalog\(currentUser\)/);
assert.match(workspace, /useState\(\(\) => getInitialWorkspace\(/, 'Do not deserialize class payload each render');
console.log('Homeroom instant-entry and account isolation checks passed.');
