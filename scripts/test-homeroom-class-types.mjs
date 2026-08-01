import assert from 'node:assert/strict';
import {
  HOMEROOM_CLASS_TYPE,
  SUBJECT_CLASS_TYPE,
  applyCatalogClassType,
  getDefaultClassTab,
  isClassTabAllowed,
  reconcileHomeroomClassCatalog,
} from '../src/utils/homeroomClassTypes.js';

const legacy = reconcileHomeroomClassCatalog([
  { id: 'class-a', status: 'active', classType: SUBJECT_CLASS_TYPE },
  { id: 'class-b', status: 'active', classType: SUBJECT_CLASS_TYPE },
], 'class-b');
assert.equal(legacy.find((item) => item.id === 'class-b').classType, HOMEROOM_CLASS_TYPE);
assert.equal(legacy.filter((item) => item.classType === HOMEROOM_CLASS_TYPE).length, 1);

const stable = reconcileHomeroomClassCatalog(legacy, 'class-a');
assert.equal(stable.find((item) => item.id === 'class-b').classType, HOMEROOM_CLASS_TYPE);
assert.equal(stable.find((item) => item.id === 'class-a').classType, SUBJECT_CLASS_TYPE);

const explicitSubjects = reconcileHomeroomClassCatalog([
  { id: 'subject-a', status: 'active', classType: SUBJECT_CLASS_TYPE, classTypeExplicit: true },
  { id: 'subject-b', status: 'active', classType: SUBJECT_CLASS_TYPE, classTypeExplicit: true },
]);
assert.equal(explicitSubjects.filter((item) => item.classType === HOMEROOM_CLASS_TYPE).length, 0);

const conflict = reconcileHomeroomClassCatalog([
  { id: 'home-a', status: 'active', classType: HOMEROOM_CLASS_TYPE, classTypeExplicit: true },
  { id: 'home-b', status: 'active', classType: HOMEROOM_CLASS_TYPE, classTypeExplicit: true },
  { id: 'old-home', status: 'archived', classType: HOMEROOM_CLASS_TYPE, classTypeExplicit: true },
], 'home-b');
assert.equal(conflict.find((item) => item.id === 'home-b').classType, HOMEROOM_CLASS_TYPE);
assert.equal(conflict.find((item) => item.id === 'home-a').classType, SUBJECT_CLASS_TYPE);
assert.equal(conflict.find((item) => item.id === 'old-home').classType, HOMEROOM_CLASS_TYPE);

const explicitBeatsLegacy = reconcileHomeroomClassCatalog([
  { id: 'legacy-current', status: 'active', classType: HOMEROOM_CLASS_TYPE },
  { id: 'explicit-home', status: 'active', classType: HOMEROOM_CLASS_TYPE, classTypeExplicit: true },
], 'legacy-current');
assert.equal(explicitBeatsLegacy.find((item) => item.id === 'explicit-home').classType, HOMEROOM_CLASS_TYPE);
assert.equal(explicitBeatsLegacy.find((item) => item.id === 'legacy-current').classType, SUBJECT_CLASS_TYPE);

const subjectWorkspace = { id: 'subject-a', classProfile: { classType: SUBJECT_CLASS_TYPE } };
assert.equal(getDefaultClassTab(subjectWorkspace), 'learning');
assert.equal(isClassTabAllowed('students', subjectWorkspace), true);
assert.equal(isClassTabAllowed('learning', subjectWorkspace), true);
assert.equal(isClassTabAllowed('classes', subjectWorkspace), true);
assert.equal(isClassTabAllowed('parents', subjectWorkspace), false);
assert.equal(isClassTabAllowed('conduct', subjectWorkspace), false);
assert.equal(isClassTabAllowed('schoolStats', subjectWorkspace, true), true);

const applied = applyCatalogClassType(
  { id: 'subject-a', classProfile: { classType: HOMEROOM_CLASS_TYPE, className: '11.4' } },
  [{ id: 'subject-a', classType: SUBJECT_CLASS_TYPE }],
);
assert.equal(applied.classProfile.classType, SUBJECT_CLASS_TYPE);
assert.equal(applied.classProfile.className, '11.4');

const memory = new Map();
globalThis.localStorage = {
  get length() { return memory.size; },
  key(index) { return [...memory.keys()][index] ?? null; },
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(String(key), String(value)); },
  removeItem(key) { memory.delete(String(key)); },
  clear() { memory.clear(); },
};

const {
  createHomeroomWorkspace,
  listLocalHomeroomWorkspaces,
  loadHomeroomWorkspace,
  normalizeHomeroomWorkspace,
  saveHomeroomWorkspace,
} = await import('../src/utils/homeroomClassWorkspaceStore.js');
const user = { email: 'teacher@pek.edu.vn' };
localStorage.setItem('bes-homeroom-workspace-v1:teacher@pek.edu.vn:legacy-a', JSON.stringify({ id: 'legacy-a', status: 'active', classProfile: { className: '10.1' }, students: [] }));
localStorage.setItem('bes-homeroom-workspace-v1:teacher@pek.edu.vn:legacy-b', JSON.stringify({ id: 'legacy-b', status: 'active', classProfile: { className: '10.2' }, students: [] }));
localStorage.setItem('bes-homeroom-current-workspace-v3:teacher@pek.edu.vn', 'legacy-b');
const migrated = listLocalHomeroomWorkspaces(user);
assert.equal(migrated.find((item) => item.id === 'legacy-b').classType, HOMEROOM_CLASS_TYPE);
assert.equal(migrated.find((item) => item.id === 'legacy-a').classType, SUBJECT_CLASS_TYPE);
localStorage.setItem('bes-homeroom-current-workspace-v3:teacher@pek.edu.vn', 'legacy-a');
const migratedAgain = listLocalHomeroomWorkspaces(user);
assert.equal(migratedAgain.find((item) => item.id === 'legacy-b').classType, HOMEROOM_CLASS_TYPE);
assert.equal(migratedAgain.find((item) => item.id === 'legacy-a').classType, SUBJECT_CLASS_TYPE);
assert.equal(normalizeHomeroomWorkspace({ id: 'default', classProfile: {} }).classProfile.classType, HOMEROOM_CLASS_TYPE);
assert.equal(normalizeHomeroomWorkspace({ id: 'class-new', classProfile: {} }).classProfile.classType, SUBJECT_CLASS_TYPE);

const blocked = await createHomeroomWorkspace(user, { id: 'new-home', classProfile: { className: '10.3', classType: HOMEROOM_CLASS_TYPE } });
assert.equal(blocked.ok, false);
assert.equal(blocked.code, 'active-homeroom-exists');
const currentHome = (await loadHomeroomWorkspace(user, 'legacy-b')).workspace;
await saveHomeroomWorkspace({ ...currentHome, classProfile: { ...currentHome.classProfile, classType: SUBJECT_CLASS_TYPE } }, user);
const created = await createHomeroomWorkspace(user, { id: 'new-home', classProfile: { className: '10.3', classType: HOMEROOM_CLASS_TYPE } });
assert.equal(created.ok, true);
assert.equal(created.workspace.classProfile.classType, HOMEROOM_CLASS_TYPE);
const afterCreate = listLocalHomeroomWorkspaces(user);
assert.equal(afterCreate.filter((item) => item.status !== 'archived' && item.classType === HOMEROOM_CLASS_TYPE).length, 1);
assert.equal(afterCreate.find((item) => item.id === 'new-home').classType, HOMEROOM_CLASS_TYPE);
delete globalThis.localStorage;

console.log('✓ Phân loại lớp và giới hạn một lớp chủ nhiệm hoạt động hợp lệ.');
