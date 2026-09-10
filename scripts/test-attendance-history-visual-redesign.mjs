import fs from 'node:fs';
import assert from 'node:assert/strict';

const component = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const cssPath = new URL('../src/components/attendance/AttendanceHistoryV2.css', import.meta.url);
assert.ok(fs.existsSync(cssPath), 'Attendance History must use its own scoped stylesheet');
const css = fs.readFileSync(cssPath, 'utf8');

assert.match(component, /import ['"]\.\/attendance\/AttendanceHistoryV2\.css['"];/, 'History stylesheet must load after existing attendance styles');
assert.match(component, /attendance-history-layout attendance-history-v2/, 'History layout must expose the isolated scope');
assert.match(component, />Thông tin buổi học</, 'History detail must label the information section');
assert.match(component, />Tổng hợp điểm danh</, 'History detail must label the attendance summary section');
assert.match(component, /attendance-history-v2__hero-art/, 'History hero must include the education visual');
assert.match(component, /attendance-history-v2__info-icon/, 'Information cards must have visual icon tiles');
assert.match(component, /attendance-history-v2__summary-icon/, 'Attendance summary cards must have visual icon tiles');
assert.match(component, /attendance-history-v2__rate-ring/, 'Attendance rate must include a visual ring indicator');

for (const selector of [
  '.attendance-history-v2 .attendance-history-list',
  '.attendance-history-v2 .attendance-history-items > button',
  '.attendance-history-v2 .attendance-history-hero',
  '.attendance-history-v2 .attendance-history-info-grid',
  '.attendance-history-v2 .attendance-history-stat-grid',
  '.attendance-history-v2 .attendance-audit-actor-panel',
  '.attendance-history-v2 .attendance-history-proof',
]) assert.ok(css.includes(selector), `Scoped stylesheet must style ${selector}`);

assert.match(css, /--ahv2-blue\s*:/, 'History stylesheet must define its own blue accent token');
assert.match(css, /--ahv2-green\s*:/, 'History stylesheet must define its own green token');
assert.match(css, /--ahv2-red\s*:/, 'History stylesheet must define its own red token');
assert.match(css, /--ahv2-orange\s*:/, 'History stylesheet must define its own orange token');
assert.match(css, /@media\s*\(max-width:\s*900px\)/, 'History must have an isolated narrow-screen fallback');
assert.doesNotMatch(css, /(^|\n)\s*(html|body|:root)\s*\{/m, 'History stylesheet must not alter global page styles');

// Production screenshot regression: the search cannot be collapsed/hidden by legacy History selectors.
assert.match(
  css,
  /\.attendance-history-v2 \.attendance-history-list-head > \.attendance-history-search\s*\{[^}]*display:\s*flex\s*!important[^}]*visibility:\s*visible[^}]*opacity:\s*1/s,
  'History search must explicitly win over the legacy header rules',
);
assert.match(
  css,
  /\.attendance-history-v2 \.attendance-history-list-head > \.attendance-history-filters\s*\{[^}]*display:\s*block[^}]*grid-template-columns:\s*none/s,
  'Class-type filter must not inherit the old two-column last-child grid',
);

// V3 layout architecture: the detail column is a vertical flow, not a two-column dense CSS grid.
assert.match(
  css,
  /\.attendance-history-v2 \.attendance-history-detail\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*align-items:\s*stretch/s,
  'History detail must use a single vertical flow so proof/audit panels cannot leave large blank columns',
);
assert.doesNotMatch(
  css,
  /\.attendance-history-v2 \.attendance-history-detail\s*\{[^}]*grid-template-columns:/s,
  'History detail must not return to the old two-column grid',
);

// Desktop hierarchy: six info cards in 3 columns and all five attendance cards in one row.
assert.match(css, /\.attendance-history-v2 \.attendance-history-info-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s, 'Session information must use a balanced 3-column desktop grid');
assert.match(css, /\.attendance-history-v2 \.attendance-history-stat-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5,/s, 'All five attendance summary cards must share one desktop row');

// Audit and proof are independent full-width rows. Proof itself becomes a compact horizontal card.
assert.match(css, /\.attendance-history-v2 \.attendance-audit-actor-panel\s*\{[^}]*width:\s*100%[^}]*align-self:\s*stretch/s, 'Audit panel must use the full detail width without stretching another card');
assert.match(css, /\.attendance-history-v2 \.attendance-audit-actor-panel\.is-loading\s*\{[^}]*min-height:\s*0/s, 'Loading audit panel must stay compact');
assert.match(css, /\.attendance-history-v2 \.attendance-history-proof\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(220px,\s*1fr\)\s*minmax\(300px,\s*460px\)[^}]*width:\s*100%/s, 'Proof must be a compact full-width horizontal card');
assert.match(css, /\.attendance-history-v2 \.attendance-history-proof-image img\s*\{[^}]*max-height:\s*190px/s, 'Proof image must stay compact instead of dominating the viewport');

// Replace placeholder glyphs with the app SVG Icon component.
for (const iconName of ['teacher', 'book', 'calendar', 'clock', 'room', 'periods']) {
  assert.match(component, new RegExp(`<Icon name=["']${iconName}["']`), `Session info must render the ${iconName} SVG icon`);
}
for (const iconName of ['people', 'check', 'late', 'absent']) {
  assert.match(component, new RegExp(`<Icon name=["']${iconName}["']`), `Attendance summary must render the ${iconName} SVG icon`);
}

// Tardy remains a dedicated visible card while still included in present_count.
assert.match(component, /<article className="is-late">[\s\S]*?selectedLateRecords\.length[\s\S]*?<span>Đi trễ<\/span>/, 'History summary must expose a dedicated tardy card');
assert.match(component, /<article className="is-present">[\s\S]*?selectedSession\.present_count[\s\S]*?<span>Có mặt<\/span>/, 'Present count must remain sourced from present_count');

console.log('Attendance history production V3 layout contract OK');
