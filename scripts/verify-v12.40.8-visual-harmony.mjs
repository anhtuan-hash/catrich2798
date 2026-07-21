import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const mainSource = fs.readFileSync('src/main.jsx', 'utf8');
const shellSource = fs.readFileSync('src/ui-core/components/UnifiedShellChrome.jsx', 'utf8');
const tabsSource = fs.readFileSync('src/components/WorkspaceTabs.jsx', 'utf8');
const harmonyCss = fs.readFileSync('src/ui-core/styles/chrome-visual-harmony-v12408.css', 'utf8').toLowerCase();

assert.match(packageJson.version, /^12\.40\.(?:8|9)$/);
assert.match(mainSource, /chrome-visual-harmony-v12408\.css/);
assert.match(shellSource, /bes-visual-harmony-v12408/);
assert.match(shellSource, /data-harmony-theme="avocado"/);

for (const requiredToken of [
  'const COMPACT_TAB_LIMIT = 5',
  'Đang sử dụng',
  'Ứng dụng gần đây',
  'Tất cả',
  'Thu gọn',
  'Ghim',
  'Bỏ ghim',
  'Chia màn hình',
  'Mở ứng dụng',
  'reorderWorkspaceTabs',
  'closeWorkspaceTab',
]) {
  assert.equal(tabsSource.includes(requiredToken), true, `Recent applications bar is missing ${requiredToken}`);
}
assert.equal(tabsSource.includes('◇'), false, 'Ambiguous unpinned diamond icon must be removed');
assert.equal(tabsSource.includes('◆'), false, 'Ambiguous pinned diamond icon must be removed');

for (const requiredToken of [
  '#b2c248',
  'tier 1',
  'tier 2',
  'tier 3',
  '.bes-visual-harmony-v12408',
  '.bes-recent-apps-v12408',
  '--bes-harmony-top-offset',
  '@media (max-width: 1180px)',
  '@media (max-width: 860px)',
  '@media (prefers-reduced-motion: reduce)',
  'animation-timeline: scroll()',
]) {
  assert.equal(harmonyCss.includes(requiredToken), true, `Visual Harmony CSS is missing ${requiredToken}`);
}

for (const manifestPath of ['public/version.json', 'public/release-manifest.json']) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.version, packageJson.version);
  assert.equal(manifest.homepagePrimaryColor, '#B2C248');
  assert.equal(manifest.recentAppsCompactLimit, 5);
  assert.equal(manifest.recentAppsNamedActions, true);
  assert.equal(manifest.chromeTierCount, 3);
  assert.equal(manifest.chromeAvocadoHarmony, true);
  assert.equal(manifest.chromeResponsiveHarmony, true);
}

console.log('V12.40.8 Three-Tier Visual Harmony checks passed.');
