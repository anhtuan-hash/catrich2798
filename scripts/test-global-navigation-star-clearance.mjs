import assert from 'node:assert/strict';
import fs from 'node:fs';

const navigationCss = fs.readFileSync(new URL('../src/styles/GlobalNavigationFinal2026.css', import.meta.url), 'utf8');
const starCss = fs.readFileSync(new URL('../src/components/BrianPulseLogo.css', import.meta.url), 'utf8');

// The approved Star stays large; the fix must create space around it rather than shrinking it.
assert.match(
  starCss,
  /\.brian-pulse-logo-trigger\{[\s\S]*?width:64px;[\s\S]*?min-width:64px;[\s\S]*?height:64px;[\s\S]*?flex:0 0 64px;/,
);

// Actions must paint above decorative primary-nav effects if the two rails ever touch.
assert.match(
  navigationCss,
  /\.brian-nav__actions\s*\{[\s\S]*?position:\s*relative\s*!important;[\s\S]*?z-index:\s*4\s*!important;[\s\S]*?isolation:\s*isolate\s*!important;/,
);

// Laptop/desktop widths need a compact primary rail before the existing <=1280 layout kicks in.
// This preserves every destination while freeing enough horizontal room for the 64px Star action.
assert.match(navigationCss, /@media \(max-width: 1600px\) and \(min-width: 1281px\)/);
assert.match(
  navigationCss,
  /@media \(max-width: 1600px\) and \(min-width: 1281px\)[\s\S]*?\.brian-nav__primary\s*\{[\s\S]*?gap:\s*2px\s*!important;/,
);
assert.match(
  navigationCss,
  /@media \(max-width: 1600px\) and \(min-width: 1281px\)[\s\S]*?\.brian-nav__primary > :is\(button,a,\[role='button'\]\)[\s\S]*?padding:\s*0 7px 0 27px\s*!important;[\s\S]*?font-size:\s*11\.5px\s*!important;/,
);
assert.match(
  navigationCss,
  /@media \(max-width: 1600px\) and \(min-width: 1281px\)[\s\S]*?\.brian-nav__account strong[\s\S]*?max-width:\s*70px\s*!important;/,
);

console.log('✓ Navigation reserves clear visual space for the 64px Star action at laptop/desktop widths.');
