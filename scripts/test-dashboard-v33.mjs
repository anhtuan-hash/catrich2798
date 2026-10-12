import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('src/pages/WorkDashboard.jsx');
const style = read('src/styles/dashboard-unified-v33.css');
const existing = [
  'teacher-dashboard-google-authentic.css',
  'teacher-dashboard-calendar-split.css',
  'teacher-dashboard-compact-layout.css',
  'teacher-dashboard-google-colorful.css',
  'teacher-dashboard-editorial-hero.css',
  'teacher-dashboard-timeline-v2.css',
  'dashboard-command-center-v21.css',
  'dashboard-command-center-v22.css',
  'dashboard-command-center-v23.css',
  'dashboard-v3.css',
  'dashboard-v31.css',
  'dashboard-v32.css',
  'dashboard-command-center-v2.css',
];

assert.match(page, /import '..\/styles\/dashboard-unified-v33\.css';/);
const directCssImports = page.match(/import '..\/styles\/[^']+\.css';/g) || [];
assert.equal(directCssImports.length, 1, 'Dashboard should have ONE styling entrypoint');
for (const name of existing) {
  assert.ok(style.includes('@import "./' + name + '";'), 'Missing compatible layer: ' + name);
  assert.ok(!page.includes("import '../styles/" + name + "'"), 'Legacy CSS must not load separately: ' + name);
}
const imports = style.split('\n').filter(line => line.startsWith('@import '));
assert.equal(imports.length, existing.length);
assert.ok(imports[0].includes(existing[0]));
assert.ok(imports.at(-1).includes(existing.at(-1)));

assert.match(page, /gd-page gd-v31-page gd-v32-page gd-u33/);
assert.match(page, /<DashboardCommandCenter[\s\S]*?<DashboardDailyBrief[\s\S]*?<DashboardWeeklyPlanner/);
assert.match(style, /--u-blue:#286be8/);
assert.match(style, /--u-radius:18px/);
assert.match(style, /--u-panel:#ffffff/);
assert.match(style, /\.gd-v3-brief\s*\{/);
assert.match(style, /\.gd-v32-planner-head/);
assert.match(style, /\.dcc-stat--coral/);
assert.match(style, /\.dcc-stat--violet/);
assert.match(style, /\.dcc-stat--green/);
assert.match(style, /\.gd-calendar-header/);
assert.match(style, /\.brian-dashboard-drop-zone/);
assert.match(style, /\.dnh-head/);
assert.match(style, /\.gd-v31-midnight/);
assert.match(style, /@media\(max-width:640px\)/);
assert.match(style, /prefers-reduced-motion/);
assert.ok(style.indexOf('/* BRIAN Dashboard 3.3') > style.indexOf('@import "./dashboard-command-center-v2.css";'),
  'Unified design authority must follow all compatibility layers');
assert.doesNotMatch(style, /\nbody\s*\{/);
assert.doesNotMatch(style, /@keyframes/);
assert.ok(read('.github/workflows/dashboard-command-center-v2.yml').includes('test-dashboard-v33.mjs'),
  'Dashboard 3.3 regression coverage required');
console.log('PASS Dashboard 3.3: unified CSS entry, preserved layers, balanced Bento, layout hierarchy and dark/mobile scope.');
