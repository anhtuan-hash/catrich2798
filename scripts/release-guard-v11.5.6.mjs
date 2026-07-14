import fs from 'node:fs';
const required=['src/config/version.js','src/pages/AIWorkspace.jsx','src/utils/gemini.js','src/utils/aiWorkspaceFallback.js','src/styles/v1093.css','scripts/check-v11.5.6.mjs','scripts/sync-version-v11.5.6.mjs','scripts/performance-budget-v11.5.6.mjs','public/version.json','public/release-manifest.json','.bes-release/v11.5.6.json'];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed++;}else console.log(`✓ ${file}`);}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
if(pkg.version!=='11.5.6'||version.version!=='11.5.6'||release.version!=='11.5.6'||version.runtimeCore!=='2.5.6'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
const checks=[
  ['adaptive retry',fs.readFileSync('src/utils/gemini.js','utf8').includes('affordable >= 80')],
  ['internal fallback',fs.readFileSync('src/pages/AIWorkspace.jsx','utf8').includes('buildWorkspaceLocalFallback')],
  ['fallback content',fs.readFileSync('src/utils/aiWorkspaceFallback.js','utf8').includes('BẢN KHỞI TẠO ĐỀ THI THPT')],
  ['resilience UI',fs.readFileSync('src/styles/v1093.css','utf8').includes('.v1156-resilience-bar')],
  ['Listening Lab still removed',!fs.readFileSync('src/data/apps.js','utf8').includes("slug: 'listening-lab'")],
];
for(const [label,ok] of checks){if(!ok){console.error(`✗ ${label}`);failed++;}else console.log(`✓ ${label}`);}
const apiEntries=fs.readdirSync('api').filter((name)=>!name.startsWith('_')&&/\.(?:js|mjs|ts|py|go)$/i.test(name));
if(apiEntries.length>12){console.error(`✗ Vercel function count ${apiEntries.length}`);failed++;}else console.log(`✓ Vercel functions ${apiEntries.length}/12`);
if(failed)process.exit(1);
console.log('V11.5.6 release guard passed.');
