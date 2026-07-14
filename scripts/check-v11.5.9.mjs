import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const required = [
  ['src/styles/v1159.css', ['BURS Comfortable', '--burs-font-body', '--burs-radius-lg', '.gb-page', '.ws-page', '.pc-app', '.worksheet-factory-page']],
  ['src/utils/bursReadability.js', ['installBursReadability', 'MIN_TEXT_PX = 13', 'MIN_CONTROL_PX = 14', 'ensureShadowStyle', 'MutationObserver']],
  ['src/main.jsx', ["./styles/v1159.css", 'installBursReadability();', 'data-burs="comfortable"', 'bes:font-scale-changed']],
];
let passed = 0;
for (const [file, tokens] of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  const source = fs.readFileSync(file, 'utf8');
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${file} missing ${token}`);
    passed += 1;
  }
}
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.version !== '11.5.9') throw new Error(`Expected 11.5.9, got ${pkg.version}`);
passed += 1;
execFileSync(process.execPath, ['scripts/burs-audit-v11.5.9.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/burs-layout-contract-v11.5.9.mjs'], { stdio: 'inherit' });
console.log(`V11.5.9 BURS Comfortable checks: ${passed}/${passed} PASS`);
