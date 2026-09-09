import fs from 'node:fs';
import assert from 'node:assert/strict';

const cleanupUrl = new URL('../src/attendanceLegacyMonthlyCalendarCleanup.js', import.meta.url);
const startupUrl = new URL('../src/tabResumeStability.js', import.meta.url);
const parentUrl = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const directScheduleUrl = new URL('../src/components/attendance/AttendanceDailySchedule.jsx', import.meta.url);

assert.equal(fs.existsSync(cleanupUrl), false, 'Legacy monthly attendance calendar cleanup runtime must be deleted');

const startupSource = fs.readFileSync(startupUrl, 'utf8');
assert.doesNotMatch(startupSource, /attendanceLegacyMonthlyCalendarCleanup\.js/, 'Startup chain must not load the deleted monthly calendar cleanup runtime');

const parentSource = fs.readFileSync(parentUrl, 'utf8');
assert.match(parentSource, /import\s+AttendanceDailySchedule\s+from\s+['"]\.\/attendance\/AttendanceDailySchedule\.jsx['"];/, 'Original attendance component must import the direct React schedule');
assert.match(parentSource, /<AttendanceDailySchedule\b/, 'Original attendance calendar branch must render AttendanceDailySchedule directly');
for (const token of [
  'attendance-calendar-toolbar',
  'attendance-calendar-weekdays',
  'attendance-calendar-grid',
  'calendarMonth',
  'monthlySessions',
  'calendarCells',
  'calendarByDate',
  'loadMonthlySessions',
]) {
  assert.equal(parentSource.includes(token), false, `Legacy monthly calendar token must be removed: ${token}`);
}

assert.equal(fs.existsSync(directScheduleUrl), true, 'Direct daily schedule React component must exist');
const directScheduleSource = fs.readFileSync(directScheduleUrl, 'utf8');
assert.doesNotMatch(directScheduleSource, /MutationObserver|querySelector|innerHTML|data-attendance-daily-status-root/, 'Direct schedule must not recreate the calendar through runtime DOM mutation');

console.log('Attendance monthly calendar removal direct-React contract OK');
