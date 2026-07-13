import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const failures=[]; const warnings=[];
const mustExist=[
'index.html','package.json','package-lock.json','src/main.jsx','src/pages/AutomationCenter.jsx','src/utils/automationEngine.js','src/styles/v1096.css',
'supabase/brian_v10_96_preflight.sql','supabase/brian_v10_96_automation_center.sql','supabase/brian_v10_96_verify.sql',
'public/version.json','public/bes-release-v10.96.0.json','public/bes-modules-v10.96.0.json','public/bes-feature-flags-v10.96.0.json',
'public/bes-migrations-v10.96.0.json','public/bes-platform-build-v10.96.0.json','public/bes-platform-control-v10960.js','public/bes-platform-control-v10960.css'
];
for(const file of mustExist) if(!fs.existsSync(path.join(root,file))) failures.push(`Missing ${file}`);
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(pkg.version!=='10.96.0') failures.push('package.json version mismatch.');
if(!pkg.scripts?.['verify:v10.96']) failures.push('verify:v10.96 missing.');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!index.includes('bes-app-version" content="10.96.0"')) failures.push('Index version meta mismatch.');
if((index.match(/bes-platform-control-v10960\.js/g)||[]).length!==1) failures.push('V10.96 platform runtime must appear once.');
const sql=fs.readFileSync(path.join(root,'supabase/brian_v10_96_automation_center.sql'),'utf8');
for(const table of ['automation_rules','automation_runs','automation_events']) if(!sql.includes(`public.${table}`)) failures.push(`Migration missing ${table}.`);
if(!/enable row level security/i.test(sql)) failures.push('Automation tables must enable RLS.');
if(!sql.includes('bes_v1096_is_leader')) failures.push('Leader compatibility function missing.');
const engine=fs.readFileSync(path.join(root,'src/utils/automationEngine.js'),'utf8');
if(/service_role|service-role|access_token\s*:/i.test(engine)) failures.push('Automation engine must not embed privileged credentials.');
const fonts=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','dist','.git','.bes-backup'].includes(e.name))continue;const full=path.join(dir,e.name);if(e.isDirectory())walk(full);else if(/\.(ttf|otf|woff2?)$/i.test(e.name))fonts.push(path.relative(root,full));}}
walk(root); if(fonts.length) warnings.push(`Font files must be excluded from deliverable ZIP: ${fonts.join(', ')}`);
for(const m of failures) console.error(`FAIL  ${m}`); for(const m of warnings) console.warn(`WARN  ${m}`);
if(!failures.length) console.log('V10.96 release guard passed.');
console.log(`Failures: ${failures.length} · Warnings: ${warnings.length}`);
if(failures.length) process.exit(1);
