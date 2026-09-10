import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const component = read('src/components/GlobalAttendanceNavigationTab.jsx');
const timeAccess = read('src/attendanceTimeAccessBootstrap.js');
const compactSettings = read('src/attendanceCompactTimeSettings.js');

assert.match(
  component,
  /tab:\s*['"]config['"][\s\S]*?titleVi:\s*['"]Cấu hình['"]|titleVi:\s*['"]Cấu hình['"][\s\S]*?tab:\s*['"]config['"]/, 
  'Admin attendance navigation must expose a top-level Cấu hình tab.',
);
assert.match(
  component,
  /view\s*===\s*['"]config['"][\s\S]*?data-bes-attendance-time-settings-host=['"]true['"]/, 
  'The Cấu hình tab must own a stable settings host in React.',
);
assert.match(
  timeAccess,
  /querySelector\(['"]\[data-bes-attendance-time-settings-host=[^\]]+\]['"]\)/,
  'Attendance time settings runtime must mount into the React-owned settings host.',
);
assert.doesNotMatch(
  timeAccess,
  /tabs\.insertAdjacentElement\(['"]afterend['"],\s*panel\)/,
  'Attendance time settings must no longer be injected beside the tab bar.',
);
assert.doesNotMatch(
  compactSettings,
  /<b>Giờ GV<\/b>|tabs\.appendChild\(trigger\)|panel\.parentElement\s*!==\s*tabs/,
  'Legacy Giờ GV trigger/popover must be retired.',
);

console.log('Attendance configuration tab contract OK');
