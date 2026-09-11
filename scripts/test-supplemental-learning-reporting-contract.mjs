import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/supplementalAttendanceReportingBootstrap.js', import.meta.url), 'utf8');
const legacyHistorySource = await readFile(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../src/supplementalSingleModalBridge.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/SupplementalSingleModal.css', import.meta.url), 'utf8');

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
assert.match(legacyHistorySource, /<option value="remedial">Phụ đạo<\/option>/);
assert.match(legacyHistorySource, /<option value="gifted">Bồi dưỡng HSG<\/option>/);
assert.match(source, /renderLegacyActivityReport/);
assert.match(source, /presentCount|present_count/);
assert.match(source, /absentCount|absent_count/);
assert.match(source, /tardyCount|tardy_count/);

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
assert.match(allMode, /closePanel\(\)/);
assert.match(allMode, /return;/);
assert.doesNotMatch(allMode, /renderPanel\(/);
assert.doesNotMatch(allMode, /loadSupplementalHistory|loadSupplementalStudentReport/);

for(const token of ['bes-supplemental-reporting-panel','bes-supplemental-reporting-workspace','moveIntoAttendanceContent'])assert.ok(bridge.includes(token),`single-modal reporting bridge missing ${token}`);
assert.match(bridge,/normalizeReporting\(\)[\s\S]*?moveIntoAttendanceContent\(panel\)/,'filtered report/history must be moved into the native Attendance content');
assert.match(bridge,/normalizeReporting\(\)[\s\S]*?classList\.remove\('bes-supplemental-report-exclusive'\)/,'bridge must remove the body-level reporting modal state');
assert.match(css,/#bes-supplemental-reporting-panel\.bes-supplemental-reporting-workspace\.is-exclusive[\s\S]*?position:relative!important/,'filtered reporting must render inline instead of fixed');
assert.match(css,/body\.bes-supplemental-report-exclusive:after\{display:none!important;content:none!important\}/,'legacy reporting backdrop must never paint');

console.log('supplemental learning reporting contract: ok');