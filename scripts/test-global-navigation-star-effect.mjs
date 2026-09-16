import assert from 'node:assert/strict';
import fs from 'node:fs';

const integration = fs.readFileSync(new URL('../src/noCreamSurfaceRuntime.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../src/navigationStarEffectBootstrap.js', import.meta.url), 'utf8');
const effectCss = fs.readFileSync(new URL('../src/components/GlobalNavigationStarEffect.css', import.meta.url), 'utf8');
const starLogo = fs.readFileSync(new URL('../src/components/BrianPulseLogo.jsx', import.meta.url), 'utf8');
const starLogoCss = fs.readFileSync(new URL('../src/components/BrianPulseLogo.css', import.meta.url), 'utf8');

// Keep the navigation effect visually related to the existing Star logo.
assert.match(starLogo, /drawStarAura/);
assert.match(starLogo, /drawSatelliteSparkles/);
assert.match(starLogo, /pointerEnergy/);
assert.match(starLogoCss, /@keyframes brian-star-halo/);

// The Star logo itself must stay visually prominent in the desktop navigation.
assert.match(starLogoCss, /\.brian-pulse-logo-trigger\{[\s\S]*?width:64px;[\s\S]*?min-width:64px;[\s\S]*?height:64px;[\s\S]*?min-height:64px;[\s\S]*?flex:0 0 64px;/);
assert.match(starLogoCss, /@media\(max-width:1120px\)\{[\s\S]*?\.brian-pulse-logo-trigger\{[\s\S]*?width:60px;[\s\S]*?min-width:60px;[\s\S]*?height:60px;[\s\S]*?min-height:60px;[\s\S]*?flex-basis:60px;/);
assert.match(starLogo, /const scale = Math\.min\(width, height\) \/ 54;/);
assert.match(starLogo, /const outer = 14\.8 \* scale;/);

// Approved vivid palette remains intact.
assert.match(starLogoCss, /--particle-star-start:#6d5cff;/);
assert.match(starLogoCss, /--particle-star-end:#24c7f4;/);
assert.match(starLogoCss, /filter:contrast\(1\.24\) saturate\(1\.32\) drop-shadow\(0 0 9px rgba\(88,92,255,\.32\)\);/);
assert.match(starLogoCss, /background:radial-gradient\(circle,rgba\(109,92,255,\.24\),rgba\(36,199,244,\.12\) 48%,transparent 74%\);/);
assert.match(starLogoCss, /\.brian-pulse-logo:hover::after,[\s\S]*?\.brian-pulse-logo:focus-within::after\{[\s\S]*?animation:brian-star-halo/);

// The bootstrap is loaded once with existing global chrome, before the app mounts.
assert.match(integration, /import '\.\/navigationStarEffectBootstrap\.js';/);
assert.match(bootstrap, /import '\.\/components\/GlobalNavigationStarEffect\.css';/);
assert.match(bootstrap, /const PRIMARY_NAV_SELECTOR = '\.brian-nav__primary > button';/);
assert.match(bootstrap, /const NAV_LABEL_KEYS = new Map\(\[/);
assert.match(bootstrap, /\['Trang chủ', 'home'\]/);
assert.match(bootstrap, /\['Ứng dụng', 'apps'\]/);

// Every nav button keeps one lightweight DOM effect layer: aura + three sparkles.
assert.match(bootstrap, /function createNavStarEffect\(button, key\)/);
assert.match(bootstrap, /effect\.className = 'brian-nav-star-effect'/);
assert.match(bootstrap, /aura\.className = 'brian-nav-star-effect__aura'/);
assert.match(bootstrap, /sparkleOne\.className = 'brian-nav-star-effect__sparkle brian-nav-star-effect__sparkle--one'/);
assert.match(bootstrap, /sparkleTwo\.className = 'brian-nav-star-effect__sparkle brian-nav-star-effect__sparkle--two'/);
assert.match(bootstrap, /sparkleThree\.className = 'brian-nav-star-effect__sparkle brian-nav-star-effect__sparkle--three'/);
assert.match(bootstrap, /button\.appendChild\(effect\)/);
assert.doesNotMatch(bootstrap, /document\.createElement\('canvas'\)/, 'Navigation Star effect must not create one canvas loop per button');

// Performance contract: pointer work is coalesced to at most one DOM update per animation frame.
assert.match(bootstrap, /let pointerFrame = 0;/);
assert.match(bootstrap, /let pendingPointer = null;/);
assert.match(bootstrap, /pointerFrame = window\.requestAnimationFrame\(flushPointerMove\)/);
assert.match(bootstrap, /if \(pointerFrame\) window\.cancelAnimationFrame\(pointerFrame\);/);
assert.match(bootstrap, /cachedRect = button\.getBoundingClientRect\(\);/);
assert.doesNotMatch(
  bootstrap,
  /const onStarPointerMove = \(event\) => \{\s*const rect = button\.getBoundingClientRect\(\)/,
  'pointermove must not force layout on every mouse event',
);

// Performance contract: nav effects are static while idle and use transform-only sparkle motion.
assert.match(effectCss, /\.brian-nav-star-effect__aura\s*\{[\s\S]*?animation:\s*none;/);
assert.match(effectCss, /\[data-star-active='true'\] \.brian-nav-star-effect__aura[\s\S]*?animation:\s*brian-nav-star-breathe/);
assert.doesNotMatch(effectCss, /will-change:\s*left\s*,\s*top/);
assert.doesNotMatch(effectCss, /transition:[\s\S]{0,120}?\bleft\s+90ms/);
assert.doesNotMatch(effectCss, /transition:[\s\S]{0,120}?\btop\s+90ms/);
assert.match(effectCss, /transform:\s*translate3d\(var\(--star-x/);

// Performance contract: the canvas Star draws once while idle and only runs RAF during interaction/settling.
assert.match(starLogo, /let renderWidth = 1;/);
assert.match(starLogo, /let renderHeight = 1;/);
assert.match(starLogo, /let cachedPalette = null;/);
assert.match(starLogo, /function startAnimation\(\)/);
assert.match(starLogo, /function stopAnimation\(\)/);
assert.match(starLogo, /document\.addEventListener\('visibilitychange', onVisibilityChange\)/);
assert.match(starLogo, /document\.removeEventListener\('visibilitychange', onVisibilityChange\)/);
assert.doesNotMatch(
  starLogo,
  /function draw\([^)]*\) \{\s*const rect = canvas\.getBoundingClientRect\(\)/,
  'canvas draw loop must use cached dimensions instead of forcing layout every frame',
);
assert.doesNotMatch(
  starLogo,
  /resize\(\);\s*if \(!reduceMotion\) frameId = window\.requestAnimationFrame\(animate\);/,
  'Star canvas must not start an endless RAF loop on mount',
);

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

// Reduced-motion remains respected.
assert.match(effectCss, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(effectCss, /\[data-brian-star-fx='true'\]/);

console.log('✓ Navigation Star visuals remain intact while idle animation and per-event layout work stay disabled.');
