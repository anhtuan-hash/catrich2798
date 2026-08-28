import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const source = readFileSync(resolve(root, 'src/utils/gradebookWorkspaceStore.js'), 'utf8');

assert.match(source, /const GRADEBOOK_TABLE = 'bes_gradebook_workspaces'/, 'Gradebook must keep its dedicated cloud table.');
assert.match(source, /function readDedicatedLocalGradebookClass\(user, classId\)/, 'A dedicated-only local reader must exist.');
assert.match(source, /export function summarizeGradebookMigration\(items = \[\]\)/, 'Migration completeness must be measurable.');
assert.match(source, /summary\.complete = summary\.pending === 0 && summary\.compatibility === 0/, 'Compatibility removal must require zero pending/compatibility classes.');
assert.match(source, /migrationState: 'migrated'/, 'Dedicated metadata must be marked migrated.');
assert.match(source, /markMigrationState\(listLocalHomeroomWorkspaces\(user\), 'pending'\)/, 'Legacy-only local catalog entries must be marked pending.');
assert.match(source, /markMigrationState\(legacy\.items \|\| \[\], 'compatibility', 'legacy-cloud-compat'\)/, 'Missing Gradebook table must be explicit compatibility state.');

const loadStart = source.indexOf('export async function loadGradebookClass');
const loadEnd = source.indexOf('export function saveLocalGradebookClass', loadStart);
assert.ok(loadStart >= 0 && loadEnd > loadStart, 'Gradebook load function boundaries must exist.');
const loadBody = source.slice(loadStart, loadEnd);

const dedicatedRead = loadBody.indexOf('const local = readDedicatedLocalGradebookClass(user, classId);');
const legacyCloudRead = loadBody.indexOf('const legacy = await loadHomeroomWorkspace(user, classId);');
assert.ok(dedicatedRead >= 0, 'Gradebook load must read dedicated local state first.');
assert.ok(legacyCloudRead > dedicatedRead, 'Homeroom fallback must occur only after dedicated state is checked.');
assert.match(loadBody, /if \(local\) \{[\s\S]*?source: 'gradebook-cloud-restored'/, 'A dedicated local class must restore missing dedicated cloud state without Homeroom fallback.');
assert.match(loadBody, /if \(tableMissing\) \{[\s\S]*?migrationState: 'compatibility'/, 'Dedicated local data must remain usable when the Gradebook table is unavailable.');
assert.match(loadBody, /if \(error\) \{[\s\S]*?workspace: local,[\s\S]*?migrationState: 'migrated'/, 'A transient cloud error must not cause a migrated local class to fall back to Homeroom.');
assert.match(loadBody, /upsertGradebookCloud\(workspace, user, \{ migratedFromHomeroom: true \}\)/, 'Legacy data must still migrate once when no dedicated state exists.');

assert.match(source, /learningRecords: Array\.isArray\(normalized\.learningRecords\)/, 'Legacy learningRecords must remain available during the migration window.');
assert.match(source, /async function saveLegacyCompatibility/, 'Compatibility writer must remain until migration is complete.');
assert.match(source, /if \(cloud\.missingTable\)/, 'Legacy compatibility writes must remain limited to the missing-table path.');

console.log('Gradebook dedicated-first migration-state contract passed.');
