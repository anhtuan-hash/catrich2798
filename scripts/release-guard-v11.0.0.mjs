import fs from 'node:fs';
import path from 'node:path';
const required=['src/config/version.js','src/pages/LessonPack.jsx','src/utils/lessonPack.js','src/styles/v1100.css','supabase/brian_v11_0_preflight.sql','supabase/brian_v11_0_connected_teaching_suite.sql','supabase/brian_v11_0_verify.sql','public/version.json','public/release-manifest.json'];
let failed=0;
for(const file of required){const ok=fs.existsSync(file);console.log(`${ok?'✓':'✗'} ${file}`);if(!ok)failed++;}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
const main=fs.readFileSync('src/main.jsx','utf8');
if(pkg.version!=='11.0.0'||version.version!=='11.0.0'||version.runtimeCore!=='2.0.0'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
if(!main.includes("currentRoute === 'lesson-pack'")||!main.includes("./styles/v1100.css")){console.error('✗ Lesson Pack route or styles missing');failed++;}else console.log('✓ Lesson Pack route and styles loaded');
const forbidden=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','dist','.git','.bes-backup','test-results','playwright-report'].includes(entry.name))continue;const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(/\.(ttf|otf|woff2?)$/i.test(entry.name))forbidden.push(p);}}
walk('.');
if(forbidden.length){console.error('✗ distributable font files detected',forbidden);failed++;}else console.log('✓ no distributable font files added');
const lock=fs.readFileSync('package-lock.json','utf8');
const internalRegistryMarker=['applied','caas','gateway'].join('-');
if(lock.includes(internalRegistryMarker)){console.error('✗ internal npm registry remains in package-lock');failed++;}else console.log('✓ package-lock uses public registry');
if(failed)process.exit(1);
console.log('V11.0 release guard passed.');
