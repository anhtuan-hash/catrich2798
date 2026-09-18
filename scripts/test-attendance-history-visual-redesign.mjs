// Final verification contract for the isolated History V3 surface.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const component = read('src/components/GlobalAttendanceNavigationTab.jsx');
const css = read('src/components/attendance/AttendanceHistoryV2.css');
const legacyCss = read('public/attendance-ui-polish.css');
const stripJs = read('public/bes-remove-visible-search-bars.js');
const indexHtml = read('index.html');

assert.match(component, /import ['"]\.\/attendance\/AttendanceHistoryV2\.css['"];/, 'History stylesheet must stay explicitly loaded');
assert.match(component, /className="ahv3__shell"[^>]*data-attendance-history-v3="true"/, 'History must render from the isolated ahv3 root');
assert.match(component, /className="ahv3__search"[^>]*data-bes-keep-search="true"/, 'History search must be exempt from the global search-strip runtime');
assert.match(component, /className="ahv3__audit-actor-panel"/, 'Audit actor panel must be React-owned');
assert.match(component, /selectedSession\.checked_by \|\| 'Không ghi nhận'/, 'React-owned audit panel must render the stored check-in actor');
assert.match(component, /formatDateTime\(selectedSession\.checked_at\)/, 'React-owned audit panel must render the check-in timestamp');
assert.doesNotMatch(component, /className="[^"]*attendance-history-/, 'React History must not expose legacy attendance-history-* classes');

assert.doesNotMatch(indexHtml, /attendanceAuditActorsBootstrap\.js/, 'History audit MutationObserver bootstrap must no longer load in the application shell');
assert.doesNotMatch(component, /attendance-audit-/, 'History React must not depend on legacy audit DOM classes');

assert.match(component, />Thông tin buổi học</, 'History detail must label session information');
assert.match(component, />Tổng hợp điểm danh</, 'History detail must label attendance summary');
assert.match(component, /ahv3__hero-art/, 'History hero visual must remain present');
assert.match(component, /ahv3__info-icon/, 'Information cards must keep visual icon tiles');
assert.match(component, /ahv3__summary-icon/, 'Summary cards must keep visual icon tiles');
assert.match(component, /ahv3__rate-ring/, 'Attendance rate must keep the visual ring indicator');

assert.match(css, /\.ahv3__shell\s*\{/, 'V3 stylesheet root is missing');
assert.doesNotMatch(css, /\.attendance-history-/, 'V3 stylesheet must not contain legacy .attendance-history-* selectors');
assert.doesNotMatch(legacyCss, /\.ahv3__/, 'Legacy attendance-ui-polish.css must not target the V3 namespace');
assert.match(stripJs, /\[data-bes-keep-search="true"\]/, 'Global search-strip runtime must honor data-bes-keep-search');
assert.doesNotMatch(css, /(^|\n)\s*(html|body|:root)\s*\{/m, 'History stylesheet must not alter global page styles');
assert.match(css, /@media\s*\(max-width:\s*900px\)/, 'History must retain its narrow-screen fallback');

// Approved 2026-09-10 mockup: wider session rail and a compact two-column lower detail zone.
assert.match(
  css,
  /\/\* Approved history mockup final \*\/[\s\S]*?\.ahv3__shell\s*\{[^}]*grid-template-columns:\s*minmax\(320px,\s*360px\)\s+minmax\(0,\s*1fr\)/,
  'Approved mockup must use a 320–360px history session rail',
);
assert.match(
  css,
  /\.ahv3__shell \.ahv3__detail\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(0,\s*1\.05fr\)\s+minmax\(0,\s*\.95fr\)[^}]*overflow-y:\s*auto/s,
  'History detail must use the approved two-column compact grid',
);
assert.match(css, /\.ahv3__shell \.ahv3__info-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s, 'Session information must use three desktop columns');
assert.match(css, /\.ahv3__shell \.ahv3__stat-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5,/s, 'All five summary cards must share one desktop row');

for (const [selector, order] of [
  ['ahv3__hero', 1],
  ['ahv3__info-grid', 3],
  ['ahv3__stat-grid', 5],
  ['ahv3__audit-actor-panel', 6],
  ['ahv3__footer-grid', 9],
]) {
  assert.match(
    css,
    new RegExp(`\\.ahv3__shell \\.ahv3__detail > \\.${selector}\\s*\\{[^}]*grid-column:\\s*1\\s*\\/\\s*-1[^}]*order:\\s*${order}`, 's'),
    `${selector} must span the approved full-width row at order ${order}`,
  );
}
assert.match(
  css,
  /\.ahv3__shell \.ahv3__detail > \.ahv3__late-section\s*\{[^}]*grid-column:\s*1\s*\/\s*2[^}]*grid-row:\s*7[^}]*order:\s*7/s,
  'Tardy card must occupy the left half of the paired attendance-state row',
);
assert.match(
  css,
  /\.ahv3__shell \.ahv3__detail > \.ahv3__absent-section\s*\{[^}]*grid-column:\s*2\s*\/\s*3[^}]*grid-row:\s*7[^}]*order:\s*7/s,
  'Absent-student card must occupy the right half of the paired attendance-state row',
);
assert.match(
  css,
  /\.ahv3__shell \.ahv3__detail > \.ahv3__proof\s*\{[^}]*grid-column:\s*1\s*\/\s*-1[^}]*grid-row:\s*8[^}]*order:\s*8/s,
  'Proof card must sit below both attendance-state cards at full width',
);
assert.match(
  css,
  /\.ahv3__shell \.ahv3__detail:not\(:has\(> \.ahv3__proof\)\) > \.ahv3__footer-grid\s*\{[^}]*grid-row:\s*8/s,
  'Footer must close the gap when no proof image exists',
);
assert.match(css, /\.ahv3__shell \.ahv3__proof-image img\s*\{[^}]*max-height:\s*165px/s, 'Proof image must match the compact mockup height');
assert.match(css, /\.ahv3__shell \.ahv3__hero-art::after\s*\{[^}]*content:\s*['"]Tri thức\\A kiến tạo\\A tương lai['"]/s, 'Hero must carry the approved education quote decoration');
assert.match(css, /\.ahv3__shell \.attendance-absent-list\s*\{[^}]*max-height:\s*165px[^}]*overflow-y:\s*auto/s, 'Absent roster must stay bounded beside the proof image');

for (const iconName of ['teacher', 'book', 'calendar', 'clock', 'room', 'periods']) {
  assert.match(component, new RegExp(`<Icon name=["']${iconName}["']`), `Session info must render the ${iconName} SVG icon`);
}
for (const iconName of ['people', 'check', 'late', 'absent']) {
  assert.match(component, new RegExp(`<Icon name=["']${iconName}["']`), `Summary must render the ${iconName} SVG icon`);
}

assert.match(component, /<article className="is-late">[\s\S]*?selectedLateRecords\.length[\s\S]*?<span>Đi trễ<\/span>/, 'History summary must expose a dedicated tardy card');
assert.match(component, /<article className="is-present">[\s\S]*?selectedSession\.present_count[\s\S]*?<span>Có mặt<\/span>/, 'Present count must remain sourced from present_count');


// Approved 2026-09-18 timeline mockup.
assert.match(component, /data-attendance-history-timeline="true"/, 'History must opt into the new timeline workspace');
assert.match(component, /className="ahv3__timeline-toolbar"/, 'Timeline mockup must own the full-width toolbar');
assert.match(component, /className="ahv3__timeline-pane"/, 'Timeline mockup must render a dedicated history rail');
assert.match(component, /className="ahv3__timeline-item"/, 'History sessions must render as timeline cards');
assert.match(component, /className="ahv3__month-marker"/, 'History timeline must render month separators');
assert.match(component, /className="ahv3__detail-dashboard"/, 'Selected-session detail must use the dashboard composition');
assert.match(component, /className="ahv3__student-strip"/, 'Selected-session detail must preview students');
assert.match(component, /className="ahv3__session-note"/, 'Selected-session detail must include the mockup note card');
assert.match(component, /className="ahv3__session-log"/, 'Selected-session detail must expose an activity timeline');
assert.match(component, /className="ahv3__book-art"/, 'Selected-session hero must keep the open-book illustration hook');
assert.match(css, /\.ahv3__shell\[data-attendance-history-timeline="true"\]\s*\{[\s\S]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)/, 'Timeline workspace must reserve a full-width toolbar row');
assert.match(css, /\.ahv3__timeline-workspace\s*\{[\s\S]*grid-template-columns:\s*minmax\(500px,\s*\.96fr\)\s+minmax\(0,\s*1\.04fr\)/, 'Timeline/detail proportions must match the approved mockup');
assert.match(css, /\.ahv3__timeline-rail::before\s*\{[\s\S]*border-left:\s*2px\s+solid\s+#b9d6fb/, 'Timeline rail must use the mockup blue vertical line');
assert.match(css, /\.ahv3__month-marker\s*\{[\s\S]*border-radius:\s*999px/, 'Month markers must use compact pills');
assert.match(css, /\.ahv3__detail-dashboard\s*\{[\s\S]*background:\s*linear-gradient/, 'Selected-session dashboard must use the warm illustrated surface');
assert.match(css, /\.ahv3__student-strip\s*\{[\s\S]*display:\s*grid/, 'Student preview must use a stable grid');
assert.match(css, /\.ahv3__session-log\s*\{[\s\S]*position:\s*relative/, 'Session activity log must own its timeline positioning');
assert.match(css, /:has\(\.ahv3__shell\[data-attendance-history-timeline="true"\]\) \.ah-mockup-filterbar\s*\{[\s\S]*display:\s*none\s*!important/, 'Legacy injected activity filterbar must be hidden for the new React timeline workspace');

console.log('Attendance History V3 approved mockup contract OK');
