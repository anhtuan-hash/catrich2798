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

// The audit slot is rendered by React in the History tree. The old standalone
// MutationObserver bootstrap must not be loaded after application startup.
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

assert.match(
  css,
  /\.ahv3__shell \.ahv3__detail\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*align-items:\s*stretch/s,
  'History detail must use a single vertical flow',
);
assert.doesNotMatch(
  css,
  /\.ahv3__shell \.ahv3__detail\s*\{[^}]*grid-template-columns:/s,
  'History detail must not return to the legacy two-column grid',
);
assert.match(css, /\.ahv3__shell \.ahv3__info-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s, 'Session information must use three desktop columns');
assert.match(css, /\.ahv3__shell \.ahv3__stat-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5,/s, 'All five summary cards must share one desktop row');

assert.match(css, /\.ahv3__shell \.ahv3__detail > \.ahv3__stat-grid\s*\{[^}]*order:\s*5/s, 'Summary row order contract is missing');
assert.match(css, /\.ahv3__shell \.ahv3__detail > \.ahv3__audit-actor-panel\s*\{[^}]*order:\s*6/s, 'Audit row must appear after summary');
assert.match(css, /\.ahv3__shell \.ahv3__detail > \.ahv3__proof\s*\{[^}]*order:\s*7/s, 'Proof row must appear after audit');
assert.match(css, /\.ahv3__shell \.ahv3__proof-image img\s*\{[^}]*max-height:\s*190px/s, 'Proof image must remain bounded');

for (const iconName of ['teacher', 'book', 'calendar', 'clock', 'room', 'periods']) {
  assert.match(component, new RegExp(`<Icon name=["']${iconName}["']`), `Session info must render the ${iconName} SVG icon`);
}
for (const iconName of ['people', 'check', 'late', 'absent']) {
  assert.match(component, new RegExp(`<Icon name=["']${iconName}["']`), `Summary must render the ${iconName} SVG icon`);
}

assert.match(component, /<article className="is-late">[\s\S]*?selectedLateRecords\.length[\s\S]*?<span>Đi trễ<\/span>/, 'History summary must expose a dedicated tardy card');
assert.match(component, /<article className="is-present">[\s\S]*?selectedSession\.present_count[\s\S]*?<span>Có mặt<\/span>/, 'Present count must remain sourced from present_count');

console.log('Attendance History V3 legacy isolation contract OK');
