import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/attendanceCompactTimeSettings.js', import.meta.url), 'utf8');

assert.match(source, /<b>Cấu hình<\/b>/, 'Cấu hình must be presented as the admin attendance tab label.');
assert.match(source, /attendance-content/, 'The configuration panel must be hosted in attendance-content.');
assert.match(source, /is-time-config-open/, 'The attendance content must switch into configuration-view mode.');
assert.match(source, /is-config-view/, 'The time settings panel must render as a configuration view.');
assert.doesNotMatch(source, /Giờ GV/, 'The legacy Giờ GV label must be removed.');
assert.doesNotMatch(source, /is-compact-popover/, 'The settings panel must no longer use compact popover mode.');
assert.doesNotMatch(source, /aria-haspopup[^\n]*dialog|setAttribute\('role', 'dialog'\)/, 'Configuration must not be exposed as a dialog.');
assert.doesNotMatch(source, /tabs\.appendChild\(panel\)/, 'The settings panel must not be mounted inside the tab bar.');

console.log('Attendance configuration tab contract passed.');
