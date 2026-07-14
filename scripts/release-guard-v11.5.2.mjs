import fs from 'node:fs';
import path from 'node:path';
const required=['src/config/version.js','src/pages/WritingStudio.jsx','src/pages/WritingStudio.css','src/pages/ToolPage.jsx','src/data/apps.js','src/utils/gemini.js','src/utils/contentTransfer.js','scripts/check-v11.5.2.mjs','scripts/sync-version-v11.5.2.mjs','scripts/performance-budget-v11.5.2.mjs','public/version.json','public/release-manifest.json','.bes-release/v11.5.2.json'];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed++;}else console.log(`✓ ${file}`);}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
if(pkg.version!=='11.5.2'||version.version!=='11.5.2'||release.version!=='11.5.2'||version.runtimeCore!=='2.5.2'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
const source=fs.readFileSync('src/pages/WritingStudio.jsx','utf8');
const css=fs.readFileSync('src/pages/WritingStudio.css','utf8');
for(const marker of ['WRITING STUDIO · V2.0','PLANNING & LANGUAGE STUDIO','DRAFT EDITOR & QUALITY REVIEW','bes-writing-pack/1.0','TEACHER VAULT · WRITING PORTFOLIO']){if(!source.includes(marker)){console.error(`✗ missing source marker ${marker}`);failed++;}else console.log(`✓ source marker ${marker}`);}
for(const marker of ['V11.5.2 — Writing Studio Process Writing Workbench','.ws-product-bar','.ws-context-strip','.ws-editor-layout','.ws-publish-grid']){if(!css.includes(marker)){console.error(`✗ missing CSS marker ${marker}`);failed++;}else console.log(`✓ CSS marker ${marker}`);}
const apiEntries=fs.readdirSync('api').filter((name)=>!name.startsWith('_')&&/\.(?:js|mjs|ts|py|go)$/i.test(name));
if(apiEntries.length>12){console.error(`✗ Vercel function count ${apiEntries.length}`);failed++;}else console.log(`✓ Vercel function count ${apiEntries.length}/12`);
const assetsDir='dist/assets';
if(!fs.existsSync(assetsDir)){console.error('✗ dist/assets missing');failed++;}else{
  const files=fs.readdirSync(assetsDir);const js=files.find(name=>/^WritingStudio-.*\.js$/i.test(name));const cssFile=files.find(name=>/^WritingStudio-.*\.css$/i.test(name));
  if(!js||!cssFile){console.error('✗ Writing Studio production chunks missing');failed++;}else{console.log(`✓ Writing Studio JS ${js}`);console.log(`✓ Writing Studio CSS ${cssFile}`);const built=fs.readFileSync(path.join(assetsDir,js),'utf8');for(const marker of ['Writing Studio','Guided Writing','Teacher Vault','Connected Workflow']){if(!built.includes(marker)){console.error(`✗ production marker missing ${marker}`);failed++;}else console.log(`✓ production marker ${marker}`);}}
}
if(failed)process.exit(1);console.log('V11.5.2 release guard passed.');
