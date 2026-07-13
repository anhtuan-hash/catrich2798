import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const failures=[];const warnings=[];
const mustExist=[
 'index.html','package.json','package-lock.json','src/main.jsx','src/pages/LearningIntelligence.jsx','src/styles/v1094.css',
 'src/services/runtime/core.js','src/pages/ContentFactory.jsx','supabase/brian_v10_94_preflight.sql',
 'supabase/brian_v10_94_learning_intelligence.sql','supabase/brian_v10_94_verify.sql','public/version.json',
 'public/bes-release-v10.94.0.json','public/bes-modules-v10.94.0.json','public/bes-feature-flags-v10.94.0.json',
 'public/bes-migrations-v10.94.0.json','public/bes-platform-build-v10.94.0.json','public/bes-platform-control-v10940.js',
];
for(const file of mustExist) if(!fs.existsSync(path.join(root,file))) failures.push(`Missing ${file}`);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!index.includes('bes-app-version" content="10.94.0"')) failures.push('Index version meta mismatch.');
if((index.match(/bes-platform-control-v10940\.js/g)||[]).length!==1) failures.push('V10.94 Platform Control runtime must appear once.');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(pkg.version!=='10.94.0') failures.push('package.json version mismatch.');
if(!pkg.scripts?.['verify:v10.94']) failures.push('verify:v10.94 missing.');
const main=fs.readFileSync(path.join(root,'src/main.jsx'),'utf8');
if(!main.includes('LearningIntelligence')) failures.push('Learning Intelligence route not bundled.');
const fonts=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','dist','.git','.bes-backup'].includes(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(/\.(ttf|otf|woff2?)$/i.test(entry.name))fonts.push(path.relative(root,full));}}
walk(root);
if(fonts.length) warnings.push(`Font files must be excluded from deliverable ZIP: ${fonts.join(', ')}`);
for(const message of failures) console.error(`FAIL  ${message}`);
for(const message of warnings) console.warn(`WARN  ${message}`);
if(!failures.length) console.log('V10.94 release guard passed.');
console.log(`Failures: ${failures.length} · Warnings: ${warnings.length}`);
if(failures.length) process.exit(1);
