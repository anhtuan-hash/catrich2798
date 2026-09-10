import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const compactSource = readFileSync(new URL('../src/attendanceCompactTimeSettings.js', import.meta.url), 'utf8');
const compactCss = readFileSync(new URL('../src/styles/AttendanceCompactTimeSettings.css', import.meta.url), 'utf8');
const accessSource = readFileSync(new URL('../src/attendanceTimeAccessBootstrap.js', import.meta.url), 'utf8');

assert.match(compactSource, /<b>Cấu hình<\/b>/, 'attendance settings trigger should be labeled Cấu hình');
assert.doesNotMatch(compactSource, /<b>Giờ GV<\/b>/, 'legacy Giờ GV label must be removed');
assert.match(compactSource, /setAttribute\('role', 'tab'\)/, 'configuration control should expose tab semantics');
assert.match(compactSource, /setAttribute\('aria-controls', CONFIG_PANEL_ID\)/, 'configuration tab should point to its panel');
assert.match(compactSource, /setAttribute\('role', 'tabpanel'\)/, 'configuration view should expose tabpanel semantics');
assert.match(compactSource, /aria-selected/, 'configuration control should expose selected state');
assert.match(compactSource, /trigger\.tabIndex = 0;/, 'configuration tab should remain keyboard reachable when inactive');
assert.doesNotMatch(compactSource, /trigger\.tabIndex = configOpen \? 0 : -1/, 'inactive configuration tab must not be removed from keyboard tab order');
assert.match(compactSource, /const shouldHidePanel = !configOpen;\s*if \(panel\.hidden !== shouldHidePanel\) panel\.hidden = shouldHidePanel;/, 'panel hidden state should only be written when it changes to avoid observer render loops');
assert.doesNotMatch(compactSource, /classList\.remove\('is-active'\)/, 'configuration tab must not mutate React-owned active tab classes');
assert.match(compactSource, /tabs\.classList\.toggle\('is-time-config-open'/, 'tab bar should expose configuration-open state');
assert.match(compactCss, /\.attendance-tabs\.is-time-config-open[^\{]*button:not\(\.bes-attendance-time-trigger\)\.is-active::after/, 'native active underline should be visually suppressed while configuration is open');
assert.match(accessSource, /tabs\.insertAdjacentElement\('afterend', panel\)/, 'time access bootstrap should continue creating the settings panel beside the tab bar');

console.log('attendance configuration tab contract: ok');
