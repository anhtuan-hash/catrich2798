import fs from 'node:fs';
import assert from 'node:assert/strict';

const launchCss = fs.readFileSync(
  new URL('../public/attendance-windows8-launch.css', import.meta.url),
  'utf8',
);
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(
  launchCss,
  /\.attendance-layer\s*\{[^}]*animation-name\s*:\s*attendance-win8-layer-in/i,
  'Attendance backdrop must keep the Windows 8 launch animation enabled',
);

assert.match(
  launchCss,
  /\.attendance-shell\s*\{[^}]*animation-name\s*:\s*attendance-win8-shell-in/i,
  'Attendance app shell must keep the Windows 8 launch animation enabled',
);

assert.doesNotMatch(
  launchCss,
  /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)[\s\S]*?animation\s*:\s*none/i,
  'Attendance Windows 8 launch must not be disabled by reduced-motion preferences because this app effect is configured as always-on',
);

assert.match(
  indexHtml,
  /attendance-windows8-launch\.css\?v=2/i,
  'Attendance launch stylesheet must use a fresh cache-busting version so browsers receive the always-on animation immediately',
);

console.log('Attendance Windows 8 always-on launch contract OK');
