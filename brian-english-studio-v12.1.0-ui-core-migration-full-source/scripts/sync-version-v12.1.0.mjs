import fs from 'node:fs';

const version = '12.1.0';
const generatedAt = new Date().toISOString();
const common = {
  version,
  releaseName: 'UI Core Foundation — Brian Design Language Engine',
  runtimeCore: '3.0.0',
  schemaVersion: '11.4.2',
  uiCore: true,
  uiCoreVersion: 'v12',
  semanticTokens: true,
  layoutContracts: ['launch', 'workbench', 'editor', 'management', 'library', 'settings', 'auth', 'public'],
  designLanguageAdapters: ['brian-unified', 'material-3', 'apple'],
  defaultDesignLanguage: 'brian-unified',
  legacyCompatibilityBridge: true,
  legacyDomPatches: false,
  persistentFontPath: '/bes-fonts/brian-personal-font.ttf',
  generatedAt,
};

for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, common);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

fs.writeFileSync('src/config/version.js', `export const APP_VERSION = '${version}';\nexport const RELEASE_NAME = 'UI Core Foundation — Brian Design Language Engine';\nexport const RUNTIME_CORE_VERSION = '3.0.0';\nexport const SCHEMA_VERSION = '11.4.2';\nexport function getVersionInfo(){return {application:APP_VERSION,release:RELEASE_NAME,runtime:RUNTIME_CORE_VERSION,schema:SCHEMA_VERSION};}\n`);

console.log(`Version registry synchronized: ${version}`);
