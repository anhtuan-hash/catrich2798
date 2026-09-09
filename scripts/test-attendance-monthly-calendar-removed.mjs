import fs from 'node:fs';
import assert from 'node:assert/strict';

const cleanupUrl = new URL('../src/attendanceLegacyMonthlyCalendarCleanup.js', import.meta.url);
const startupUrl = new URL('../src/tabResumeStability.js', import.meta.url);

assert.ok(fs.existsSync(cleanupUrl), 'Legacy monthly attendance calendar cleanup runtime must exist');

const cleanupSource = fs.readFileSync(cleanupUrl, 'utf8');
assert.match(cleanupSource, /attendance-calendar-layout/, 'Cleanup must target the attendance calendar layout');
assert.match(cleanupSource, /data-attendance-daily-status-root/, 'Cleanup must preserve the daily attendance overview host');
assert.match(cleanupSource, /:scope\s*>\s*\*/, 'Cleanup must inspect direct legacy children only');
assert.match(cleanupSource, /\.remove\(\)/, 'Legacy monthly calendar nodes must be removed from the DOM, not merely hidden');
assert.match(cleanupSource, /MutationObserver/, 'Cleanup must keep removing legacy monthly nodes if React re-renders them');

const startupSource = fs.readFileSync(startupUrl, 'utf8');
assert.match(startupSource, /attendanceLegacyMonthlyCalendarCleanup\.js/, 'Startup chain must load the monthly calendar cleanup runtime');

console.log('Attendance legacy monthly calendar removal contract OK');
