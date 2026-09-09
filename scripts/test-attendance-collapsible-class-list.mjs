import fs from 'node:fs';
import assert from 'node:assert/strict';

const runtime = fs.readFileSync(new URL('../src/attendanceQuickClassListCollapse.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/styles/AttendanceQuickClassListCollapse.css', import.meta.url), 'utf8');
const startup = fs.readFileSync(new URL('../src/tabResumeStability.js', import.meta.url), 'utf8');

assert.match(runtime, /ATTENDANCE_CLASS_LIST_COLLAPSE_KEY/, 'Quick attendance must define a persistent class-list collapse preference key.');
assert.match(runtime, /localStorage\.getItem\(ATTENDANCE_CLASS_LIST_COLLAPSE_KEY\)/, 'Initial collapse state must restore the saved preference.');
assert.match(runtime, /matchMedia\?\.\(MOBILE_QUERY\)/, 'Small screens must default to the expanded attendance workspace with the class list collapsed.');
assert.match(runtime, /localStorage\.setItem\(ATTENDANCE_CLASS_LIST_COLLAPSE_KEY/, 'Collapse state must be remembered after the user changes it.');
assert.match(runtime, /classListCollapsed/, 'Quick attendance must keep explicit collapse state.');
assert.match(runtime, /classList\.toggle\('is-class-list-collapsed', classListCollapsed\)/, 'The quick-attendance grid must expose a collapsed layout state.');
assert.match(runtime, /aria-label', 'Ẩn danh sách lớp'/, 'The visible class list must provide a clear collapse control.');
assert.match(runtime, /aria-label', 'Mở danh sách lớp'/, 'The expanded roll-call workspace must provide a clear restore control.');
assert.match(runtime, /<b>Danh sách lớp<\/b>/, 'The restore control should remain understandable without relying on an icon alone.');
assert.match(runtime, /MutationObserver/, 'The control must survive React re-renders of the quick-attendance workspace.');
assert.match(startup, /attendanceQuickClassListCollapse\.js/, 'The collapse runtime must load from the pre-main startup chain.');
assert.match(css, /\.attendance-quick-layout\.is-class-list-collapsed\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,\s*1fr\)/i, 'Collapsed mode must give the roll-call workspace the full available width.');
assert.match(css, /\.attendance-quick-layout\.is-class-list-collapsed\s*>\s*\.attendance-class-list\s*\{[^}]*display\s*:\s*none/i, 'Collapsed mode must actually hide the active-class sidebar.');
assert.match(css, /\.attendance-class-list-toggle/i, 'Collapse and restore controls must have dedicated styling.');
assert.match(css, /\.attendance-class-list-restore/i, 'The collapsed workspace must visibly expose the restore control.');

console.log('Collapsible quick-attendance class list contract OK');
