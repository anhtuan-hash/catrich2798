import fs from 'node:fs';
import assert from 'node:assert/strict';

const component = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const cssPath = new URL('../src/components/attendance/AttendanceHistoryV2.css', import.meta.url);
assert.ok(fs.existsSync(cssPath), 'Attendance History V2 must use its own scoped stylesheet');
const css = fs.readFileSync(cssPath, 'utf8');

assert.match(component, /import ['"]\.\/attendance\/AttendanceHistoryV2\.css['"];/, 'History V2 stylesheet must load after existing attendance styles');
assert.match(component, /attendance-history-layout attendance-history-v2/, 'History layout must expose the isolated V2 scope');
assert.match(component, />Thông tin buổi học</, 'History detail must label the information section');
assert.match(component, />Tổng hợp điểm danh</, 'History detail must label the attendance summary section');
assert.match(component, /attendance-history-v2__hero-art/, 'Approved mockup hero must include a decorative education visual');
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

assert.match(css, /--ahv2-blue\s*:/, 'V2 stylesheet must define its own blue accent token');
assert.match(css, /--ahv2-green\s*:/, 'V2 stylesheet must define its own green token');
assert.match(css, /--ahv2-red\s*:/, 'V2 stylesheet must define its own red token');
assert.match(css, /--ahv2-orange\s*:/, 'V2 stylesheet must define its own orange token');
assert.match(css, /@media\s*\(max-width:\s*900px\)/, 'History V2 must have an isolated narrow-screen fallback');
assert.doesNotMatch(css, /(^|\n)\s*(html|body|:root)\s*\{/m, 'History V2 must not alter global page styles');

// Production screenshot polish contract: search must stay visible and compact.
assert.match(css, /\.attendance-history-v2 \.attendance-history-search\s*\{[^}]*display:\s*flex/s, 'History search must be visible');
assert.doesNotMatch(css, /\.attendance-history-v2 \.attendance-history-search\s*\{[^}]*display:\s*none/s, 'History search must never be hidden by V2');
assert.match(css, /\.attendance-history-v2 \.attendance-history-filters\s*\{[^}]*margin-top:\s*8px/s, 'Filter must sit directly below search without the old blank gap');

// Audit and proof cards share a grid row, but neither may stretch to the other card height.
assert.match(css, /\.attendance-history-v2 \.attendance-audit-actor-panel\s*\{[^}]*align-self:\s*start/s, 'Audit panel must not stretch to proof-image height');
assert.match(css, /\.attendance-history-v2 \.attendance-history-proof\s*\{[^}]*align-self:\s*start/s, 'Proof panel must keep intrinsic height');
assert.match(css, /\.attendance-history-v2 \.attendance-audit-actor-panel\.is-loading\s*\{[^}]*min-height:\s*0/s, 'Loading audit panel must stay compact');

// Replace placeholder glyphs with the app SVG Icon component.
for (const iconName of ['teacher', 'book', 'calendar', 'clock', 'room', 'periods']) {
  assert.match(component, new RegExp(`<Icon name=["']${iconName}["']`), `Session info must render the ${iconName} SVG icon`);
}
for (const iconName of ['people', 'check', 'late', 'absent']) {
  assert.match(component, new RegExp(`<Icon name=["']${iconName}["']`), `Attendance summary must render the ${iconName} SVG icon`);
}

// Tardy deserves its own visible summary card while remaining included in present_count.
assert.match(component, /<article className="is-late">[\s\S]*?selectedLateRecords\.length[\s\S]*?<span>Đi trễ<\/span>/, 'History summary must expose a dedicated tardy card');
assert.match(component, /<article className="is-present">[\s\S]*?selectedSession\.present_count[\s\S]*?<span>Có mặt<\/span>/, 'Present count must remain sourced from present_count');

// The vertical rhythm should be denser than the first V2 release.
assert.match(css, /\.attendance-history-v2 \.attendance-history-hero\s*\{[^}]*min-height:\s*118px/s, 'History hero must use the compact height');
assert.match(css, /\.attendance-history-v2 \.attendance-history-items > button\s*\{[^}]*min-height:\s*88px/s, 'History session cards must use the compact height');

console.log('Attendance history visual redesign + polish contract OK');
