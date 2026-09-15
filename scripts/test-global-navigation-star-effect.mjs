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

console.log('✓ All primary navigation buttons receive the lightweight Star-inspired pointer aura and sparkle effect.');
