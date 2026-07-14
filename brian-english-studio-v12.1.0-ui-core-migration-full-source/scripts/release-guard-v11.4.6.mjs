import fs from 'node:fs';
import path from 'node:path';
const required=['src/config/version.js','src/main.jsx','src/pages/Home.jsx','src/pages/ToolPage.jsx','src/pages/EnglishLessonIntegrationStudio.jsx','src/data/apps.js','src/index.css','src/vendor/englishLessonIntegration/elis.es.js','api/ai.js','server/lessonAiHandler.js','supabase/brian_v11_4_2_lesson_integration.sql','scripts/check-v11.4.6.mjs','scripts/sync-version-v11.4.6.mjs','scripts/performance-budget-v11.4.6.mjs','public/version.json','public/release-manifest.json'];
let failed=0;
for(const f of required){if(!fs.existsSync(f)){console.error(`✗ missing ${f}`);failed++;}else console.log(`✓ ${f}`);}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
if(pkg.version!=='11.4.6'||version.version!=='11.4.6'||version.runtimeCore!=='2.4.6'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
const wrapper=fs.readFileSync('src/pages/EnglishLessonIntegrationStudio.jsx','utf8');
for(const marker of ['getActiveAiConfig','buildNativeLessonPrompt','request: nativeAiConfigured','callAI({','bes-ai-settings-updated']){if(!wrapper.includes(marker)){console.error(`✗ missing native AI marker ${marker}`);failed++;}else console.log(`✓ native AI marker ${marker}`);}
const chunkDir='src/vendor/englishLessonIntegration/chunks';
const chunks=fs.existsSync(chunkDir)?fs.readdirSync(chunkDir).filter(n=>n.endsWith('.js')):[];
if(chunks.length!==4){console.error(`✗ expected 4 module chunks, got ${chunks.length}`);failed++;}else console.log('✓ native module chunks complete');
const source=chunks.map(n=>fs.readFileSync(path.join(chunkDir,n),'utf8')).join('\n');
for(const marker of ['AI thật đang bật','AI Gateway của Brian','native-host','review-pane','min-height:154px']){if(!source.includes(marker)){console.error(`✗ missing module marker ${marker}`);failed++;}else console.log(`✓ module marker ${marker}`);}
const apiEntries=fs.readdirSync('api').filter(n=>!n.startsWith('_')&&/\.(?:js|mjs|ts|py|go)$/i.test(n));
if(apiEntries.length>12){console.error(`✗ Vercel function count ${apiEntries.length}`);failed++;}else console.log(`✓ Vercel function count ${apiEntries.length}/12`);
if(fs.existsSync('api/lesson-ai.mjs')){console.error('✗ obsolete api/lesson-ai.mjs');failed++;}
const built=fs.existsSync('dist/assets')?fs.readdirSync('dist/assets').filter(n=>n.endsWith('.js')).map(n=>fs.readFileSync(path.join('dist/assets',n),'utf8')).join('\n'):'';
for (const marker of ['AI thật đang bật','AI Gateway của Brian','Brian AI Copilot']) {
  if (!built.includes(marker)) { console.error(`✗ production native AI marker missing: ${marker}`); failed++; }
  else console.log(`✓ production native AI marker ${marker}`);
}
if(failed)process.exit(1);
console.log('V11.4.6 release guard passed.');
