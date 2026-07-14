import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const mustExist = [
  'index.html','package.json','package-lock.json','src/main.jsx','src/utils/supabase.js',
  'src/services/runtime/core.js','src/pages/WorkHub.jsx','src/pages/KnowledgeHub.jsx',
  'src/pages/AIWorkspace.jsx','src/pages/ContentFactory.jsx','src/pages/AssessmentCore.jsx',
  'src/styles/v1093.css','supabase/brian_v10_93_consolidated_migration.sql',
  'supabase/brian_v10_93_preflight.sql','supabase/brian_v10_93_verify.sql',
  'public/version.json','public/bes-release-v10.93.0.json','public/bes-modules-v10.93.0.json',
  'public/bes-feature-flags-v10.93.0.json','public/bes-platform-control-v10930.js',
];
for (const file of mustExist) if (!fs.existsSync(path.join(root,file))) failures.push(`Missing ${file}`);

const index = fs.readFileSync(path.join(root,'index.html'),'utf8');
const forbidden = ['bes-supabase-key-capture','bes-supabase-bridge','bes-unified-work-hub-v10900','bes-smart-knowledge-v10900'];
for (const token of forbidden) if (index.includes(token)) failures.push(`Legacy runtime still loaded: ${token}`);
if ((index.match(/bes-platform-control-v10930\.js/g)||[]).length !== 1) failures.push('Platform Control runtime must appear exactly once.');
if (!index.includes('bes-app-version" content="10.93.0"')) failures.push('Index version meta is not 10.93.0.');

const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if (pkg.version !== '10.93.0') failures.push('package.json version mismatch.');
if (!pkg.scripts?.['verify:v10.93']) failures.push('verify:v10.93 script missing.');

const fontFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if (['node_modules','dist','.git','.bes-backup'].includes(entry.name)) continue;
    const full=path.join(dir,entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ttf|otf|woff2?)$/i.test(entry.name)) fontFiles.push(path.relative(root,full));
  }
}
walk(root);
if (fontFiles.length) warnings.push(`Font files are present in working source and must be excluded from user-facing ZIP: ${fontFiles.join(', ')}`);

for (const message of failures) console.error(`FAIL  ${message}`);
for (const message of warnings) console.warn(`WARN  ${message}`);
if (!failures.length) console.log('V10.93 release guard passed.');
console.log(`Failures: ${failures.length} · Warnings: ${warnings.length}`);
if (failures.length) process.exit(1);
