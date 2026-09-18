
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/utils/homeroomClassWorkspaceStore.js', import.meta.url), 'utf8');

assert.match(source, /brand-new device can create a fresh local\/default snapshot/i);
assert.match(source, /if \(expected && sameRevision\(expected, cloudUpdatedAt\)\)/);
assert.match(source, /if \(expected && !sameRevision\(expected, cloudUpdatedAt\)\)/);
assert.match(source, /Cloud wins on a fresh browser\/device/);

// Regression: do not restore the old behavior where a newer timestamp alone
// made an unversioned local cache authoritative over account cloud data.
assert.doesNotMatch(
  source,
  /const conflict = Boolean\(expected && !sameRevision\(expected, cloudUpdatedAt\)\);[\s\S]{0,400}const selected = conflict \? local :/,
);

console.log('PASS: fresh devices hydrate Homeroom data from the account cloud instead of an unversioned local cache.');
