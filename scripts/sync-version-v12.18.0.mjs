import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.18.0',
    release: 'Global 16:9 Widescreen Canvas',
    releaseName: 'Global 16:9 Widescreen Canvas',
    runtimeCore: '3.6.0',
    uiCore: true,
    workspaceOsCore: true,
    globalWidescreenCanvas: true,
    globalAspectRatio: '16:9',
    edgeToEdgeContentRail: true,
    widescreenMaxWidth: 3840,
    desktopPageGutter: '10-22px',
    widescreenAppGridColumns: [5, 6, 7, 8],
    responsiveWidescreenFallback: true,
    appDirectoryLauncherVisible: false,
    appDirectoryRecentRail: false,
    modernAppCardGallery: true,
    requiresSql: false,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.18.0');
