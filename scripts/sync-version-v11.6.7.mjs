import fs from 'node:fs';

const VERSION = '11.6.7';
const RELEASE_NAME = 'Brian AI Dock V2 + Persistent Personal Font';
const RUNTIME_CORE = '2.6.1';
const now = new Date().toISOString();

function updateJson(file, patch) {
  if (!fs.existsSync(file)) return;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, patch);
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

updateJson('public/version.json', {
  version: VERSION,
  releaseName: RELEASE_NAME,
  runtimeCore: RUNTIME_CORE,
  aiDockV2: true,
  persistentPersonalFont: true,
  pwaCacheVersion: VERSION,
  generatedAt: now,
});

updateJson('public/release-manifest.json', {
  version: VERSION,
  release: RELEASE_NAME,
  releaseName: RELEASE_NAME,
  runtimeCore: RUNTIME_CORE,
  aiDockV2: true,
  persistentPersonalFont: true,
  pwaCacheVersion: VERSION,
  generatedAt: now,
});

if (fs.existsSync('src/config/version.js')) {
  fs.writeFileSync(
    'src/config/version.js',
    `export const APP_VERSION = '${VERSION}';\n` +
      `export const RELEASE_NAME = '${RELEASE_NAME}';\n` +
      `export const RUNTIME_CORE_VERSION = '${RUNTIME_CORE}';\n` +
      `export const SCHEMA_VERSION = '11.4.2';\n` +
      `export function getVersionInfo(){return {application:APP_VERSION,release:RELEASE_NAME,runtime:RUNTIME_CORE_VERSION,schema:SCHEMA_VERSION};}\n`,
  );
}

if (fs.existsSync('index.html')) {
  const index = fs.readFileSync('index.html', 'utf8')
    .replace(/<meta name="bes-app-version" content="[^"]*">/, `<meta name="bes-app-version" content="${VERSION}">`);
  fs.writeFileSync('index.html', index);
}

if (fs.existsSync('public/sw.js')) {
  const sw = fs.readFileSync('public/sw.js', 'utf8')
    .replace(/const VERSION = '[^']*';/, `const VERSION = '${VERSION}';`);
  fs.writeFileSync('public/sw.js', sw);
}

console.log(`Version registry synchronized: ${VERSION}`);
