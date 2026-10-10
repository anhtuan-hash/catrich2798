import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const motion = readFileSync(new URL('../src/utils/globalMotionSystem.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const fonts = readFileSync(new URL('../src/utils/globalRegionalFontSystem.js', import.meta.url), 'utf8');

test('server motion settings are idempotent across four boot retries and reconnects', () => {
  assert.match(motion, /let lastPaintedMotionSignature = null/);
  assert.match(motion, /if \(signature !== lastPaintedMotionSignature\)/);
  assert.match(motion, /lastPaintedMotionSignature = signature/);
  assert.match(motion, /applyTimingVariables\(root, normalized\)/);
  assert.match(motion, /if \(persist\) writeJson\(STORAGE_KEY, normalized\)/);
  assert.match(motion, /window\.dispatchEvent\(new CustomEvent\(GLOBAL_EVENT/);
  assert.match(motion, /root\.dataset\.motionSource !== source/);
});

test('disabled modal tab and list animation slots avoid unnecessary DOM selector scans', () => {
  assert.match(motion, /if \(slots\?\.\[kind\] === 'none'\) return/);
  assert.match(motion, /if \(slots\?\.tab !== 'none' && slots\?\.tab !== 'instant'\)/);
  assert.match(motion, /if \(slots\?\.list !== 'none'\)/);
  assert.match(motion, /currentAppliedConfig\?\.slots\?\.tab !== 'instant'/);
  assert.match(motion, /collectEntrants\(document\.body\)/);
  assert.match(motion, /const observer = new MutationObserver/);
});

test('global route loader handles duplicate navigation events without forced reflow or stale exit', () => {
  const start = motion.indexOf('function hideRouteLoader(');
  const end = motion.indexOf('function installRouteLoadingExperience()',start);
  assert.ok(start>0 && end>start);
  const block = motion.slice(start,end);
  assert.doesNotMatch(block, /offsetWidth|offsetHeight|getBoundingClientRect/);
  assert.match(block, /window\.clearTimeout\(loaderExitTimer\)/);
  assert.match(block, /window\.clearTimeout\(loaderHideTimer\)/);
  assert.match(block, /if \(!loader\.classList\.contains\('is-visible'\)\)/);
  assert.match(block, /loaderHideTimer = window\.setTimeout/);
  assert.match(motion, /window\.addEventListener\('hashchange', showRouteLoader\)/);
  assert.match(motion, /window\.addEventListener\('bes-navigation-start', showRouteLoader\)/);
});

test('current navigation, motion and regional fonts remain wired', () => {
  assert.match(app, /installGlobalMotionSystem\(\)/);
  assert.match(app, /installRegionalFontSystem\(\)/);
  assert.match(app, /useGlobalChromeSettings\(currentUser\)/);
  assert.match(fonts, /function performRuntimeFontSizeSync\(\)/);
});
