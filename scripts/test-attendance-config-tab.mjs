import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const bridge = read('src/attendanceCompactTimeSettings.js');
const css = read('src/styles/AttendanceCompactTimeSettings.css');

assert.match(bridge, /from ['"]react['"]/, 'Configuration tab bridge must be React-owned.');
assert.match(bridge, /createPortal/, 'Configuration tab must render into the Attendance tab bar/content through React portals.');
assert.match(bridge, /createRoot/, 'Configuration bridge must mount through a React root.');
assert.match(bridge, /Cấu hình/, 'Attendance must expose the Cấu hình tab label.');
assert.match(bridge, /bes-attendance-config-tab/, 'Configuration tab must have a dedicated stable class.');
assert.match(bridge, /data-bes-attendance-time-settings-host/, 'Configuration view must expose a stable host for the existing teacher-hour settings panel.');
assert.match(bridge, /SYSTEM_ROLES\.ADMIN/, 'Configuration tab must remain admin-only.');
assert.match(bridge, /bes-attendance-config-active/, 'Configuration mode must be explicit on the Attendance shell.');
assert.match(bridge, /appendChild\(panel\)/, 'Existing attendance time settings panel must be moved into the configuration view host.');

assert.doesNotMatch(
  bridge,
  /<b>Giờ GV<\/b>|adminSettingsPopoverOpen|is-compact-popover|ATTENDANCE_COMPACT_TIME_TRIGGER_CLASS/,
  'Legacy Giờ GV trigger/popover implementation must be retired.',
);
assert.match(
  css,
  /\.attendance-shell:not\(\.bes-attendance-config-active\)\s*>\s*\.bes-attendance-time-settings[\s\S]*?display:\s*none\s*!important/,
  'Legacy runtime settings panel must stay hidden outside Cấu hình.',
);
assert.match(
  css,
  /\.attendance-shell\.bes-attendance-config-active\s+\.attendance-content\s*>\s*:not\(\.bes-attendance-config-react-host\)[\s\S]*?display:\s*none\s*!important/,
  'Cấu hình mode must hide the previously selected Attendance view content.',
);
assert.doesNotMatch(css, /\.bes-attendance-time-trigger|\.is-compact-popover/, 'Legacy trigger/popover CSS must be removed.');

console.log('Attendance configuration tab React bridge contract OK');
