import fs from 'node:fs';
const required = [
  ['src/utils/providerHubInputGuard.js', ['installProviderHubInputGuard', 'data-bes-api-key-input', 'stopProviderReset', 'data-1p-ignore']],
  ['src/styles/v1158.css', ['data-bes-provider-key-editing', 'data-bes-provider-editor-locked', 'data-bes-provider-list']],
  ['src/main.jsx', ['installProviderHubInputGuard', "./styles/v1158.css"]],
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
if (pkg.version !== '11.5.8') throw new Error(`Expected 11.5.8, got ${pkg.version}`);
passed += 1;
console.log(`V11.5.8 provider input checks: ${passed}/${passed} PASS`);
