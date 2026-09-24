import assert from 'node:assert/strict';
import fs from 'node:fs';

const expectedVersion = '11.9.5';
const expectedRelease = 'Golden Bank & Exam Factory · Production Certified · Canonical Role Guards';

const sync = fs.readFileSync('scripts/sync-version-v11.9.5.mjs', 'utf8');
const version = JSON.parse(fs.readFileSync('public/version.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('public/release-manifest.json', 'utf8'));
const index = fs.readFileSync('index.html', 'utf8');

assert.equal(version.version, expectedVersion);
assert.equal(manifest.version, expectedVersion);
assert.equal(version.releaseName, expectedRelease);
assert.equal(manifest.releaseName, expectedRelease);
assert.equal(manifest.release, expectedRelease);
assert.equal(version.runtimeCore, '2.6.7');
assert.equal(manifest.runtimeCore, '2.6.7');
assert.ok(sync.includes('value.releaseName = expectedRelease;'));
assert.ok(sync.includes('value.release = expectedRelease;'));
assert.ok(sync.includes('bes-app-version'));
assert.match(index, /<meta\s+name=["']bes-app-version["']\s+content=["']11\.9\.5["']/i);

console.log('PASS: Brian v11.9.5 release metadata is internally consistent.');
