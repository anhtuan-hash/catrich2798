import fs from 'node:fs'; import path from 'node:path';
const required=['src/pages/CollaborationHub.jsx','src/pages/DataGovernance.jsx','src/utils/collaborationGovernance.js','src/styles/v1098.css','supabase/brian_v10_98_preflight.sql','supabase/brian_v10_98_collaboration_governance.sql','supabase/brian_v10_98_verify.sql','public/version.json'];
let failed=0;
for(const file of required){const ok=fs.existsSync(file);console.log(`${ok?'✓':'✗'} ${file}`);if(!ok)failed++;}
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
if(version.version!=='10.98.0'){console.error('✗ version.json mismatch');failed++;}else console.log('✓ version.json 10.98.0');
const forbidden=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','dist','.git','.bes-backup'].includes(entry.name))continue;const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(entry.isFile()&&/\.(ttf|otf|woff2?)$/i.test(entry.name))forbidden.push(p);}}
walk('.');
if(forbidden.length){console.error('✗ distributable font files detected:',forbidden);failed++;}else console.log('✓ no distributable font files added');
const index=fs.readFileSync('index.html','utf8');
if(/bes-supabase-(bridge|key-capture)/i.test(index)){console.error('✗ legacy Supabase bridge returned');failed++;}else console.log('✓ no legacy Supabase bridge tags');
if(failed)process.exit(1); console.log('V10.98 release guard passed.');
