import fs from 'node:fs';
import assert from 'node:assert/strict';

const cssUrl = new URL('../src/styles/AttendanceMobileResponsive.css', import.meta.url);
const startupUrl = new URL('../src/tabResumeStability.js', import.meta.url);

assert.ok(fs.existsSync(cssUrl), 'Mobile attendance responsive stylesheet must exist');

const css = fs.readFileSync(cssUrl, 'utf8');
const startup = fs.readFileSync(startupUrl, 'utf8');

assert.match(css, /@media\s*\(max-width:\s*760px\)/, 'Mobile overrides must target phone-width attendance UI');
assert.match(css, /100dvh|100svh/, 'Attendance modal must use a dynamic/small viewport unit on mobile');
assert.match(css, /env\(safe-area-inset-(?:top|bottom)\)/, 'Attendance modal must respect iPhone safe areas');
assert.match(css, /\.attendance-shell[\s\S]*width:\s*(?:calc\(100vw\s*-\s*\d+px\)|100%)/, 'Attendance shell must expand close to full phone width');
assert.match(css, /\.attendance-title\s+strong[\s\S]*font-size:\s*clamp\(/, 'Mobile attendance title must use bounded responsive sizing');
assert.match(css, /\.attendance-calendar-mode-bar__date\s+input[\s\S]*font-size:\s*16px/, 'Date control must be at least 16px to avoid iOS form zoom');
assert.match(css, /\.attendance-daily-overview__summary\.is-compact[\s\S]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/, 'Daily summary must fit four readable metrics without horizontal scrolling');
assert.match(css, /\.attendance-daily-class-row__teacher[\s\S]*display:\s*(?:grid|block|flex)/, 'Teacher name must remain visible on mobile class cards');
assert.match(css, /\.attendance-daily-class-row[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(/, 'Mobile class cards must use a robust two-column layout');
assert.match(css, /overflow-x:\s*hidden/, 'Mobile attendance surface must guard against horizontal overflow');
assert.doesNotMatch(css, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/, 'Responsive UI must not disable browser pinch zoom');
assert.match(startup, /AttendanceMobileResponsive\.css/, 'Startup chain must load mobile attendance responsive overrides');

console.log('Attendance mobile responsive layout contract OK');