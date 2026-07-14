import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
let passed=0,failed=0;
const read=(p)=>fs.readFileSync(p,'utf8');
const exists=(p)=>fs.existsSync(p);
const pass=(name,ok)=>{if(ok){console.log(`✓ ${name}`);passed+=1;}else{console.error(`✗ ${name}`);failed+=1;}};
const pkg=JSON.parse(read('package.json'));
const toolPage=read('src/pages/ToolPage.jsx');
const apps=read('src/data/apps.js');
const home=read('src/pages/Home.jsx');
const wrapper=read('src/pages/EnglishLessonIntegrationStudio.jsx');
const ai=read('api/ai.js');
const version=JSON.parse(read('public/version.json'));
const vendorDir='src/vendor/englishLessonIntegration';
const publicApiEntries=fs.readdirSync('api').filter(name=>!name.startsWith('_')&&/\.(?:js|mjs|ts|py|go)$/i.test(name));
pass('package version 11.4.4',pkg.version==='11.4.4');
pass('version registry 11.4.4',read('src/config/version.js').includes("APP_VERSION = '11.4.4'")&&version.version==='11.4.4');
pass('route registered in ToolPage',toolPage.includes("tool?.slug === 'english-lesson-integration'")&&toolPage.includes('EnglishLessonIntegrationStudio'));
pass('app registered in launcher',apps.includes("slug: 'english-lesson-integration'"));
pass('homepage shortcut retained',home.includes("makeAppWindow('english-lesson-integration'"));
pass('wrapper imports native bundled mount',wrapper.includes("../vendor/englishLessonIntegration/mount.js")&&wrapper.includes('mountEnglishLessonIntegrationStudio'));
pass('wrapper no longer imports external public bundle',!wrapper.includes('MODULE_URL')&&!wrapper.includes('@vite-ignore')&&!wrapper.includes('/bes-elis-v1142/elis.es.js'));
pass('native vendor mount exists',exists(`${vendorDir}/mount.js`)&&read(`${vendorDir}/mount.js`).includes('function TD'));
pass('native vendor lazy chunks exist',['index.js','pdf.js','exportDocx.js'].every(name=>exists(`${vendorDir}/${name}`)));
pass('vendor imports use local stable filenames',read(`${vendorDir}/mount.js`).includes('import("./index.js")')&&read(`${vendorDir}/mount.js`).includes('import("./pdf.js")')&&read(`${vendorDir}/mount.js`).includes('import("./exportDocx.js")'));
pass('vendor helper chunks point back to local mount',read(`${vendorDir}/index.js`).includes('from "./mount.js"')&&read(`${vendorDir}/exportDocx.js`).includes('from "./mount.js"'));
pass('native wrapper uses consolidated endpoint',wrapper.includes("endpoint: '/api/ai'")&&!wrapper.includes("endpoint: '/api/lesson-ai'"));
pass('lesson AI dispatcher remains inside api/ai',ai.includes('handleLessonAiRequest')&&ai.includes("['rewrite', 'generate-resource', 'health']"));
pass('old extra function remains removed',!exists('api/lesson-ai.mjs'));
pass('Hobby function count is 12 or fewer',publicApiEntries.length<=12);
pass('SQL migration retained',exists('supabase/brian_v11_4_2_lesson_integration.sql'));
pass('Animated Home V11.3.7 retained',home.includes('home-v1137')&&home.includes('home-motion-scene'));
pass('public npm registry only',!read('package-lock.json').includes('applied-caas-gateway'));
if(exists('dist/assets')){
  const files=fs.readdirSync('dist/assets');
  const wrapperFile=files.find(name=>name.startsWith('EnglishLessonIntegrationStudio-')&&name.endsWith('.js'));
  const mountFile=files.find(name=>name.startsWith('mount-')&&name.endsWith('.js'));
  pass('production wrapper emitted',Boolean(wrapperFile));
  pass('production native mount emitted',Boolean(mountFile));
  if(wrapperFile){
    const built=read(path.join('dist/assets',wrapperFile));
    pass('production wrapper has no public-module URL',!built.includes('/bes-elis-v1142/elis.es.js')&&!built.includes('MODULE_URL'));
  }
  if(mountFile){
    try{
      const mod=await import(pathToFileURL(path.resolve('dist/assets',mountFile)).href+`?v=${Date.now()}`);
      pass('production mount export is callable',typeof mod.i==='function');
    }catch(error){console.error(error);pass('production mount export is callable',false);}
  }
}
console.log(`\nV11.4.4 Native Runtime Check: ${passed}/${passed+failed} passed`);
console.log(`Deployable API entries: ${publicApiEntries.length}`);
if(failed) process.exit(1);
