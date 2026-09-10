import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const compactSource = readFileSync(new URL('../src/attendanceCompactTimeSettings.js', import.meta.url), 'utf8');
const accessSource = readFileSync(new URL('../src/attendanceTimeAccessBootstrap.js', import.meta.url), 'utf8');

assert.match(compactSource, /<b>Cấu hình<\/b>/, 'attendance settings trigger should be labeled Cấu hình');
assert.doesNotMatch(compactSource, /<b>Giờ GV<\/b>/, 'legacy Giờ GV label must be removed');
assert.match(compactSource, /role[^\n]*tab/i, 'configuration control should expose tab semantics');
assert.match(compactSource, /aria-selected/, 'configuration control should expose selected state');
assert.match(accessSource, /tabs\.insertAdjacentElement\('afterend', panel\)/, 'settings panel should remain in the attendance content area');

console.log('attendance configuration tab contract: ok');
