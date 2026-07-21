import fs from 'node:fs';
const paths=['public/version.json','public/release-manifest.json'];
for (const path of paths){if(!fs.existsSync(path)) continue; const data=JSON.parse(fs.readFileSync(path,'utf8')); Object.assign(data,{version:'12.39.1',appVersion:'12.39.1',release:'OpenRouter Only Hard Cleanup',releaseName:'OpenRouter Only Hard Cleanup',runtime:'8.0.1',runtimeCore:'8.0.1',schema:'12.39.1',schemaVersion:'12.39.1',openRouterOnly:true,legacyProviderUiRemoved:true,providerCount:1,generatedAt:new Date().toISOString()}); fs.writeFileSync(path,JSON.stringify(data,null,2)+'\n');}
console.log('Synced V12.39.1 manifests.');
