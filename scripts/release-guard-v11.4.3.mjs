import fs from 'node:fs';
const required=[
 'src/config/version.js','src/main.jsx','src/pages/Home.jsx','src/pages/ToolPage.jsx','src/pages/EnglishLessonIntegrationStudio.jsx',
 'src/data/apps.js','src/data/designProfiles.js','src/components/LessonIntegrationBridgeAdapter.jsx',
 'public/bes-elis-v1142/elis.es.js','public/bes-elis-v1142/bridge-runtime.js',
 'public/bes-elis-v1142/chunks/mount-CCtnxx76.js','public/bes-elis-v1142/chunks/exportDocx-D0oUwC7A.js',
 'api/ai.js','server/lessonAiHandler.js','supabase/brian_v11_4_2_preflight.sql','supabase/brian_v11_4_2_lesson_integration.sql','supabase/brian_v11_4_2_verify.sql',
 'scripts/check-v11.4.3.mjs','scripts/sync-version-v11.4.3.mjs','scripts/performance-budget-v11.4.3.mjs',
 'public/version.json','public/release-manifest.json'
];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed++;}else console.log(`✓ ${file}`);}
if(fs.existsSync('api/lesson-ai.mjs')){console.error('✗ obsolete api/lesson-ai.mjs still exists');failed++;}
const apiEntries=fs.readdirSync('api').filter(name=>!name.startsWith('_')&&/\.(?:js|mjs|ts|py|go)$/i.test(name));
if(apiEntries.length>12){console.error(`✗ Vercel Hobby function count ${apiEntries.length} exceeds 12`);failed++;}else console.log(`✓ Vercel Hobby function count ${apiEntries.length}/12`);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
if(pkg.version!=='11.4.3'||version.version!=='11.4.3'||version.runtimeCore!=='2.4.3'||version.schemaVersion!=='11.4.2'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
if(!version.requiresSql||version.requiredMigration!=='supabase/brian_v11_4_2_lesson_integration.sql'){console.error('✗ required migration registry mismatch');failed++;}else console.log('✓ required SQL migration registered');
const lock=fs.readFileSync('package-lock.json','utf8');
if(lock.includes('applied-caas-gateway')){console.error('✗ internal registry found');failed++;}else console.log('✓ public npm registry only');
if(failed)process.exit(1);console.log('V11.4.3 release guard passed.');
