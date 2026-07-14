import fs from 'node:fs';
import path from 'node:path';
const required=[
 'src/config/version.js','src/main.jsx','src/pages/Home.jsx','src/pages/ToolPage.jsx','src/pages/EnglishLessonIntegrationStudio.jsx',
 'src/data/apps.js','src/data/designProfiles.js','src/components/LessonIntegrationBridgeAdapter.jsx','src/index.css',
 'src/vendor/englishLessonIntegration/elis.es.js','api/ai.js','server/lessonAiHandler.js',
 'supabase/brian_v11_4_2_preflight.sql','supabase/brian_v11_4_2_lesson_integration.sql','supabase/brian_v11_4_2_verify.sql',
 'scripts/check-v11.4.5.mjs','scripts/sync-version-v11.4.5.mjs','scripts/performance-budget-v11.4.5.mjs',
 'public/version.json','public/release-manifest.json'
];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed++;}else console.log(`✓ ${file}`);}
if(fs.existsSync('api/lesson-ai.mjs')){console.error('✗ obsolete api/lesson-ai.mjs still exists');failed++;}
const apiEntries=fs.readdirSync('api').filter(name=>!name.startsWith('_')&&/\.(?:js|mjs|ts|py|go)$/i.test(name));
if(apiEntries.length>12){console.error(`✗ Vercel Hobby function count ${apiEntries.length} exceeds 12`);failed++;}else console.log(`✓ Vercel Hobby function count ${apiEntries.length}/12`);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
if(pkg.version!=='11.4.5'||version.version!=='11.4.5'||version.runtimeCore!=='2.4.5'||version.schemaVersion!=='11.4.2'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
if(!version.lessonIntegrationNativeBundle||version.lessonIntegrationExternalBundle!==false||!version.lessonIntegrationAICopilot){console.error('✗ lesson integration registry mismatch');failed++;}else console.log('✓ native module and AI Copilot registry enabled');
const wrapper=fs.readFileSync('src/pages/EnglishLessonIntegrationStudio.jsx','utf8');
if(!wrapper.includes('../vendor/englishLessonIntegration/elis.es.js')||wrapper.includes('/bes-elis-v1142/elis.es.js')||wrapper.includes('@vite-ignore')){console.error('✗ native module entry mismatch');failed++;}else console.log('✓ native stable module entry enabled');
const chunksDir='src/vendor/englishLessonIntegration/chunks';
const chunks=fs.existsSync(chunksDir)?fs.readdirSync(chunksDir).filter(name=>name.endsWith('.js')):[];
if(chunks.length!==4){console.error(`✗ expected 4 native module chunks, got ${chunks.length}`);failed++;}else console.log('✓ native module chunks complete');
const source=chunks.map(name=>fs.readFileSync(path.join(chunksDir,name),'utf8')).join('\n');
for(const marker of ['AI Copilot cho giáo án','workspace-view-controls','workspace-large-display','lesson-assistant']){
  if(!source.includes(marker)){console.error(`✗ missing module marker ${marker}`);failed++;}else console.log(`✓ module marker ${marker}`);
}
const handler=fs.readFileSync('server/lessonAiHandler.js','utf8');
const api=fs.readFileSync('api/ai.js','utf8');
if(!handler.includes('assistantPrompt')||!handler.includes("'lesson-assistant'")||!api.includes("'lesson-assistant'")){console.error('✗ AI Copilot server route missing');failed++;}else console.log('✓ AI Copilot server route enabled');
const files=fs.existsSync('dist/assets')?fs.readdirSync('dist/assets'):[];
const built=files.filter(name=>name.endsWith('.js')).map(name=>fs.readFileSync(path.join('dist/assets',name),'utf8')).join('\n');
if(!built.includes('AI Copilot cho giáo án')||!built.includes('lesson-assistant')){console.error('✗ production AI Copilot bundle missing');failed++;}else console.log('✓ production AI Copilot bundle present');
if(built.includes('/bes-elis-v1142/elis.es.js')){console.error('✗ production bundle references old external module');failed++;}else console.log('✓ production bundle has no old external module URL');
if(!version.requiresSql||version.requiredMigration!=='supabase/brian_v11_4_2_lesson_integration.sql'){console.error('✗ required migration registry mismatch');failed++;}else console.log('✓ required SQL migration registered');
const lock=fs.readFileSync('package-lock.json','utf8');
if(lock.includes('applied-caas-gateway')){console.error('✗ internal registry found');failed++;}else console.log('✓ public npm registry only');
if(failed)process.exit(1);console.log('V11.4.5 release guard passed.');
