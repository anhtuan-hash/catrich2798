import assert from 'node:assert/strict';
import fs from 'node:fs';

const integration = fs.readFileSync(new URL('../src/noCreamSurfaceRuntime.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../src/navigationStarEffectBootstrap.js', import.meta.url), 'utf8');
const effectCss = fs.readFileSync(new URL('../src/components/GlobalNavigationStarEffect.css', import.meta.url), 'utf8');
const starLogo = fs.readFileSync(new URL('../src/components/BrianPulseLogo.jsx', import.meta.url), 'utf8');
const starLogoCss = fs.readFileSync(new URL('../src/components/BrianPulseLogo.css', import.meta.url), 'utf8');

// Keep the new navigation effect visually related to the existing Star logo.
assert.match(starLogo, /drawStarAura/);
assert.match(starLogo, /drawSatelliteSparkles/);
assert.match(starLogo, /pointerEnergy/);
assert.match(starLogoCss, /@keyframes brian-star-halo/);

// The Star logo itself must stay visually prominent in the desktop navigation.
assert.match(starLogoCss, /\.brian-pulse-logo-trigger\{[\s\S]*?width:64px;[\s\S]*?min-width:64px;[\s\S]*?height:64px;[\s\S]*?min-height:64px;[\s\S]*?flex:0 0 64px;/);
assert.match(starLogoCss, /@media\(max-width:1120px\)\{[\s\S]*?\.brian-pulse-logo-trigger\{[\s\S]*?width:60px;[\s\S]*?min-width:60px;[\s\S]*?height:60px;[\s\S]*?min-height:60px;[\s\S]*?flex-basis:60px;/);
assert.match(starLogo, /const scale = Math\.min\(width, height\) \/ 54;/);
assert.match(starLogo, /const outer = 14\.8 \* scale;/);
assert.match(starLogoCss, /filter:contrast\(1\.16\) saturate\(1\.08\) drop-shadow\(0 0 7px rgba\(101,211,255,\.2\)\);/);
assert.match(starLogoCss, /background:radial-gradient\(circle,rgba\(105,218,255,\.22\),rgba\(91,115,255,\.08\) 48%,transparent 74%\);/);

// The bootstrap is loaded once with existing global chrome, before the app mounts.
assert.match(integration, /import '\.\/navigationStarEffectBootstrap\.js';/);
assert.match(bootstrap, /import '\.\/components\/GlobalNavigationStarEffect\.css';/);
assert.match(bootstrap, /const PRIMARY_NAV_SELECTOR = '\.brian-nav__primary > button';/);
assert.match(bootstrap, /const NAV_LABEL_KEYS = new Map\(\[/);
assert.match(bootstrap, /\['Trang chủ', 'home'\]/);
assert.match(bootstrap, /\['Ứng dụng', 'apps'\]/);

// Every nav button gets one lightweight DOM effect layer: aura + three sparkles.
assert.match(bootstrap, /function createNavStarEffect\(button, key\)/);
assert.match(bootstrap, /effect\.className = 'brian-nav-star-effect'/);
assert.match(bootstrap, /aura\.className = 'brian-nav-star-effect__aura'/);
assert.match(bootstrap, /sparkleOne\.className = 'brian-nav-star-effect__sparkle brian-nav-star-effect__sparkle--one'/);
assert.match(bootstrap, /sparkleTwo\.className = 'brian-nav-star-effect__sparkle brian-nav-star-effect__sparkle--two'/);
assert.match(bootstrap, /sparkleThree\.className = 'brian-nav-star-effect__sparkle brian-nav-star-effect__sparkle--three'/);
assert.match(bootstrap, /button\.appendChild\(effect\)/);

// Pointer position/energy drives the same magnetic-light feel without a canvas per button.
assert.match(bootstrap, /button\.style\.setProperty\('--star-x', `\$\{x\}px`\)/);
assert.match(bootstrap, /button\.style\.setProperty\('--star-y', `\$\{y\}px`\)/);
assert.match(bootstrap, /button\.style\.setProperty\('--star-energy', String\(energy\)\)/);
assert.match(bootstrap, /button\.addEventListener\('pointermove', onStarPointerMove\)/);
assert.match(bootstrap, /button\.addEventListener\('pointerleave', onLeave\)/);
assert.match(bootstrap, /button\.addEventListener\('focus', onFocus\)/);
assert.match(bootstrap, /button\.removeEventListener\('pointermove', binding\.onStarPointerMove\)/);
assert.match(bootstrap, /binding\.effect\.remove\(\)/);
assert.doesNotMatch(bootstrap, /document\.createElement\('canvas'\)/, 'Navigation Star effect must not create one canvas loop per button');

// Existing semantic tabs remain discoverable even when permissions hide/reorder them.
for (const className of [
  'brian-nav__dashboard-tab',
  'brian-nav__homeroom-tab',
  'brian-nav__gradebook-tab',
  'brian-nav__reports-tab',
  'brian-nav__ttcm-tab',
  'brian-nav__attendance-tab',
]) {
  assert.match(bootstrap, new RegExp(className));
}

// CSS carries the Star vocabulary and respects reduced-motion preferences.
assert.match(effectCss, /\.brian-nav-star-effect__aura/);
assert.match(effectCss, /radial-gradient\(/);
assert.match(effectCss, /@keyframes brian-nav-star-breathe/);
assert.match(effectCss, /@keyframes brian-nav-star-twinkle/);
assert.match(effectCss, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(effectCss, /\[data-brian-star-fx='true'\]/);

console.log('✓ Navigation Star effects and the enlarged, clearer Star logo contract are intact.');
