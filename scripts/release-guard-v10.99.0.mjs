import fs from 'node:fs';
import path from 'node:path';
const required=['src/config/version.js','src/utils/roles.js','src/utils/safeSpreadsheet.js','src/components/UnifiedUtilityRail.jsx','src/pages/ProductionHardening.jsx','src/styles/v1099.css','src/styles/legacy/01-foundation.css','api/_security.js','supabase/brian_v10_99_preflight.sql','supabase/brian_v10_99_production_hardening.sql','supabase/brian_v10_99_verify.sql','public/version.json','public/release-manifest.json','playwright.config.js'];
let failed=0;
for(const file of required){const ok=fs.existsSync(file);console.log(`${ok?'✓':'✗'} ${file}`);if(!ok)failed++;}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
const index=fs.readFileSync('index.html','utf8');
if(pkg.version!=='10.99.0'||version.version!=='10.99.0'||version.runtimeCore!=='1.6.0'||!index.includes('content="10.99.0"')){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
if(pkg.dependencies?.xlsx||!pkg.dependencies?.['read-excel-file']){console.error('✗ spreadsheet dependency hardening incomplete');failed++;}else console.log('✓ spreadsheet dependency hardened');
for(const legacy of ['bes-command-center-v10871','bes-ai-chat-v10881','bes-ai-launcher-slot-v10882','bes-platform-control-v10980']){if(index.includes(legacy)){console.error(`✗ legacy tag remains: ${legacy}`);failed++;}}
const forbidden=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','dist','.git','.bes-backup','archive','test-results','playwright-report'].includes(entry.name))continue;const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(/\.(ttf|otf|woff2?)$/i.test(entry.name))forbidden.push(p);}}
walk('.');
if(forbidden.length){console.error('✗ distributable font files detected',forbidden);failed++;}else console.log('✓ no distributable font files added');
const publicLegacy=fs.readdirSync('public').filter((name)=>/^bes-(ai-chat|ai-launcher|command-center|platform-control|release-v10\.|feature-flags-v10\.|modules-v10\.|migrations-v10\.|platform-build-v10\.|stability-guard)/.test(name));
if(publicLegacy.length){console.error('✗ legacy public assets remain',publicLegacy);failed++;}else console.log('✓ legacy public assets removed');
if(Object.keys(pkg.scripts||{}).length>20){console.error('✗ legacy package scripts remain');failed++;}else console.log('✓ package scripts consolidated');
if(failed)process.exit(1);
console.log('V10.99 release guard passed.');
