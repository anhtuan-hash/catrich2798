import assert from 'node:assert/strict';
import fs from 'node:fs';

const navigation = fs.readFileSync(new URL('../src/components/GlobalFlatNavigation.jsx', import.meta.url), 'utf8');
const clearanceCss = fs.readFileSync(new URL('../src/components/GlobalNavigationStarEffect.css', import.meta.url), 'utf8');

// The standalone 64px Star action is retired from desktop navigation.
assert.doesNotMatch(navigation, /HomeParticleSignaturePortal/);

// Navigation must no longer reserve or compact desktop space specifically for that Star.
assert.doesNotMatch(clearanceCss, /including the 64px Star/);
assert.doesNotMatch(clearanceCss, /max-width:\s*1600px[^}]*min-width:\s*1281px/);

console.log('✓ Navigation no longer reserves desktop space for the retired Star action.');
