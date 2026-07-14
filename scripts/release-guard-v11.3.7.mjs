import fs from 'node:fs';
const required=[
  'src/config/version.js','src/main.jsx','src/pages/Home.jsx','src/data/apps.js','src/data/designProfiles.js','src/styles/v1137.css',
  'scripts/check-v11.3.7.mjs','scripts/sync-version-v11.3.7.mjs','scripts/performance-budget-v11.3.7.mjs',
  'public/version.json','public/release-manifest.json'
];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed+=1;}else console.log(`✓ ${file}`);}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
if(pkg.version!=='11.3.7'||version.version!=='11.3.7'||version.runtimeCore!=='2.3.7'){console.error('✗ version registry mismatch');failed+=1;}else console.log('✓ version registry synchronized');
if(version.requiresSql||version.requiredMigration){console.error('✗ UI-only release must not require SQL');failed+=1;}else console.log('✓ no SQL migration required');
const lock=fs.readFileSync('package-lock.json','utf8');
if(lock.includes('applied-caas-gateway')){console.error('✗ internal registry found');failed+=1;}else console.log('✓ public npm registry only');
const home=fs.readFileSync('src/pages/Home.jsx','utf8');
for(const marker of ['home-v1137','home-motion-scene','handleScenePointerMove',"makeAppWindow('listening-lab'","makeAppWindow('grammar-builder'","makeAppWindow('writing-studio'","makeAppWindow('pronunciation-coach'"]){
  if(!home.includes(marker)){console.error(`✗ missing Home marker ${marker}`);failed+=1;}
}
const css=fs.readFileSync('src/styles/v1137.css','utf8');
for(const marker of ['home-card-drift','home-scene-orbit','home-motion-badge','prefers-reduced-motion']){
  if(!css.includes(marker)){console.error(`✗ missing CSS marker ${marker}`);failed+=1;}
}
if(failed) process.exit(1);
console.log('V11.3.7 release guard passed.');
