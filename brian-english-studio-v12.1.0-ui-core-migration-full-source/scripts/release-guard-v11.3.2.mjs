import fs from 'node:fs';
const required=[
  'src/config/version.js','src/main.jsx','src/pages/HiddenAppsVault.jsx','src/utils/appVisibility.js',
  'src/data/appVisibilityRegistry.js','src/styles/v1132.css','src/pages/WebApps.jsx',
  'src/components/GlobalFlatNavigation.jsx','src/components/GlobalCommandPalette.jsx',
  'supabase/brian_v11_3_2_preflight.sql','supabase/brian_v11_3_2_app_visibility.sql','supabase/brian_v11_3_2_verify.sql',
  'public/version.json','public/release-manifest.json'
];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed++;}else console.log(`✓ ${file}`);}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
if(pkg.version!=='11.3.2'||version.version!=='11.3.2'||version.runtimeCore!=='2.3.2'||version.schemaVersion!=='11.3.2'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
if(!version.requiresSql||version.requiredMigration!=='supabase/brian_v11_3_2_app_visibility.sql'){console.error('✗ required migration is not registered');failed++;}else console.log('✓ migration requirement registered');
const lock=fs.readFileSync('package-lock.json','utf8');
if(lock.includes('applied-caas-gateway')){console.error('✗ internal registry found');failed++;}else console.log('✓ public npm registry only');
const main=fs.readFileSync('src/main.jsx','utf8');
if(!main.includes("'app-vault'")||!main.includes('visibilityReady')||!main.includes('temporarilyHidden')){console.error('✗ route enforcement missing');failed++;}else console.log('✓ route enforcement present');
const sql=fs.readFileSync('supabase/brian_v11_3_2_app_visibility.sql','utf8');
for(const marker of ['app_visibility_settings','app_visibility_read_v1132','app_visibility_insert_v1132','app_visibility_update_v1132','supabase_realtime']){
  if(!sql.includes(marker)){console.error(`✗ missing SQL marker ${marker}`);failed++;}
}
if(failed) process.exit(1);
console.log('V11.3.2 release guard passed.');
