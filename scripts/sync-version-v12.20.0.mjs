import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.20.0',
    release: 'Interactive Department Cards',
    releaseName: 'Interactive Department Cards',
    runtimeCore: '3.6.0',
    uiCore: true,
    workspaceOsCore: true,
    departmentCommandCenter: true,
    departmentInteractiveCards: true,
    departmentDirectCalendar: true,
    departmentDirectTaskStatus: true,
    departmentEvidenceDropzone: true,
    departmentAiSuggestionActions: true,
    departmentDashboardJsonIO: true,
    departmentFourColumnDesktop: true,
    requiresSql: false,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.20.0');
