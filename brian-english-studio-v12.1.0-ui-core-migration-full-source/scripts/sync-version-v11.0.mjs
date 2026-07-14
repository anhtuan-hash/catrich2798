import fs from 'node:fs';
const VERSION='11.0.0';
const RELEASE='Connected Teaching Suite';
const RUNTIME='2.0.0';
const generatedAt=new Date().toISOString();
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(pkg.version!==VERSION){pkg.version=VERSION;fs.writeFileSync('package.json',`${JSON.stringify(pkg,null,2)}\n`);}
fs.writeFileSync('public/version.json',`${JSON.stringify({version:VERSION,channel:'stable',releaseName:RELEASE,runtimeCore:RUNTIME,schemaVersion:VERSION,requiresSql:true,requiredMigration:'brian_v11_0_connected_teaching_suite.sql',legacyDomPatches:false,generatedAt},null,2)}\n`);
fs.writeFileSync('public/release-manifest.json',`${JSON.stringify({version:VERSION,release:RELEASE,runtime:RUNTIME,schema:VERSION,connectedTeachingSuite:true,lessonPack:true,generatedAt},null,2)}\n`);
let html=fs.readFileSync('index.html','utf8');
html=html.replace(/<meta name="bes-app-version" content="[^"]*">/,`<meta name="bes-app-version" content="${VERSION}">`);
fs.writeFileSync('index.html',html);
if(fs.existsSync('public/sw.js')){let sw=fs.readFileSync('public/sw.js','utf8');sw=sw.replace(/const VERSION = '[^']+';/,`const VERSION = '${VERSION}';`);fs.writeFileSync('public/sw.js',sw);}
console.log(`Version registry synchronized: ${VERSION}`);
