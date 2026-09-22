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
const attendanceComponent = fs.readFileSync(
  new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url),
  'utf8',
);
const ttcmComponent = fs.readFileSync(
  new URL('../src/components/GlobalTtcmNavigationTab.jsx', import.meta.url),
  'utf8',
);
const motionRuntime = fs.readFileSync(
  new URL('../src/utils/globalMotionSystem.js', import.meta.url),
  'utf8',
);

assert.doesNotMatch(
  launchCss,
  /\.attendance-layer\s*\{[^}]*animation-name/i,
  'Attendance backdrop must stay static so only one app-open animation is visible',
);

assert.match(
  launchCss,
  /\.attendance-shell\s*\{[^}]*animation-name\s*:\s*attendance-win8-shell-in/i,
  'Attendance app shell must keep the Windows 8 launch animation enabled',
);

assert.match(
  launchCss,
  /@keyframes\s+attendance-win8-shell-in[\s\S]*?0%[\s\S]*?100%/i,
  'Attendance launch must be a single continuous 0-to-100 motion',
);

assert.doesNotMatch(
  launchCss,
  /@keyframes\s+attendance-win8-shell-in[\s\S]*?(46%|72%)/i,
  'Attendance launch must not use the previous multi-stage overshoot',
);

assert.doesNotMatch(
  launchCss,
  /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)[\s\S]*?animation\s*:\s*none/i,
  'Attendance Windows 8 launch must not be disabled by reduced-motion preferences because this app effect is configured as always-on',
);

assert.doesNotMatch(
  ttcmCss,
  /\.ttcm-m3-layer\s*\{[\s\S]*?animation-name/i,
  'TTCM backdrop must stay static so only one app-open animation is visible',
);

assert.match(
  ttcmCss,
  /\.ttcm-m3-shell\s*\{[\s\S]*?animation-name\s*:\s*ttcm-win8-shell-in/i,
  'TTCM app shell must use the Windows 8 launch animation',
);

assert.match(
  ttcmCss,
  /@keyframes\s+ttcm-win8-shell-in[\s\S]*?0%[\s\S]*?100%/i,
  'TTCM launch must be a single continuous 0-to-100 motion',
);

assert.doesNotMatch(
  ttcmCss,
  /@keyframes\s+ttcm-win8-shell-in[\s\S]*?(48%|76%)/i,
  'TTCM launch must not use the previous multi-stage overshoot',
);

assert.ok(attendanceComponent.includes('data-global-motion-isolate="true"'), 'Attendance overlay must isolate its app-owned launch motion');
assert.ok(ttcmComponent.includes('data-global-motion-isolate="true"'), 'TTCM overlay must isolate its app-owned launch motion');
assert.ok(motionRuntime.includes('MOTION_ISOLATION_SELECTOR'), 'Global motion runtime must recognize isolated app-owned motion');
assert.ok(motionRuntime.includes('isMotionIsolated(node)'), 'Global motion runtime must skip isolated modal/list entrants');

assert.ok(globalMotionCss.includes(':not(.attendance-shell)'), 'Global motion retirement must exempt Attendance shell');
assert.ok(globalMotionCss.includes(':not(.ttcm-m3-shell)'), 'Global motion retirement must exempt TTCM shell');
assert.ok(!globalMotionCss.includes(':not(.attendance-layer)'), 'Attendance backdrop must remain under the global static-motion reset');
assert.ok(!globalMotionCss.includes(':not(.ttcm-m3-layer)'), 'TTCM backdrop must remain under the global static-motion reset');

console.log('Attendance + TTCM Windows 8 launch motion contract OK');
