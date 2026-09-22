import fs from 'node:fs';
import assert from 'node:assert/strict';

const launchCss = fs.readFileSync(
  new URL('../public/attendance-windows8-launch.css', import.meta.url),
  'utf8',
);
const ttcmCss = fs.readFileSync(
  new URL('../src/components/GlobalTtcmNavigationTab.css', import.meta.url),
  'utf8',
);
const globalMotionCss = fs.readFileSync(
  new URL('../src/styles/v1159.css', import.meta.url),
  'utf8',
);

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
  ttcmCss,
  /\.ttcm-m3-layer\s*\{[\s\S]*?animation-name\s*:\s*ttcm-win8-layer-in/i,
  'TTCM backdrop must use the Windows 8 launch animation',
);

assert.match(
  ttcmCss,
  /\.ttcm-m3-shell\s*\{[\s\S]*?animation-name\s*:\s*ttcm-win8-shell-in/i,
  'TTCM app shell must use the Windows 8 launch animation',
);

assert.match(
  ttcmCss,
  /@keyframes\s+ttcm-win8-shell-in[\s\S]*?translate3d\([^)]*-190px\)[\s\S]*?scale\(\.78\)/i,
  'TTCM launch must include the Metro-style depth/zoom entrance',
);

assert.ok(globalMotionCss.includes(':not(.attendance-layer)'), 'Global motion retirement must exempt Attendance backdrop');
assert.ok(globalMotionCss.includes(':not(.attendance-shell)'), 'Global motion retirement must exempt Attendance shell');
assert.ok(globalMotionCss.includes(':not(.ttcm-m3-layer)'), 'Global motion retirement must exempt TTCM backdrop');
assert.ok(globalMotionCss.includes(':not(.ttcm-m3-shell)'), 'Global motion retirement must exempt TTCM shell');

console.log('Attendance + TTCM Windows 8 launch motion contract OK');
