import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const integration = read('src/components/ExternalAppsIntegration.jsx');
const hero = read('src/components/ExternalAppHero.jsx');

const checks = [
  ['dedicated route helper exists', integration.includes('externalAppRoute')],
  ['route parser reads app query', integration.includes("params.get('app')")],
  ['launcher navigates to dedicated route', integration.includes('window.location.hash = externalAppRoute(app)')],
  ['approved app is selected by id from route', integration.includes('dedicatedAppId') && integration.includes('dedicatedApp')],
  ['dedicated hero mounts above viewer', integration.includes('<ExternalAppHero') && integration.includes('introContent=')],
  ['generic app uses runtime anchor', integration.includes('external-app-runtime')],
  ['TESOL special route remains intact', integration.includes('TESOL_METHOD_HASH') && integration.includes('<TesolMethodHero')],
  ['hero returns to apps', hero.includes("window.location.hash = '#/apps'")],
  ['hero links to dashboard', hero.includes("window.location.hash = '#/dashboard'")],
  ['hero scrolls to runtime', hero.includes("getElementById('external-app-runtime')")],
  ['hero uses deterministic visual variant', hero.includes('variantForApp')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Dedicated external app page contract failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`Dedicated external app page contract passed (${checks.length} checks).`);
