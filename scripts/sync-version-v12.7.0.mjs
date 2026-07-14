import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.7.0',
    release: 'Native Design Adapters & Appearance Sync',
    releaseName: 'Native Design Adapters & Appearance Sync',
    runtimeCore: '3.1.0',
    uiCore: true,
    nativeAppearanceCore: true,
    legacyAppearanceMutationObserver: false,
    designAdapterCore: true,
    designLanguages: ['brian-unified', 'material-3', 'apple'],
    accountSyncedUiPreferences: true,
    uiPreferencesMetadataKey: 'brian_ui_preferences_v12',
    accentTokenSystem: true,
    densityTokenSystem: true,
    fontPersistenceBridge: true,
    personalFontBundled: false,
    overlayCore: true,
    reactAiDockCore: true,
    workbenchCore: true,
    managementCore: true,
    libraryCore: true,
    launchCore: true,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.7.0');
