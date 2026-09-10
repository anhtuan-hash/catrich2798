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

console.log('Attendance history visual redesign contract OK');
