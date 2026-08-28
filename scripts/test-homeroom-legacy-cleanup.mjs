import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sanitizeWorkspaceBackupSnapshot,
  sanitizeWorkspaceRestoreSnapshot,
} from '../src/utils/homeroomProductionSafety.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const coreTabs = read('src/components/homeroom/HomeroomCoreTabs.jsx');
assert.doesNotMatch(coreTabs, /export function LearningTab\s*\(/, 'Retired LearningTab must not return to Homeroom UI.');
for (const retiredImport of ['addLearningRecord', 'updateGradeSettings', 'parseLearningFile', 'studentMetrics']) {
  assert.equal(coreTabs.includes(retiredImport), false, `Retired homeroom learning dependency must stay removed: ${retiredImport}`);
}
assert.match(coreTabs, /export function ScheduleTab\s*\(/, 'Adjacent ScheduleTab must remain intact after LearningTab removal.');

const gradebookStore = read('src/utils/gradebookWorkspaceStore.js');
assert.match(gradebookStore, /const GRADEBOOK_TABLE = 'bes_gradebook_workspaces'/, 'Gradebook must keep its dedicated cloud table.');
assert.match(gradebookStore, /migrated_from_homeroom/, 'Legacy-to-gradebook migration marker must remain until migration is complete.');
assert.match(gradebookStore, /loadHomeroomWorkspace/, 'Gradebook legacy fallback must remain while unmigrated classes may still exist.');
assert.match(gradebookStore, /learningRecords:/, 'Legacy learningRecords projection must remain available for migration.');

const conductTab = read('src/components/HomeroomConductTab.jsx');
assert.match(conductTab, /reopenConductWeek\(workspace, weekStart, actor, lockDialog\.reason\)/, 'Unlock UI must pass an explicit reason to the domain layer.');
assert.match(conductTab, /resetConductWeekData\(workspace, weekStart, actor, lockDialog\.reason\)/, 'Reset UI must pass an explicit reason to the domain layer.');
assert.match(conductTab, /Lý do mở khóa tuần/, 'Unlock dialog must visibly ask for a reason.');
assert.match(conductTab, /Lý do reset dữ liệu tuần/, 'Reset dialog must visibly ask for a reason.');
assert.match(conductTab, /lockDialog\.mode !== 'lock' && !String\(lockDialog\.reason \|\| ''\)\.trim\(\)/, 'Unlock/reset submit must reject an empty reason before password verification.');
assert.doesNotMatch(conductTab, /không cần nhập lý do/, 'UI must not tell users that unlock reasons are optional.');

const conductDomain = read('src/utils/homeroomConduct.js');
assert.match(conductDomain, /const reopenReason = safeText\(reason\);\s*if \(!reopenReason\) throw new Error\('Vui lòng nhập lý do mở khóa tuần\.'\);/, 'Domain must reject unlock without a reason.');
assert.match(conductDomain, /export function resetConductWeekData\(workspace, weekStart, actor = '', reason = ''\)/, 'Reset domain signature must accept an audit reason.');
assert.match(conductDomain, /const resetReason = safeText\(reason\);\s*if \(!resetReason\) throw new Error\('Vui lòng nhập lý do reset dữ liệu tuần\.'\);/, 'Domain must reject reset without a reason.');
assert.match(conductDomain, /reason: `\$\{resetReason\} · Đã xóa \$\{removedRecords\.length\} ghi nhận trong tuần`/, 'Reset history must preserve the supplied reason.');
assert.match(conductDomain, /reopenReason,\s*history,/, 'Reopen summary must persist reopenReason.');
assert.match(conductDomain, /resetBy: safeText\(actor\),\s*resetReason,/, 'Reset summary must persist resetReason.');

const phase3 = read('src/utils/homeroomPhase3.js');
assert.match(phase3, /sanitizeWorkspaceBackupSnapshot\(rest\)/, 'Backups must pass through the security snapshot sanitizer.');
assert.match(phase3, /sanitizeWorkspaceRestoreSnapshot\(backup\.snapshot, current\)/, 'Restore must sanitize the backup before normalization and UI commit.');

const rawBackup = {
  id: 'class-old',
  learning: { retired: true },
  learningTab: { selected: true },
  legacyPortal: { pin: 'OLD' },
  classProfile: { classType: 'homeroom', className: '12.6' },
  students: [{ id: 's1', code: '001', fullName: 'Student One', portalPin: '111111', pinUpdatedAt: 'old' }],
  learningRecords: [{ id: 'score-1', score: 8 }],
  portalConfig: { enabled: true, parentCode: 'PARENT-OLD', studentCode: 'STUDENT-OLD', subjectCode: 'SUBJECT-OLD', publishedAt: 'old' },
  conductSettings: { lockPasswordHash: 'OLD-HASH', lockPasswordChangedAt: 'old', lockPasswordChangedBy: 'Old user', lockPasswordUsesDefault: false, requireLockPassword: true, weeklyBaseScore: 100 },
};
const storedBackup = sanitizeWorkspaceBackupSnapshot(rawBackup);
assert.equal(storedBackup.learning, undefined, 'New backups must not store retired learning state.');
assert.equal(storedBackup.learningTab, undefined, 'New backups must not store retired LearningTab state.');
assert.equal(storedBackup.legacyPortal, undefined, 'New backups must not store retired portal state.');
assert.equal(storedBackup.students[0].portalPin, undefined, 'Backup snapshots must not retain reusable student PINs.');
assert.equal(storedBackup.portalConfig.enabled, false, 'Backup snapshot must not preserve active portal access.');
assert.equal(storedBackup.portalConfig.parentCode, '', 'Backup snapshot must not preserve parent access codes.');
assert.equal(storedBackup.conductSettings.lockPasswordHash, undefined, 'Backup snapshot must not retain conduct lock hashes.');
assert.equal(storedBackup.learningRecords.length, 1, 'Migration learningRecords must remain available in backups.');

const currentHomeroom = {
  id: 'class-current',
  status: 'active',
  archivedAt: '',
  classProfile: { classType: 'homeroom', className: '12.6' },
  students: [{ id: 's1', code: '001', fullName: 'Student One', portalPin: '999999', pinUpdatedAt: 'new' }],
  portalConfig: { enabled: false, parentCode: 'CURRENT-PARENT', studentCode: 'CURRENT-STUDENT' },
  settings: { privacyMode: 'cloud-only', inactivityLogoutMinutes: 45 },
  conductSettings: { lockPasswordHash: 'CURRENT-HASH', lockPasswordChangedAt: 'new', lockPasswordChangedBy: 'Teacher', lockPasswordUsesDefault: false, requireLockPassword: true },
};
const restoredHomeroom = sanitizeWorkspaceRestoreSnapshot(rawBackup, currentHomeroom);
assert.equal(restoredHomeroom.id, 'class-current', 'Restore must not change workspace identity.');
assert.equal(restoredHomeroom.classProfile.classType, 'homeroom', 'Restore must keep the current class ownership/type.');
assert.equal(restoredHomeroom.portalConfig.parentCode, 'CURRENT-PARENT', 'Restore must keep current access-control configuration.');
assert.equal(restoredHomeroom.settings.privacyMode, 'cloud-only', 'Restore must not downgrade current privacy mode.');
assert.equal(restoredHomeroom.conductSettings.lockPasswordHash, 'CURRENT-HASH', 'Restore must not roll back the conduct lock password.');
assert.equal(restoredHomeroom.students[0].portalPin, '999999', 'Restore must not revive an old student PIN.');
assert.equal(restoredHomeroom.learning, undefined, 'Restore must strip retired learning state before returning UI state.');
assert.equal(restoredHomeroom.learningRecords.length, 1, 'Restore must preserve gradebook migration data.');

const currentSubject = {
  ...currentHomeroom,
  id: 'subject-current',
  classProfile: { classType: 'subject', className: '12.3 English' },
};
const subjectSnapshot = {
  ...rawBackup,
  classProfile: { classType: 'homeroom', className: 'Old homeroom backup' },
  students: [{ id: 's1', code: '001', fullName: 'Student One', phone: '0900', parentName: 'Parent', parentPhone: '0911', parentEmail: 'p@example.com', address: 'Private address', portalPin: '111111' }],
};
const restoredSubject = sanitizeWorkspaceRestoreSnapshot(subjectSnapshot, currentSubject);
assert.equal(restoredSubject.classProfile.classType, 'subject', 'A backup must not promote a subject class back to homeroom.');
for (const forbidden of ['phone', 'parentName', 'parentPhone', 'parentEmail', 'address', 'portalPin', 'pinUpdatedAt']) {
  assert.equal(restoredSubject.students[0][forbidden], undefined, `Subject restore must strip PII/access field: ${forbidden}`);
}
assert.equal(restoredSubject.learningRecords.length, 1, 'Subject restore must retain learningRecords until Gradebook migration is complete.');

console.log('Homeroom legacy-cleanup, restore-safety and conduct-audit contract passed.');
