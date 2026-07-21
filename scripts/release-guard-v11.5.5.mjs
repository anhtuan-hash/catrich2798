import fs from 'node:fs';
const required=['src/config/version.js','src/data/apps.js','src/pages/Home.jsx','src/styles/v1137.css','src/data/designProfiles.js','src/pages/PronunciationCoach.jsx','scripts/check-v11.5.5.mjs','scripts/sync-version-v11.5.5.mjs','scripts/performance-budget-v11.5.5.mjs','public/version.json','public/release-manifest.json','.bes-release/v11.5.5.json'];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed++;}else console.log(`✓ ${file}`);}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
if(pkg.version!=='11.5.5'||version.version!=='11.5.5'||release.version!=='11.5.5'||version.runtimeCore!=='2.5.5'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
const checks=[
  ['app registry',!fs.readFileSync('src/data/apps.js','utf8').includes("slug: 'listening-lab'")],
  ['home constellation',!fs.readFileSync('src/pages/Home.jsx','utf8').includes("makeAppWindow('listening-lab'")],
  ['home styles',!fs.readFileSync('src/styles/v1137.css','utf8').includes('.flat-window-listening')],
  ['design profile',!fs.readFileSync('src/data/designProfiles.js','utf8').includes("'listening-lab':")],
  ['connected workflow',!fs.readFileSync('src/pages/PronunciationCoach.jsx','utf8').includes("id: 'listening-lab'")],
];
for(const [label,ok] of checks){if(!ok){console.error(`✗ ${label}`);failed++;}else console.log(`✓ ${label}`);}
const apiEntries=fs.readdirSync('api').filter((name)=>!name.startsWith('_')&&/\.(?:js|mjs|ts|py|go)$/i.test(name));
if(apiEntries.length>12){console.error(`✗ Vercel function count ${apiEntries.length}`);failed++;}else console.log(`✓ Vercel functions ${apiEntries.length}/12`);
if(failed)process.exit(1);
console.log('V11.5.5 release guard passed.');
