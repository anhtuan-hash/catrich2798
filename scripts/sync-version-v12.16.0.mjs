import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.16.0',
    release: 'Creative App Directory Hero',
    releaseName: 'Creative App Directory Hero',
    runtimeCore: '3.6.0',
    uiCore: true,
    workspaceOsCore: true,
    universalCommandCenter: true,
    universalSearchIndex: true,
    workspaceLayoutManager: true,
    workspaceSplitView: true,
    workspaceFocusMode: true,
    workspaceLayoutModes: ['single', 'split'],
    splitViewRatioRange: [30, 70],
    embeddedWorkspaceRoutes: true,
    universalSearchSources: ['library-history', 'prompt-library', 'question-bank', 'resource-library', 'activity-center'],
    commandScopes: ['all', 'apps', 'pages', 'workspaces', 'actions', 'content'],
    commandQueryPrefixes: ['>', '@', '/', '#', '~'],
    contentSearchShortcut: 'Command/Ctrl+Shift+F',
    permissionAwareContentSearch: true,
    deepLinkedSearchResults: true,
    requiresSql: false,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.16.0');
