import fs from 'node:fs';
const settings=fs.readFileSync('src/pages/Settings.jsx','utf8');
const prefs=fs.readFileSync('src/ui-core/runtime/uiPreferences.js','utf8');
const main=fs.readFileSync('src/main.jsx','utf8');
const css=fs.readFileSync('src/ui-core/styles/settings-experience-v1225.css','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const checks=[
 ['version',pkg.version==='12.25.0'],
 ['stylesheet import',main.includes('settings-experience-v1225.css')],
 ['provider command center',settings.includes('AI Provider Command Center')&&settings.includes('activateProvider')],
 ['provider search filters',settings.includes('providerSearch')&&settings.includes('providerFilter')&&settings.includes('visibleProviders')],
 ['one click default',settings.includes('Dùng mặc định')&&settings.includes('Lưu & dùng mặc định')],
 ['appearance studio',settings.includes('Appearance Studio')&&settings.includes('settings-v125-live-preview')],
 ['advanced visual prefs',['surfaceStyle','cornerStyle','shadowStyle','backgroundStyle','motionStyle'].every((x)=>prefs.includes(x)&&main.includes(x)&&settings.includes(x))],
 ['global adapters',css.includes("data-surface-style='glass'")&&css.includes("data-motion-style='tile'")&&css.includes("data-background-style='mesh'")],
 ['responsive',css.includes('@media(max-width:760px)')],
];
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`);
if(failed.length) process.exit(1);
console.log(`All ${checks.length} V12.25.0 checks passed.`);
