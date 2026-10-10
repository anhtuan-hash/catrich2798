import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const fonts = read('src/utils/globalRegionalFontSystem.js');
const motion = read('src/utils/globalMotionSystem.js');
const app = read('src/main.jsx');
const lesson = read('src/pages/LessonCheckStudio.jsx');

test('regional fonts update only newly inserted DOM subtrees between configuration changes', () => {
  assert.match(fonts, /function applyRuntimeFontSize\(regionId, size, root = document\)/);
  assert.match(fonts, /root\.querySelectorAll\?\.\(selector\)\.forEach\(apply\)/);
  assert.match(fonts, /const fontSizeRuntimePendingRoots = new Set\(\)/);
  assert.match(fonts, /fontSizeRuntimePendingRoots\.add\(root\)/);
  assert.match(fonts, /fontSizeRuntimePendingRoots\.clear\(\)/);
  assert.match(fonts, /record\.addedNodes\?\.forEach\(\(node\) => scheduleRuntimeFontSizeSync\(node\)\)/);
  assert.match(fonts, /const snapshotRoots = new Set\(roots\)/);
  assert.doesNotMatch(fonts, /requestAnimationFrame\(\(\) => \{\s*fontSizeRuntimeFrame = 0;\s*performRuntimeFontSizeSync\(\)/);
});

test('full font restoration remains available on settings changes', () => {
  assert.match(fonts, /function restoreRuntimeFontSizes\(\)/);
  assert.match(fonts, /function performRuntimeFontSizeSync\(\)/);
  assert.match(fonts, /function syncRuntimeRegionalFontSizes\(settings\)/);
  assert.match(fonts, /performRuntimeFontSizeSync\(\)/);
  assert.match(fonts, /fontSizeRuntimeOriginal\.delete\(node\)/);
  assert.match(fonts, /setProperty\('font-size', value, 'important'\)/);
  assert.match(fonts, /const fontSizeRuntimePendingRoots = new Set\(\)/);
  assert.match(fonts, /fontSizeRuntimeObserver\.observe\(host, \{ childList: true, subtree: true \}\)/);
});

test('global motion batches attribute and DOM work without dropping animations', () => {
  assert.match(motion, /const pendingPanels = new Set\(\)/);
  assert.match(motion, /const snapshotRoots = new Set\(roots\)/);
  assert.match(motion, /pendingPanels\.add\(mutation\.target\)/);
  assert.match(motion, /pendingPanels\.forEach\(\(panel\) =>/);
  assert.match(motion, /requestAnimationFrame\(flush\)/);
  assert.match(motion, /markTabPanel\(panel\)/);
  assert.match(motion, /collectEntrants\(node\)/);
  assert.match(motion, /attributeFilter: \['class', 'hidden', 'aria-hidden', 'aria-selected', 'style'\]/);
  assert.match(motion, /installRouteLoadingExperience\(\)/);
});

test('main features and protected embedded preview remain intact', () => {
  assert.match(app, /useGlobalChromeSettings\(currentUser\)/);
  assert.match(app, /chromeSettings\.showActionDock/);
  assert.match(lesson, /function ActivityCardPreview\(/);
  assert.match(lesson, /<ActivityFrame embed=\{embed\}/);
  assert.match(lesson, /lesson_check/);
});
