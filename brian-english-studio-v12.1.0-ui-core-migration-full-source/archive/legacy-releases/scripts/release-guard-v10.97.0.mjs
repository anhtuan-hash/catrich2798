import fs from 'node:fs';
import path from 'node:path';
const required=['src/pages/CloudOperations.jsx','src/utils/cloudOperations.js','src/styles/v1097.css','supabase/brian_v10_97_preflight.sql','supabase/brian_v10_97_cloud_operations.sql','supabase/brian_v10_97_verify.sql','public/version.json'];
let failed=0;
for(const file of required){const ok=fs.existsSync(file);console.log(`${ok?'✓':'✗'} ${file}`);if(!ok)failed++;}
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
if(version.version!=='10.97.0'){console.error('✗ version.json mismatch');failed++;}else console.log('✓ version.json 10.97.0');
const forbidden=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory()&&!['node_modules','dist','.git'].includes(entry.name))walk(p);else if(entry.isFile()&&/\.(ttf|otf|woff2?)$/i.test(entry.name))forbidden.push(p);}}
walk('.');
if(forbidden.length){console.error('✗ font files included:',forbidden);failed++;}else console.log('✓ no distributable font files added');
if(failed)process.exit(1); console.log('V10.97 release guard passed.');
