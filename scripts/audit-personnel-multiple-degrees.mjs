import fs from 'node:fs';

const component = fs.readFileSync('src/components/PersonnelLookup.jsx', 'utf8');
const store = fs.readFileSync('src/utils/personnelDirectoryCloud.js', 'utf8');
const css = fs.readFileSync('src/styles/personnel-multiple-degrees.css', 'utf8');

const checks = [
  ['structured degrees array', /next\.degrees\s*=\s*cleanPersonnelDegrees/.test(store)],
  ['legacy degree migration', /function legacyDegree/.test(store)],
  ['profile version 3', /profile_version:\s*3/.test(store)],
  ['multiple degree marker', /supports_multiple_degrees:\s*true/.test(store)],
  ['add degree action', /t\.addDegree/.test(component)],
  ['draft degree retained before save', /setDraft\(\(current\)\s*=>\s*\(\{\s*\.\.\.current,\s*degrees:\s*nextDegrees\s*\}\)\)/.test(component)],
  ['remove degree action', /removeDegree\(index\)/.test(component)],
  ['highest degree radio', /highest-personnel-degree/.test(component)],
  ['same-level filter support', /hasDegreeLevel\(person, filter\)/.test(component)],
  ['degree approval comparison', /DegreeCompareValue/.test(component)],
  ['degree editor styling', /\.gpl-degree-card/.test(css)],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
console.log(`PASS ${checks.length} personnel multiple-degree checks`);
