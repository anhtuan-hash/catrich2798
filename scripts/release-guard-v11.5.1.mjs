import fs from 'node:fs';
import path from 'node:path';
const required=[
  'src/config/version.js','src/pages/GrammarBuilder.jsx','src/pages/GrammarBuilder.css','src/pages/ToolPage.jsx',
  'src/data/apps.js','src/utils/gemini.js','src/utils/aiProviders.js','src/utils/contentTransfer.js',
  'scripts/check-v11.5.1.mjs','scripts/sync-version-v11.5.1.mjs','scripts/performance-budget-v11.5.1.mjs',
  'public/version.json','public/release-manifest.json','.bes-release/v11.5.1.json',
];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed++;}else console.log(`✓ ${file}`);}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
if(pkg.version!=='11.5.1'||version.version!=='11.5.1'||release.version!=='11.5.1'||version.runtimeCore!=='2.5.1'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
const grammar=fs.readFileSync('src/pages/GrammarBuilder.jsx','utf8');
const css=fs.readFileSync('src/pages/GrammarBuilder.css','utf8');
for(const marker of ['V2.4','data-design="modern-saas"','gb-context-strip','gb-blueprint-visual','gb-ai-robot','Yêu cầu cụ thể khác']){if(!grammar.includes(marker)){console.error(`✗ missing source marker ${marker}`);failed++;}else console.log(`✓ source marker ${marker}`);}
for(const marker of ['V11.5.1 — Modern SaaS Workspace','Modern progress navigator','Two-column setup workbench','.gb-ai-task-grid button.active::after','.gb-context-metric']){if(!css.includes(marker)){console.error(`✗ missing CSS marker ${marker}`);failed++;}else console.log(`✓ CSS marker ${marker}`);}
const apiEntries=fs.readdirSync('api').filter((name)=>!name.startsWith('_')&&/\.(?:js|mjs|ts|py|go)$/i.test(name));
if(apiEntries.length>12){console.error(`✗ Vercel function count ${apiEntries.length}`);failed++;}else console.log(`✓ Vercel function count ${apiEntries.length}/12`);
const assetsDir='dist/assets';
if(!fs.existsSync(assetsDir)){console.error('✗ dist/assets missing');failed++;}else{
  const files=fs.readdirSync(assetsDir);
  const grammarJs=files.find((name)=>/^GrammarBuilder-.*\.js$/i.test(name));
  const grammarCss=files.find((name)=>/^GrammarBuilder-.*\.css$/i.test(name));
  if(!grammarJs||!grammarCss){console.error('✗ Grammar Builder production chunks missing');failed++;}else{
    console.log(`✓ Grammar Builder production JS ${grammarJs}`);console.log(`✓ Grammar Builder production CSS ${grammarCss}`);
    const built=fs.readFileSync(path.join(assetsDir,grammarJs),'utf8');
    for(const marker of ['Grammar Builder','Yêu cầu cụ thể khác','THPT exam grammar','Teacher Vault']){if(!built.includes(marker)){console.error(`✗ production marker missing ${marker}`);failed++;}else console.log(`✓ production marker ${marker}`);}
  }
}
if(failed)process.exit(1);console.log('V11.5.1 release guard passed.');
