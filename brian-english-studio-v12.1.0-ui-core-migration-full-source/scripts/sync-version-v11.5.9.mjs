import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  value.version = '11.5.9';
  value.releaseName = 'BURS Comfortable — Unified Readability';
  value.runtimeCore = '2.5.9';
  value.bursComfortable = true;
  value.bursTypographyMinimum = 13;
  value.bursControlMinimum = 14;
  value.bursResponsiveWidths = [1440, 1280, 1024, 768, 390];
  value.bursShadowDomCoverage = true;
  value.bursGlobalFontScaling = true;
  value.bursCardSystem = 'Modern SaaS Workbench + Soft Editorial';
  value.generatedAt = now;
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 11.5.9');
