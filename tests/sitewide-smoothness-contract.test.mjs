import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const boot = read('index.html');
const fonts = read('src/utils/globalRegionalFontSystem.js');
const loader = read('src/components/GlobalWindowsPhone8Loading.jsx');
const pageLaunch = read('src/components/GlobalPageLaunchEffect.jsx');
const motion = read('src/utils/globalMotionSystem.js');
const nav = read('src/components/GlobalFlatNavigation.jsx');

test('retired item stays blocked without a synchronous full DOM scan on every route change', () => {
  assert.match(boot, /const retiredToken = 'personnel-hub'/);
  assert.match(boot, /window\.addEventListener\('hashchange', redirectRetiredRoute\)/);
  assert.match(boot, /cleanStoredLauncherState\(\);\s*redirectRetiredRoute\(\)/);
  assert.match(boot, /requestIdleCallback\(processPendingNodes, \{ timeout: 450 \}\)/);
  assert.match(boot, /observer\.observe\(document\.body, \{ childList: true, subtree: true \}\)/);
  assert.match(boot, /const allRoots = new Set\(roots\)/);
  assert.doesNotMatch(boot, /window\.addEventListener\('hashchange', enforceRetirement\)/);
});
test('global fonts retain exact Admin values and skip repeated whole-page restyles', () => {
  assert.match(fonts, /let fontSizeRuntimeSignature = null/);
  assert.match(fonts, /fontSizeRuntimeSignature === signature/);
  assert.match(fonts, /fontSizeRuntimeSignature = signature/);
  assert.match(fonts, /function performRuntimeFontSizeSync\(\)/);
  assert.match(fonts, /function restoreRuntimeFontSizes\(\)/);
  assert.match(fonts, /FONT_SIZE_RUNTIME_ORDER/);
  assert.match(fonts, /record\.addedNodes\?\.forEach\(\(node\) => scheduleRuntimeFontSizeSync\(node\)\)/);
  assert.ok(fonts.includes("node.style.setProperty('font-size', `\${size}px`, 'important')"));
});
test('transition loader is shorter and avoids redundant node-scanning', () => {
  assert.match(loader, /MIN_ROUTE_VISIBLE_MS = 220/);
  assert.match(loader, /MAX_ROUTE_VISIBLE_MS = 1400/);
  assert.match(loader, /rootSet = new Set\(roots\)/);
  assert.match(loader, /scanLoadingNodes\(node\)/);
  assert.match(loader, /window\.addEventListener\('bes-navigation-start', onShow\)/);
  assert.match(loader, /window\.addEventListener\('hashchange', onHide\)/);
  assert.match(nav, /<GlobalWindowsPhone8Loading\s*\/>/);
});
test('Metro Sweep navigates sooner while preserving its native animation and cleanup', () => {
  assert.match(pageLaunch, /LAUNCH_DURATION = 280/);
  assert.match(pageLaunch, /REVEAL_DURATION = 110/);
  assert.match(pageLaunch, /launchAnimation\\.finished\\.then\\(\\(\\) =>/);
  assert.match(pageLaunch, /window\\.location\\.hash = normalizedTarget/);
  assert.match(pageLaunch, /reveal\\.finished\\.then\\(cleanup\\)/);
  assert.match(pageLaunch, /reducedMotion\\(\\)/);
});
test('existing global motion, mobile and Quick Access mechanisms remain', () => {
  assert.match(motion, /installMutationMotionObserver\(\)/);
  assert.match(motion, /installRouteLoadingExperience\(\)/);
  assert.match(nav, /<GlobalPageLaunchEffect route=\{props\.route\} \/>/);
  assert.match(nav, /<GlobalWindows8Experience route=\{props\.route\} \/>/);
  assert.match(nav, /<MobileAppShell \{\.\.\.props\} \/>/);
});
