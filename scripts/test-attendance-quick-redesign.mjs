import fs from 'node:fs';
import assert from 'node:assert/strict';

const jsx = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url), 'utf8');

assert.match(jsx, /att-m3-roster-section-head/, 'Quick attendance should have a dedicated roster section header');
assert.match(jsx, /Sĩ số/, 'Roster section header should surface total class size');
assert.match(jsx, /Có mặt/, 'Roster section header should surface present count');
assert.match(jsx, /Vắng/, 'Roster section header should surface absent count');
assert.match(css, /\.attendance-rollcall\.att-m3-quick-redesign\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?flex-direction:\s*column\s*!important;[\s\S]*?overflow-y:\s*auto\s*!important;/, 'Right pane must be one vertical scroll surface');
assert.match(css, /\.attendance-rollcall\.att-m3-quick-redesign\s+\.attendance-roster\s*\{[\s\S]*?overflow:\s*visible\s*!important;[\s\S]*?max-height:\s*none\s*!important;/, 'Roster must expand naturally without its own scroll box');
assert.match(css, /\.att-m3-roster-section-head\s*\{/, 'Roster section header must be styled');
assert.match(css, /\.attendance-rollcall\.att-m3-quick-redesign\s+\.attendance-session-controls\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,minmax\(0,1fr\)\)\s*!important;/, 'Session controls should use the approved three-column card layout');
assert.match(css, /\.attendance-rollcall\.att-m3-quick-redesign\s+\.att-m3-proof-card\s*\{/, 'Photo proof should be visually integrated in redesigned pane');
assert.match(css, /\.attendance-rollcall\.att-m3-quick-redesign\s+\.attendance-confirm-bar\s*\{/, 'Action bar should be visually integrated in redesigned pane');

console.log('Attendance quick redesign contract OK');
