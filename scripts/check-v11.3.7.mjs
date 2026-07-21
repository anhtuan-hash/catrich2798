import fs from 'node:fs';
let passed=0,failed=0;
const read=(p)=>fs.readFileSync(p,'utf8');
const pass=(name,ok)=>{if(ok){console.log(`✓ ${name}`);passed+=1;}else{console.error(`✗ ${name}`);failed+=1;}};
const pkg=JSON.parse(read('package.json'));
const home=read('src/pages/Home.jsx');
const apps=read('src/data/apps.js');
const profiles=read('src/data/designProfiles.js');
const css=read('src/styles/v1137.css');
const main=read('src/main.jsx');
pass('package version 11.3.7',pkg.version==='11.3.7');
pass('version registry 11.3.7',read('src/config/version.js').includes("APP_VERSION = '11.3.7'")&&read('src/config/version.js').includes("RUNTIME_CORE_VERSION = '2.3.7'"));
pass('new homepage stylesheet imported',main.includes("import './styles/v1137.css';"));
pass('approved home composition marker',home.includes('home-v1137')&&home.includes('home-motion-scene'));
pass('pointer parallax implemented',home.includes('handleScenePointerMove')&&home.includes("querySelectorAll('[data-depth]')"));
pass('animated app cards',css.includes('@keyframes home-card-drift')&&css.includes('animation: home-card-drift'));
pass('motion orbit and paths',home.includes('home-scene-orbit')&&home.includes('home-scene-path')&&css.includes('@keyframes home-orbit-breathe'));
pass('reduced-motion fallback',css.includes('prefers-reduced-motion')&&css.includes('html[data-motion="off"]'));
pass('responsive static grid',css.includes('@media (max-width: 900px)')&&css.includes('grid-template-columns: repeat(2')&&css.includes('animation: none !important'));
for (const slug of ['listening-lab','grammar-builder','writing-studio','pronunciation-coach']) {
  pass(`new app ${slug}`,apps.includes(`slug: '${slug}'`)&&profiles.includes(`'${slug}'`));
}
for (const slug of ['lesson-plan-ai','exam-studio','reading-studio','word2graph','worksheet-factory','textcare','speaking-studio','game-hub','listening-lab','grammar-builder','writing-studio','pronunciation-coach']) {
  pass(`home card ${slug}`,home.includes(`makeAppWindow('${slug}'`));
}
pass('Admin Hidden Apps retained',read('src/pages/WebApps.jsx').includes('HIDDEN_APPS_FOLDER'));
pass('Work Hub resource archive retained',read('src/pages/WorkHub.jsx').includes('Lưu vào Kho học liệu'));
pass('Notification sound retained',read('src/components/StatusMenuBar.jsx').includes('playNoticeTone'));
pass('Launcher Gallery retained',read('src/styles/v1136.css').includes('launcher-live-dock.is-water'));
pass('No SQL migration required',JSON.parse(read('public/version.json')).requiresSql===false);
pass('No internal npm registry',!read('package-lock.json').includes('applied-caas-gateway'));
console.log(`\nV11.3.7 Animated Home Check: ${passed}/${passed+failed} passed`);
if(failed) process.exit(1);
