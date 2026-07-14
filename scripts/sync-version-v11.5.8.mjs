import fs from 'node:fs';
const now = new Date().toISOString();
const versionFile = 'public/version.json';
const manifestFile = 'public/release-manifest.json';
for (const file of [versionFile, manifestFile]) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  value.version = '11.5.8';
  value.releaseName = 'Provider Hub Input Stability';
  value.runtimeCore = '2.5.8';
  value.providerHubInputStability = true;
  value.providerKeyPasteGuard = true;
  value.generatedAt = now;
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 11.5.8');
