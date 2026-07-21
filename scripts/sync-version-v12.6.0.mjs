import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.6.0',
    release: 'Overlay, Dialog & AI Dock Core Migration',
    releaseName: 'Overlay, Dialog & AI Dock Core Migration',
    runtimeCore: '3.0.0',
    uiCore: true,
    overlayCore: true,
    nativeOverlayPrimitives: true,
    migratedGlobalOverlays: ['command-palette', 'notification-center', 'content-transfer', 'autosave-history'],
    globalToastCenter: true,
    reactAiDockCore: true,
    legacyInjectedAiDock: false,
    aiDockComposerCore: true,
    overlayFocusTrap: true,
    overlayScrollLock: true,
    workbenchCore: true,
    managementCore: true,
    libraryCore: true,
    launchCore: true,
    designLanguages: ['brian-unified', 'material-3', 'apple'],
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.6.0');
