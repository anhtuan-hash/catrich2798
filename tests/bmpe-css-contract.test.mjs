// BMPE W1 regression guard: protects existing Global Motion v2 and TTCM styling.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const legacy = read('src/styles/v1159.css');
const motion = read('src/styles/GlobalMotionSystem.css');
const runtime = read('src/utils/globalMotionSystem.js');
const bootstrap = read('src/main.jsx');

test('unscoped legacy animation/transition kill-switch is gone', () => {
  assert.doesNotMatch(legacy, /brian-motion-retired-a/);
  assert.doesNotMatch(legacy, /Retire motion globally while preserving static layout/);
  assert.doesNotMatch(legacy, /::view-transition-old\(root\)[\s\S]*?animation:\s*none\s*!important/);
  assert.doesNotMatch(legacy.slice(0, legacy.indexOf('/* TTCM CHANNEL')), /scroll-behavior:\s*auto\s*!important/);
});

test('existing TTCM skin and import order remain available', () => {
  assert.match(legacy, /\/\* TTCM CHANNEL/);
  assert.match(legacy, /\.ttcm-m3-shell\s*\{/);
  assert.match(legacy, /\.ttcm-m3-toolbar\s*\{/);
  assert.ok(bootstrap.includes("import './styles/v1159.css'"));
  assert.ok(bootstrap.includes("import './styles/GlobalMotionSystem.css'"));
  assert.ok(bootstrap.indexOf("import './styles/v1159.css'") < bootstrap.indexOf("import './styles/GlobalMotionSystem.css'"));
});

test('all ten motion slots are retained with a valid no-motion option', () => {
  for (const slot of ['page','tab','modal','drawer','popover','list','indicator','loading','interaction','bubble']) {
    assert.match(runtime, new RegExp('^  ' + slot + ': Object\\.freeze\\(', 'm'));
  }
  assert.match(runtime, /id: 'no-motion'/);
  assert.match(motion, /prefers-reduced-motion:\s*reduce/);
  assert.match(motion, /data-motion-page="editorial-rise"/);
  assert.match(motion, /data-motion-interaction="soft-press"/);
});

test('unmodified role and route bootstrap remains wired', () => {
  assert.match(bootstrap, /hasRouteAccess/);
  assert.match(bootstrap, /const Home = lazy/);
  assert.match(bootstrap, /const SmartBubbleDock = lazy/);
});
