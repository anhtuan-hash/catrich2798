import fs from 'node:fs';
const required=[
  'src/config/version.js','src/main.jsx','src/pages/WebApps.jsx','src/utils/launcherPreferences.js','src/styles/v1136.css',
  'scripts/check-v11.3.6.mjs','scripts/sync-version-v11.3.6.mjs','scripts/performance-budget-v11.3.6.mjs',
  'public/version.json','public/release-manifest.json'
];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed+=1;}else console.log(`✓ ${file}`);}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
if(pkg.version!=='11.3.6'||version.version!=='11.3.6'||version.runtimeCore!=='2.3.6'){console.error('✗ version registry mismatch');failed+=1;}else console.log('✓ version registry synchronized');
if(version.requiresSql||version.requiredMigration){console.error('✗ UI-only release must not require SQL');failed+=1;}else console.log('✓ no SQL migration required');
const lock=fs.readFileSync('package-lock.json','utf8');
if(lock.includes('applied-caas-gateway')){console.error('✗ internal registry found');failed+=1;}else console.log('✓ public npm registry only');
const webApps=fs.readFileSync('src/pages/WebApps.jsx','utf8');
for(const marker of ['LauncherStyleSelector','LauncherDock','launcher-v1136','launcherStyle']){
  if(!webApps.includes(marker)){console.error(`✗ missing WebApps marker ${marker}`);failed+=1;}
}
const prefs=fs.readFileSync('src/utils/launcherPreferences.js','utf8');
for(const marker of ['schemaVersion: 5','launcherStyle',"'radial'","'water'"]){
  if(!prefs.includes(marker)){console.error(`✗ missing launcher config marker ${marker}`);failed+=1;}
}
const css=fs.readFileSync('src/styles/v1136.css','utf8');
for(const marker of ['launcher-style-selector','launcher-live-dock.is-water','launcher-live-dock.is-radial','Strictly aligned cards']){
  if(!css.includes(marker)){console.error(`✗ missing CSS marker ${marker}`);failed+=1;}
}
if(failed) process.exit(1);
console.log('V11.3.6 release guard passed.');
