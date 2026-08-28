import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

console.log('Homeroom legacy-cleanup and conduct-audit source contract passed.');
