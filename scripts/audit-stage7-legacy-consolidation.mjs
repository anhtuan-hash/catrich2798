import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const main = read('src/main.jsx');
const v1093 = read('src/styles/v1093.css');
const v1096 = read('src/styles/v1096.css');
const runtime = read('src/components/GlobalEditorialAuthorityRuntime.jsx');
const failures = [];

const stripCssComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').trim();
const versionedImports = [...main.matchAll(/import ['"]\.\/styles\/(v\d+\.css)['"];?/g)].map((match) => match[1]);
const retiredTombstones = new Set(['v1093.css', 'v1096.css']);
const activePayloadImports = versionedImports.filter((name) => !retiredTombstones.has(name));

for (const name of retiredTombstones) {
  if (!versionedImports.includes(name)) failures.push(`main.jsx: expected temporary tombstone import ${name} is missing; remove it only with a bootstrap cleanup audit`);
}

if (stripCssComments(v1093)) failures.push('v1093.css: retired tombstone contains active CSS again');
if (stripCssComments(v1096)) failures.push('v1096.css: retired tombstone contains active CSS again');

if (versionedImports.length > 15) failures.push(`main.jsx: historical versioned imports grew beyond 15 (${versionedImports.length})`);
if (activePayloadImports.length > 13) failures.push(`main.jsx: active versioned CSS payload debt grew beyond 13 (${activePayloadImports.length})`);

// v1096 belonged to the standalone Automation Center UI. Version-tagged storage,
// event and source keys are intentionally preserved for data/runtime compatibility;
// only UI class consumers would justify restoring the retired stylesheet.
if (/currentRoute === ['"]automation-center['"]\s*&&/.test(main)) {
  failures.push('main.jsx: retired standalone Automation Center renderer returned');
}

const sourceRoot = path.join(root, 'src');
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const absolute = path.join(directory, entry.name);
  if (entry.isDirectory()) return walk(absolute);
  return [absolute];
});

for (const absolute of walk(sourceRoot)) {
  // UI consumers in JSX/TSX are the relevant evidence for a retired CSS namespace.
  // Plain JS may legitimately retain v1096 in storage/event compatibility keys.
  if (!/\.(?:jsx|tsx)$/.test(absolute)) continue;
  const source = fs.readFileSync(absolute, 'utf8');
  if (/v1096-/.test(source)) failures.push(`${path.relative(root, absolute)}: JSX/TSX uses retired v1096-* UI namespace`);
}

// Protect active neighbors that were explicitly verified during Stage 7.
if (!exists('src/styles/v1095.css')) failures.push('v1095.css: active Knowledge Hub stylesheet was removed without migration proof');
if (!exists('src/styles/v1097.css')) failures.push('v1097.css: active Cloud Operations stylesheet was removed without migration proof');
const cloud = read('src/pages/CloudOperations.jsx');
if (!cloud.includes('v1097-page')) failures.push('CloudOperations.jsx: expected active v1097-page contract changed; re-audit v1097 before cleanup');

// Stages 5–6 remain the final visual authority while legacy payloads are reduced.
for (const required of ['BrianStage5Migration.css?inline', 'BrianStage5WorkflowMigration.css?inline', 'BrianStage6Polish.css?inline']) {
  if (!runtime.includes(required)) failures.push(`GlobalEditorialAuthorityRuntime.jsx: missing ${required}`);
}

if (failures.length) {
  console.error('Stage 7 legacy consolidation audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Stage 7 legacy consolidation audit passed.');
console.log(`Historical versioned imports: ${versionedImports.length}/15.`);
console.log(`Active versioned CSS payloads: ${activePayloadImports.length}/13.`);
console.log(`Retired stylesheet tombstones: ${[...retiredTombstones].join(', ')}.`);
console.log('Version-tagged runtime/storage keys remain allowed; retired UI class consumers do not.');
console.log('Verified active neighbors retained: v1095 (Knowledge Hub), v1097 (Cloud Operations).');
