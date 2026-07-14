import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.version !== '11.5.8') throw new Error('package version mismatch');
const version = JSON.parse(fs.readFileSync('public/version.json', 'utf8'));
if (version.version !== '11.5.8' || !version.providerHubInputStability) throw new Error('version registry mismatch');
const source = fs.readFileSync('src/utils/providerHubInputGuard.js', 'utf8');
for (const token of ['MutationObserver', 'focusin', 'paste', 'stopProviderReset', 'data-1p-ignore']) if (!source.includes(token)) throw new Error(`guard missing ${token}`);
console.log('V11.5.8 release guard passed.');
