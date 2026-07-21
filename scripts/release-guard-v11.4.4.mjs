import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const required=[
 'src/config/version.js','src/main.jsx','src/pages/Home.jsx','src/pages/ToolPage.jsx','src/pages/EnglishLessonIntegrationStudio.jsx',
 'src/data/apps.js','src/data/designProfiles.js','src/components/LessonIntegrationBridgeAdapter.jsx',
 'src/vendor/englishLessonIntegration/mount.js','src/vendor/englishLessonIntegration/index.js',
 'src/vendor/englishLessonIntegration/pdf.js','src/vendor/englishLessonIntegration/exportDocx.js',
 'api/ai.js','server/lessonAiHandler.js','supabase/brian_v11_4_2_preflight.sql','supabase/brian_v11_4_2_lesson_integration.sql','supabase/brian_v11_4_2_verify.sql',
 'scripts/check-v11.4.4.mjs','scripts/sync-version-v11.4.4.mjs','scripts/performance-budget-v11.4.4.mjs',
 'public/version.json','public/release-manifest.json'
];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed++;}else console.log(`✓ ${file}`);}
if(fs.existsSync('api/lesson-ai.mjs')){console.error('✗ obsolete api/lesson-ai.mjs still exists');failed++;}
const apiEntries=fs.readdirSync('api').filter(name=>!name.startsWith('_')&&/\.(?:js|mjs|ts|py|go)$/i.test(name));
if(apiEntries.length>12){console.error(`✗ Vercel Hobby function count ${apiEntries.length} exceeds 12`);failed++;}else console.log(`✓ Vercel Hobby function count ${apiEntries.length}/12`);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
if(pkg.version!=='11.4.4'||version.version!=='11.4.4'||version.runtimeCore!=='2.4.4'||version.schemaVersion!=='11.4.2'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
if(!version.lessonIntegrationNativeBundle||version.lessonIntegrationExternalBundle!==false){console.error('✗ native module registry mismatch');failed++;}else console.log('✓ native module registry enabled');
const wrapper=fs.readFileSync('src/pages/EnglishLessonIntegrationStudio.jsx','utf8');
if(wrapper.includes('/bes-elis-v1142/elis.es.js')||wrapper.includes('@vite-ignore')||wrapper.includes('MODULE_URL')){console.error('✗ external runtime loader still present');failed++;}else console.log('✓ external runtime loader removed');
const files=fs.existsSync('dist/assets')?fs.readdirSync('dist/assets'):[];
const wrapperFile=files.find(name=>name.startsWith('EnglishLessonIntegrationStudio-')&&name.endsWith('.js'));
const mountFile=files.find(name=>name.startsWith('mount-')&&name.endsWith('.js'));
if(!wrapperFile||!mountFile){console.error('✗ production native chunks missing');failed++;}
else{
  const built=fs.readFileSync(path.join('dist/assets',wrapperFile),'utf8');
  if(built.includes('/bes-elis-v1142/elis.es.js')){console.error('✗ production wrapper still references public bundle');failed++;}else console.log('✓ production wrapper uses native chunk');
  try{const mod=await import(pathToFileURL(path.resolve('dist/assets',mountFile)).href+`?guard=${Date.now()}`);if(typeof mod.i!=='function')throw new Error('mount export is not a function');console.log('✓ production mount export callable');}catch(error){console.error(`✗ production mount import failed: ${error.message}`);failed++;}
}
if(!version.requiresSql||version.requiredMigration!=='supabase/brian_v11_4_2_lesson_integration.sql'){console.error('✗ required migration registry mismatch');failed++;}else console.log('✓ required SQL migration registered');
const lock=fs.readFileSync('package-lock.json','utf8');
if(lock.includes('applied-caas-gateway')){console.error('✗ internal registry found');failed++;}else console.log('✓ public npm registry only');
if(failed)process.exit(1);console.log('V11.4.4 release guard passed.');
