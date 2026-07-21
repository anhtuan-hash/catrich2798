import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.21.0',
    release: 'Refined Department Workspace',
    releaseName: 'Refined Department Workspace',
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
    departmentFourColumnDesktop: false,
    departmentRefinedWorkspace: true,
    departmentCompactOverview: true,
    departmentTwoColumnFocusWorkspace: true,
    departmentContainedScrollAreas: true,
    departmentDirectScheduleComposer: true,
    departmentRecentActivityFeed: true,
    requiresSql: false,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.21.0');
