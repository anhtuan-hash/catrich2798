import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FONT_SCALE_OPTIONS, normalizeFontScale } from '../src/utils/fontScale.js';

const read = (relativePath) => fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');
const navigation = read('../src/components/GlobalCompactNavigation.jsx');
const flatNavigation = read('../src/components/GlobalFlatNavigation.jsx');
const readability = read('../src/utils/bursReadability.js');
const overlay = read('../src/components/GlobalNavigationOverlayLayer.css');
const main = read('../src/main.jsx');

assert.deepEqual(FONT_SCALE_OPTIONS, [90, 100, 110, 120, 130, 135]);
assert.equal(normalizeFontScale(111), 110);
assert.equal(normalizeFontScale(133), 135);
assert.equal(normalizeFontScale('invalid'), 100);

assert.match(navigation, /FONT_SCALE_OPTIONS\.map/);
assert.match(navigation, /aria-pressed=/);
assert.match(main, /normalizeFontScale\(saved\)/);
assert.match(readability, /FONT_SCALE_OPTIONS\.map/);
assert.match(readability, /container\.replaceChildren\(\.\.\.orderedButtons\)/);
assert.doesNotMatch(readability, /const FONT_SCALES\s*=/);

const geometryImport = flatNavigation.indexOf("import './GlobalNavigationPinnedLayout.css';");
const overlayImport = flatNavigation.indexOf("import './GlobalNavigationOverlayLayer.css';");
assert.ok(geometryImport >= 0 && overlayImport > geometryImport, 'Overlay contract must load after route CSS and pinned geometry.');
assert.match(overlay, /> \.brian-nav\s*\{[\s\S]*?z-index:\s*20\s*!important/);
assert.match(overlay, /> \.brian-briefing-bar\s*\{[\s\S]*?z-index:\s*10\s*!important/);
assert.match(overlay, /\.brian-nav__popover\s*\{[\s\S]*?z-index:\s*100\s*!important[\s\S]*?background:\s*#fff\s*!important/);

console.log('✓ Menu tài khoản luôn nổi trên thanh tin và các mức chữ dùng cùng một thứ tự toàn hệ thống.');
