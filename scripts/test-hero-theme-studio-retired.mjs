import fs from 'node:fs';

const failures = [];
const removedPaths = [
  'src/components/admin/HeroThemeStudio.jsx',
  'src/components/admin/HeroThemeStudioBridge.jsx',
  'src/components/HeroThemeRuntime.jsx',
  'src/heroTheme/heroRegistry.js',
  'src/heroTheme/heroThemeClient.js',
  'src/heroTheme/heroThemeModel.js',
  'src/styles/HeroThemeStudio.css',
  'src/styles/HeroThemeRuntime.css',
  'api/hero-theme-gateway.js',
  'api/hero-theme-upload.js',
  'server/api/_heroTheme.js',
  'serverless-handlers/hero-theme-admin.js',
  'serverless-handlers/hero-theme-manifest.js',
  'serverless-handlers/hero-theme-media.js',
  'supabase/brian_hero_theme_studio.sql',
  'scripts/test-hero-theme-studio.mjs',
  'scripts/test-hero-theme-studio-settings-route.mjs',
  'scripts/test-hero-theme-registry-matrix.mjs',
];

for (const file of removedPaths) {
  if (fs.existsSync(file)) failures.push(`retired Hero Theme Studio file still exists: ${file}`);
}

const guard = fs.readFileSync('src/components/GlobalRuntimeGuard.jsx', 'utf8');
if (/HeroThemeRuntime|HeroThemeStudioBridge|showHeroThemeStudio/.test(guard)) {
  failures.push('GlobalRuntimeGuard still mounts retired Hero Theme Studio/runtime code.');
}

const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const rewriteBySource = new Map((vercel.rewrites || []).map((row) => [row.source, row.destination]));
for (const route of ['/api/hero-theme-admin','/api/hero-theme-manifest','/api/hero-theme-media']) {
  if (rewriteBySource.has(route)) failures.push(`retired API rewrite still exists: ${route}`);
}

if (rewriteBySource.get('/api/homepage-hero-publish') !== '/api/homepage-hero-gateway?handler=publish') {
  failures.push('desktop homepage Hero publishing route must remain active through homepage-hero-gateway.');
}
if (rewriteBySource.get('/api/homepage-mobile-hero-publish') !== '/api/homepage-hero-gateway?handler=mobile-publish') {
  failures.push('mobile homepage Hero publishing route must remain active through homepage-hero-gateway.');
}

const homepageGateway = fs.readFileSync('api/homepage-hero-gateway.js', 'utf8');
if (!/homepage-hero-publish\.js/.test(homepageGateway) || !/homepage-mobile-hero-publish\.js/.test(homepageGateway)) {
  failures.push('homepage-hero-gateway must preserve both desktop and mobile homepage publishers.');
}
if (/hero-theme-admin|hero-theme-manifest|hero-theme-media/.test(homepageGateway)) {
  failures.push('homepage-hero-gateway must not retain Hero Theme Studio handlers.');
}

for (const preserved of [
  'src/components/HomeHeroExperience2026.jsx',
  'src/components/HomeHeroCmsEditor.jsx',
  'src/utils/homepageHeroCms.js',
  'serverless-handlers/homepage-hero-publish.js',
  'serverless-handlers/homepage-mobile-hero-publish.js',
  'public/hero/hero-current.json',
  'public/hero/mobile-current.json',
]) {
  if (!fs.existsSync(preserved)) failures.push(`homepage Hero dependency was removed unexpectedly: ${preserved}`);
}

const gradebookCss = fs.readFileSync('src/styles/GradebookMaterialHeroRuntime.css','utf8');
if (/hero-theme-runtime__layer/.test(gradebookCss)) failures.push('dead Hero Theme runtime selector remains in Gradebook CSS.');

const cleanupMigration = 'supabase/migrations/20261010110000_remove_hero_theme_studio.sql';
if (!fs.existsSync(cleanupMigration)) failures.push('Hero Theme Studio database cleanup migration is missing.');

if (failures.length) {
  console.error(`Hero Theme Studio retirement contract FAILED (${failures.length})`);
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log('Hero Theme Studio retired; homepage Hero publishing preserved.');
