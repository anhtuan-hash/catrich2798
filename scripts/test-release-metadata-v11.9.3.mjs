import assert from 'node:assert/strict';
import fs from 'node:fs';

const expectedVersion = '11.9.3';
const expectedRelease = 'Golden Bank & Exam Factory · Production Certified · Public Routes Restored';

const sync = fs.readFileSync('scripts/sync-version-v11.9.3.mjs', 'utf8');
const version = JSON.parse(fs.readFileSync('public/version.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('public/release-manifest.json', 'utf8'));

assert.equal(version.version, expectedVersion, 'version.json version must match v11.9.3.');
assert.equal(manifest.version, expectedVersion, 'release-manifest version must match v11.9.3.');
assert.equal(version.releaseName, expectedRelease, 'version.json releaseName must match the certified release.');
assert.equal(manifest.releaseName, expectedRelease, 'release-manifest releaseName must match the certified release.');
assert.equal(manifest.release, expectedRelease, 'release-manifest release must match releaseName.');
assert.equal(version.runtimeCore, '2.6.7');
assert.equal(manifest.runtimeCore, '2.6.7');
assert.ok(sync.includes("value.releaseName = 'Golden Bank & Exam Factory · Production Certified · Public Routes Restored'"), 'Version synchronizer must always update releaseName.');
assert.ok(sync.includes("value.release = 'Golden Bank & Exam Factory · Production Certified · Public Routes Restored'"), 'Version synchronizer must update release for release-manifest.');

console.log('PASS: Brian v11.9.3 release metadata is internally consistent.');
