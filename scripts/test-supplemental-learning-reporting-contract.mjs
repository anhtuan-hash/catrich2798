import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/supplementalAttendanceReportingBootstrap.js', import.meta.url), 'utf8');
const legacyHistorySource = await readFile(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/SupplementalLearning.css', import.meta.url), 'utf8');

for (const value of ["['all','Tất cả']", "['remedial','Phụ đạo']", "['enrichment','Bồi dưỡng']", "['supplemental','Học bổ sung']"]) {
  assert.ok(source.includes(value), `missing activity filter ${value}`);
}
assert.ok(source.includes('BÁO CÁO HỌC BỔ SUNG KIẾN THỨC'), 'missing exact supplemental PDF title');
assert.match(source, /loadSupplementalHistory/);
assert.match(source, /loadSupplementalStudentReport/);
assert.match(source, /loadAttendanceActivities/);
assert.match(source, /buổi hủy không vào mẫu số/i, 'report must explain cancelled-session denominator rule');
assert.match(source, /window\.print\(\)/, 'supplemental report needs print/PDF path');

assert.match(source, /syncLegacyHistoryFilter/, 'activity filter must actively synchronize the existing History class-type filter');
assert.match(source, /enrichment[\s\S]{0,160}gifted|gifted[\s\S]{0,160}enrichment/, 'Bồi dưỡng activity filter must map to the legacy gifted class_type');
assert.match(legacyHistorySource, /<option value="remedial">Phụ đạo<\/option>/, 'legacy History remedial option must remain available');
assert.match(legacyHistorySource, /<option value="gifted">Bồi dưỡng HSG<\/option>/, 'legacy History gifted option must remain available');
assert.match(source, /renderLegacyActivityReport/, 'remedial/enrichment report filters must render a real filtered report instead of leaving the native report unchanged');
assert.match(source, /filter\s*!==\s*'all'/, 'a non-all activity filter must use a focused filtered surface');
assert.match(source, /presentCount|present_count/, 'filtered activity reports must expose present counts');
assert.match(source, /absentCount|absent_count/, 'filtered activity reports must expose absent counts');
assert.match(source, /tardyCount|tardy_count/, 'filtered activity reports must expose tardy counts');

const bindTabs = source.match(/function bindTabs\(\)\s*\{([\s\S]*?)\n\}\n\nfunction start\(\)/)?.[1] || '';
assert.ok(bindTabs, 'must expose bindTabs implementation for the reporting bootstrap');
assert.doesNotMatch(bindTabs, /if\s*\(detected\)\s*ensureFilter\(\)/, 'MutationObserver must not unconditionally rewrite the reporting filter on every DOM mutation');
assert.match(bindTabs, /detected\s*!==\s*observerActiveTab|observerActiveTab\s*!==\s*detected/, 'observer-driven tab detection must only render when the active History/Report tab actually changes');

const refreshPanel = source.match(/async function refreshPanel\([^)]*\)\s*\{([\s\S]*?)\n\}\n\nfunction bindTabs\(\)/)?.[1] || '';
assert.ok(refreshPanel, 'must expose refreshPanel implementation');
const allModeStart = refreshPanel.indexOf("if (filter === 'all') {");
const allModeEnd = refreshPanel.indexOf('const current = ++token;', allModeStart);
assert.ok(allModeStart >= 0 && allModeEnd > allModeStart, 'must expose a bounded Tất cả mode before filtered rendering begins');
const allMode = refreshPanel.slice(allModeStart, allModeEnd);
assert.match(allMode, /closePanel\(\)/, 'Tất cả must close the focused supplemental panel');
assert.match(allMode, /return;/, 'Tất cả must return before supplemental filtered rendering');
assert.doesNotMatch(allMode, /renderPanel\(/, 'Tất cả must not stack a supplemental panel below the native History/Report UI');
assert.doesNotMatch(allMode, /loadSupplementalHistory|loadSupplementalStudentReport/, 'Tất cả must not load a second supplemental report surface');

// Filtered History/Report must replace the native content area inside the same Attendance modal,
// not become a second fixed dialog with another page backdrop.
assert.match(source, /mountSupplementalWorkspace/, 'filtered reporting must mount into the shared Attendance workspace');
assert.doesNotMatch(source, /document\.body\.classList\.toggle\('bes-supplemental-report-exclusive'/, 'reporting must not use a body-level modal state');
assert.doesNotMatch(source, /document\.body\.classList\.remove\('bes-supplemental-report-exclusive'/, 'reporting cleanup must not depend on body overlay state');
assert.doesNotMatch(css, /\.bes-supplemental-reporting-panel\.is-exclusive\s*\{[^}]*position\s*:\s*fixed/i, 'filtered reporting must not be position:fixed');
assert.doesNotMatch(css, /body\.bes-supplemental-report-exclusive:after/, 'filtered reporting must not create a second backdrop');
assert.match(css, /\.bes-supplemental-reporting-workspace/, 'filtered reporting needs an inline workspace class');

console.log('supplemental learning reporting contract: ok');