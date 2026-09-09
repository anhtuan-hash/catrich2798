import fs from 'node:fs';
import assert from 'node:assert/strict';

const bootstrapUrl = new URL('../src/attendanceCalendarDirectEntryBootstrap.js', import.meta.url);
const cssUrl = new URL('../src/styles/AttendanceCalendarDirectEntry.css', import.meta.url);
const startupUrl = new URL('../src/tabResumeStability.js', import.meta.url);

assert.ok(fs.existsSync(bootstrapUrl), 'Calendar direct-entry bootstrap must exist');
assert.ok(fs.existsSync(cssUrl), 'Calendar direct-entry styles must exist');

const bootstrapSource = fs.readFileSync(bootstrapUrl, 'utf8');
for (const required of [
  'Điểm danh nhanh',
  'Lịch điểm danh',
  'data-bes-hidden-quick-tab',
  'attendance-daily-class-row',
  'data-attendance-daily-status-root',
  'attendance-quick-layout',
  'data-bes-attendance-class-id',
  'data-bes-calendar-class-detail',
]) {
  assert.ok(bootstrapSource.includes(required), `Calendar bridge must contain ${required}`);
}
assert.match(bootstrapSource, /addEventListener\(['"]click['"][\s\S]*capture:\s*true/, 'Calendar row interception must run in capture phase before the legacy row handler');
assert.match(bootstrapSource, /stopImmediatePropagation\(\)/, 'Calendar row interception must prevent legacy Quick/History routing');
assert.match(bootstrapSource, /quickTab\.click\(\)/, 'A selected calendar class must open the existing rollcall internally');
assert.match(bootstrapSource, /setControlledValue\([\s\S]*attendance-session-controls[\s\S]*input\[type=["']date["']\]/, 'The rollcall must receive the date selected in the calendar');
assert.match(bootstrapSource, /calendarTab\??\.click\(\)/, 'Opening the attendance module must redirect the hidden Quick default to the calendar');
assert.match(bootstrapSource, /session_status|is-completed|is-cancelled|attendance-daily-class-row/, 'Completed and pending calendar rows must share the direct-entry bridge');

// Regression: a focused class opened from Lịch điểm danh must expose a compact exit action
// that clears direct-entry state and returns to the calendar without closing the attendance modal.
assert.match(bootstrapSource, /bes-attendance-calendar-back/, 'Focused calendar rollcall must render a dedicated back button');
assert.match(bootstrapSource, /Quay lại lịch điểm danh/, 'Back button must clearly describe the destination');
assert.match(bootstrapSource, /function\s+exitCalendarClassDetail\s*\(/, 'Calendar direct-entry runtime must own an explicit exit operation');
assert.match(bootstrapSource, /exitCalendarClassDetail[\s\S]{0,900}removeAttribute\(DETAIL_ATTRIBUTE\)[\s\S]{0,900}calendarTab\??\.click\(\)/, 'Exit must clear focused detail state and restore the calendar tab');
assert.doesNotMatch(bootstrapSource, /bes-attendance-calendar-back[\s\S]{0,900}\.attendance-modal-close|bes-attendance-calendar-back[\s\S]{0,900}\.click\(\)[\s\S]{0,200}close/i, 'Back action must not close the whole attendance modal');

const cssSource = fs.readFileSync(cssUrl, 'utf8');
assert.match(cssSource, /data-bes-hidden-quick-tab[\s\S]*display:\s*none/, 'Quick attendance tab must be visually hidden');
assert.match(cssSource, /data-bes-calendar-class-detail[\s\S]*attendance-class-list[\s\S]*display:\s*none/, 'Direct calendar entry must focus on the selected class instead of showing a second class picker');
assert.match(cssSource, /bes-calendar-detail-active/, 'Calendar tab must stay visually active while selected-class rollcall is open');
assert.match(cssSource, /\.bes-attendance-calendar-back\b/, 'Back-to-calendar button must have dedicated compact styling');

const startupSource = fs.readFileSync(startupUrl, 'utf8');
assert.match(startupSource, /attendanceCalendarDirectEntryBootstrap\.js/, 'Startup chain must load the calendar direct-entry runtime');

console.log('Attendance calendar direct-entry contract OK');
