import assert from 'node:assert/strict';
import fs from 'node:fs';

const component = fs.readFileSync(new URL('../src/components/GlobalCompactNavigation.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/components/GlobalCompactNavigation.css', import.meta.url), 'utf8');
const pastelCss = fs.readFileSync(new URL('../src/components/GlobalNavigationPastelPalette.css', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/components/GlobalEditorialAuthorityRuntime.jsx', import.meta.url), 'utf8');

assert.match(css, /background:\s*var\(--nav-item-bg,\s*transparent\)/);
assert.match(css, /background:\s*var\(--nav-item-hover-bg,\s*var\(--brian-nav-soft\)\)/);
assert.match(css, /background:\s*var\(--nav-item-active-bg,\s*var\(--brian-nav-soft\)\)/);
assert.match(css, /color:\s*var\(--nav-item-text,\s*var\(--brian-nav-muted\)\)/);
assert.match(css, /color:\s*var\(--nav-item-active-text,\s*var\(--brian-nav-ink\)\)/);

assert.match(component, /data-nav-key="home"[^>]*className=\{route === 'home' \? 'is-active' : ''\}/s);
assert.match(component, /data-nav-key="apps"[^>]*className=\{route === 'apps' \? 'is-active' : ''\}/s);
assert.match(component, /canShowApps \? <button/);
assert.match(component, /isAdmin \? <button/);

const palettes = [
  { key: 'home', selector: "[data-nav-key='home']", surface: '#e8f1ff', hover: '#dceaff', active: '#d2e3ff', ink: '#285ea8', border: '#c9dcff' },
  { key: 'apps', selector: "[data-nav-key='apps']", surface: '#dff8ec', hover: '#d2f3e3', active: '#c5edd9', ink: '#1f6a52', border: '#bcebd6' },
  { key: 'dashboard', selector: '.brian-nav__dashboard-tab', surface: '#eee5ff', hover: '#e5d8ff', active: '#dbcaff', ink: '#6248a3', border: '#d8c7ff' },
  { key: 'homeroom', selector: '.brian-nav__homeroom-tab', surface: '#ffe8f4', hover: '#ffdeef', active: '#ffd2e9', ink: '#8b4a6c', border: '#f6c7df' },
  { key: 'gradebook', selector: '.brian-nav__gradebook-tab', surface: '#ffede5', hover: '#ffe2d6', active: '#ffd7c7', ink: '#8a5946', border: '#f5d1c1' },
  { key: 'reports', selector: '.brian-nav__reports-tab', surface: '#fff5d8', hover: '#ffefc5', active: '#ffe8ae', ink: '#806522', border: '#f1dfa5' },
  { key: 'ttcm', selector: '.brian-nav__ttcm-tab', surface: '#efeaff', hover: '#e6deff', active: '#dcd1ff', ink: '#584b90', border: '#dad0ff' },
  { key: 'attendance', selector: '.brian-nav__attendance-tab', surface: '#dff8ff', hover: '#d1f2fb', active: '#c2ebf7', ink: '#24708a', border: '#b8e7f4' },
];

function runtimeBlock(key) {
  const match = runtime.match(new RegExp(`\\{\\s*key: '${key}',([\\s\\S]*?)\\n\\s*\\},`));
  assert.ok(match, `Missing production runtime palette target for ${key}`);
  return match[1];
}

for (const palette of palettes) {
  const block = runtimeBlock(palette.key);
  assert.ok(block.includes(palette.selector), `${palette.key} runtime selector must be semantic and stable`);
  assert.ok(block.includes(`surface: '${palette.surface}'`), `${palette.key} runtime surface must match approved pastel palette`);
  assert.ok(block.includes(`hoverSurface: '${palette.hover}'`), `${palette.key} runtime hover surface must match approved pastel palette`);
  assert.ok(block.includes(`activeSurface: '${palette.active}'`), `${palette.key} runtime active surface must match approved pastel palette`);
  assert.ok(block.includes(`ink: '${palette.ink}'`), `${palette.key} runtime ink must match approved pastel palette`);
  assert.ok(block.includes(`border: '${palette.border}'`), `${palette.key} runtime border must match approved pastel palette`);
  assert.ok(pastelCss.includes(palette.selector), `${palette.key} stylesheet must use the same semantic selector`);
}

assert.doesNotMatch(pastelCss, /button:not\(\[class\*='brian-nav__'\]\):(first-child|nth-of-type)/, 'Pastel authority must not depend on button position');
assert.doesNotMatch(runtime, /surface:\s*SOFT_SURFACE/, 'Production navigation runtime must not overwrite pastel buttons with the old gray surface');
assert.match(runtime, /active \? config\.activeSurface : hovered \? config\.hoverSurface : config\.surface/);
assert.match(runtime, /active \? config\.activeInk : config\.ink/);
assert.match(runtime, /active \? config\.activeBorder : config\.border/);
assert.match(runtime, /button\.style\.setProperty\(name, value, 'important'\)/);
assert.match(runtime, /styleColoredSurface\(button, config, true\)/);
assert.match(runtime, /styleColoredSurface\(button, config, false\)/);

assert.equal(new Set(palettes.map(({ surface }) => surface)).size, 8, 'All eight primary navigation functions must have distinct pastel surfaces');
assert.equal(new Set(palettes.map(({ active }) => active)).size, 8, 'All eight primary navigation functions must have distinct active surfaces');

console.log('✓ Production navigation runtime preserves eight semantic pastel identities without changing route or permission logic.');
