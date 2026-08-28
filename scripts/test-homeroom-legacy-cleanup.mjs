import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  reopenConductWeek,
  resetConductWeekData,
} from '../src/utils/homeroomConduct.js';

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
assert.doesNotMatch(conductTab, /không cần nhập lý do/, 'UI must not tell users that unlock reasons are optional.');

function lockedWorkspace() {
  return {
    id: 'conduct-test',
    classProfile: { className: '12.6', schoolYear: '2026-2027', grade: '12' },
    students: [{ id: 's1', fullName: 'Test Student', active: true }],
    conductRecords: [],
    conductWeekSummaries: [{
      id: 'week-1',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-30',
      status: 'locked',
      history: [],
      rows: [],
      stats: {},
      createdAt: '2026-08-24T00:00:00.000Z',
      updatedAt: '2026-08-24T00:00:00.000Z',
    }],
  };
}

assert.throws(
  () => reopenConductWeek(lockedWorkspace(), '2026-08-24', 'Teacher', ''),
  /lý do mở khóa tuần/i,
  'Domain layer must reject unlock without a reason.',
);
assert.throws(
  () => resetConductWeekData(lockedWorkspace(), '2026-08-24', 'Teacher', ''),
  /lý do reset dữ liệu tuần/i,
  'Domain layer must reject reset without a reason.',
);

const reopened = reopenConductWeek(lockedWorkspace(), '2026-08-24', 'Teacher', 'Sửa nhầm ghi nhận ngày 26/08');
const reopenedSummary = reopened.conductWeekSummaries.find((item) => item.weekStart === '2026-08-24');
assert.equal(reopenedSummary?.status, 'open');
assert.equal(reopenedSummary?.reopenReason, 'Sửa nhầm ghi nhận ngày 26/08');
assert.equal(reopenedSummary?.history?.at(-1)?.reason, 'Sửa nhầm ghi nhận ngày 26/08');

const reset = resetConductWeekData(lockedWorkspace(), '2026-08-24', 'Teacher', 'Dữ liệu thử nghiệm nhập nhầm');
const resetSummary = reset.conductWeekSummaries.find((item) => item.weekStart === '2026-08-24');
assert.equal(resetSummary?.resetReason, 'Dữ liệu thử nghiệm nhập nhầm');
assert.match(resetSummary?.history?.at(-1)?.reason || '', /Dữ liệu thử nghiệm nhập nhầm/);

console.log('Homeroom legacy-cleanup and conduct-audit contract passed.');
