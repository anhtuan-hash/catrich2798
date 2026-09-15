import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('../src/components/GlobalEditorialAuthorityRuntime.jsx', import.meta.url), 'utf8');
const starLogo = fs.readFileSync(new URL('../src/components/BrianPulseLogo.jsx', import.meta.url), 'utf8');
const starLogoCss = fs.readFileSync(new URL('../src/components/BrianPulseLogo.css', import.meta.url), 'utf8');

assert.match(starLogo, /drawStarAura/);
assert.match(starLogo, /drawSatelliteSparkles/);
assert.match(starLogo, /pointerEnergy/);
assert.match(starLogoCss, /@keyframes brian-star-halo/);

assert.match(runtime, /import navStarEffectCss from '\.\/GlobalNavigationStarEffect\.css\?inline';/);
assert.match(runtime, /\$\{navStarEffectCss\}/);
assert.match(runtime, /function createNavStarEffect\(button, config\)/);
assert.match(runtime, /className = 'brian-nav-star-effect'/);
assert.match(runtime, /className = 'brian-nav-star-effect__aura'/);
assert.match(runtime, /className = 'brian-nav-star-effect__sparkle brian-nav-star-effect__sparkle--one'/);
assert.match(runtime, /className = 'brian-nav-star-effect__sparkle brian-nav-star-effect__sparkle--two'/);
assert.match(runtime, /className = 'brian-nav-star-effect__sparkle brian-nav-star-effect__sparkle--three'/);
assert.match(runtime, /button\.appendChild\(effect\)/);
assert.match(runtime, /button\.style\.setProperty\('--star-x', `\$\{x\}px`\)/);
assert.match(runtime, /button\.style\.setProperty\('--star-y', `\$\{y\}px`\)/);
assert.match(runtime, /button\.style\.setProperty\('--star-energy', String\(energy\)\)/);
assert.match(runtime, /button\.addEventListener\('pointermove', onStarPointerMove\)/);
assert.match(runtime, /button\.addEventListener\('pointerleave', onLeave\)/);
assert.match(runtime, /button\.addEventListener\('focus', onEnter\)/);
assert.match(runtime, /button\.removeEventListener\('pointermove', onStarPointerMove\)/);
assert.match(runtime, /effect\.remove\(\)/);

const expectedKeys = ['home', 'apps', 'dashboard', 'homeroom', 'gradebook', 'reports', 'ttcm', 'attendance'];
for (const key of expectedKeys) {
  assert.match(runtime, new RegExp(`key: '${key}'`), `Missing nav target ${key}`);
}
assert.equal(new Set(expectedKeys).size, 8);
assert.doesNotMatch(runtime, /document\.createElement\('canvas'\)/, 'Primary nav Star effect should avoid per-button canvas loops');

console.log('✓ Primary navigation Star effect contract is defined for all eight semantic nav targets.');
