// Final verification contract for the isolated History V3 surface.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const component = read('src/components/GlobalAttendanceNavigationTab.jsx');
const css = read('src/components/attendance/AttendanceHistoryV2.css');
const legacyCss = read('public/attendance-ui-polish.css');
const stripJs = read('public/bes-remove-visible-search-bars.js');
const indexHtml = read('index.html');
const legacyMockupRuntime = read('public/attendance-history-mockup-v4.js');
const legacyV5Runtime = read('public/attendance-history-v5.js');
const legacyV6Runtime = read('public/attendance-history-pixel-v6.js');
const historyPostConfirmBridge = read('src/attendanceHistoryPostConfirmBridge.js');
const attendanceTimeAccess = read('src/attendanceTimeAccessBootstrap.js');

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
assert.match(component, /ahv3__timeline-pane/, 'Timeline mockup must render a dedicated history rail');
assert.match(component, /ahv3__timeline-item/, 'History sessions must render as timeline cards');
assert.match(component, /className="ahv3__month-marker"/, 'History timeline must render month separators');
assert.match(component, /ahv3__detail-dashboard/, 'Selected-session detail must use the dashboard composition');
assert.match(component, /className="ahv3__student-strip"/, 'Selected-session detail must preview students');
assert.match(component, /className="ahv3__session-note"/, 'Selected-session detail must include the mockup note card');
assert.match(component, /className="ahv3__session-log"/, 'Selected-session detail must expose an activity timeline');
assert.match(component, /ahv3__book-art/, 'Selected-session hero must keep the open-book illustration hook');
assert.match(css, /\.ahv3__shell\[data-attendance-history-timeline="true"\]\s*\{[\s\S]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)/, 'Timeline workspace must reserve a full-width toolbar row');
assert.match(css, /\.ahv3__timeline-workspace\s*\{[\s\S]*grid-template-columns:\s*minmax\(500px,\s*\.96fr\)\s+minmax\(0,\s*1\.04fr\)/, 'Timeline/detail proportions must match the approved mockup');
assert.match(css, /\.ahv3__timeline-rail::before\s*\{[\s\S]*border-left:\s*2px\s+solid\s+#b9d6fb/, 'Timeline rail must use the mockup blue vertical line');
assert.match(css, /\.ahv3__month-marker\s*\{[\s\S]*border-radius:\s*999px/, 'Month markers must use compact pills');
assert.match(css, /\.ahv3__detail-dashboard\s*\{[\s\S]*background:\s*linear-gradient/, 'Selected-session dashboard must use the warm illustrated surface');
assert.match(css, /\.ahv3__student-strip\s*\{[\s\S]*display:\s*grid/, 'Student preview must use a stable grid');
assert.match(css, /\.ahv3__session-log\s*\{[\s\S]*position:\s*relative/, 'Session activity log must own its timeline positioning');
assert.match(css, /:has\(\.ahv3__shell\[data-attendance-history-timeline="true"\]\) \.ah-mockup-filterbar\s*\{[\s\S]*display:\s*none\s*!important/, 'Legacy injected activity filterbar must be hidden for the new React timeline workspace');


// New timeline must be isolated from the retired V4/V5/V6 DOM mutators.
for (const [name, source] of [
  ['V4 mockup runtime', legacyMockupRuntime],
  ['V5 runtime', legacyV5Runtime],
  ['V6 pixel runtime', legacyV6Runtime],
]) {
  assert.match(source, /data-attendance-history-timeline/, `${name} must explicitly detect the React timeline root`);
  assert.match(source, /classList\.remove\([^)]*ah-history/, `${name} must remove its legacy shell class when the timeline root is active`);
}
assert.match(historyPostConfirmBridge, /data-bes-history-post-confirm-bridge/, 'History post-confirm bridge must keep an explicit compatibility marker');
assert.match(attendanceTimeAccess, /:not\(\[data-bes-history-post-confirm-bridge\]\)/, 'Time-access runtime must ignore the hidden History compatibility rollcall');
assert.doesNotMatch(attendanceTimeAccess, /document\.querySelector\('\.attendance-rollcall'\)/, 'Time-access runtime must not bind to the first generic rollcall because History owns a hidden bridge');


// Timeline production hardening: stale V4/V5/V6 assets must not be able to recreate the three-column regression.
assert.match(indexHtml, /attendance-history-mockup-v4\.js\?v=3/, 'V4 history runtime cache key must be bumped after timeline isolation fix');
assert.match(indexHtml, /attendance-history-v5\.js\?v=4/, 'V5 history runtime cache key must be bumped after timeline isolation fix');
assert.match(indexHtml, /attendance-history-pixel-v6\.js\?v=2/, 'V6 history runtime cache key must be bumped after timeline isolation fix');
assert.match(
  css,
  /body \.attendance-shell:has\(\.ahv3__shell\[data-attendance-history-timeline="true"\]\) \.ah-mockup-filterbar\s*\{[^}]*display:\s*none\s*!important/s,
  'Timeline must hide the legacy injected filterbar even when stale legacy shell classes survive',
);
assert.match(
  css,
  /body \.attendance-shell:has\(\.ahv3__shell\[data-attendance-history-timeline="true"\]\) \.ahv3__shell\[data-attendance-history-timeline="true"\]\s*\{[^}]*grid-template-columns:\s*1fr\s*!important/s,
  'Timeline root must force one-column root structure regardless of stale V4/V5 shell classes',
);
assert.match(
  css,
  /body \.attendance-shell:has\(\.ahv3__shell\[data-attendance-history-timeline="true"\]\) \.ahv3__timeline-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(500px,\s*\.96fr\)\s+minmax\(0,\s*1\.04fr\)\s*!important/s,
  'Timeline workspace must harden the intended two-column rail/detail split',
);
assert.match(
  css,
  /body \.attendance-shell:has\(\.ahv3__shell\[data-attendance-history-timeline="true"\]\) \.bes-post-confirm-edit-card\.is-open\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+minmax\(150px,\s*auto\)/s,
  'Post-confirm editor summary must remain readable in the timeline detail pane',
);

console.log('Attendance History V3 approved mockup contract OK');
