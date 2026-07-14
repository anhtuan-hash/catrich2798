import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.11.0',
    release: 'Universal Command Center',
    releaseName: 'Universal Command Center',
    runtimeCore: '3.5.0',
    uiCore: true,
    workspaceOsCore: true,
    workspacePrimaryNavigation: true,
    unifiedActivityCenter: true,
    universalCommandCenter: true,
    commandScopes: ['all', 'apps', 'pages', 'workspaces', 'actions'],
    commandQueryPrefixes: ['>', '@', '/', '#'],
    commandHistory: true,
    pinnedCommands: true,
    workspaceResumeCommands: true,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.11.0');
