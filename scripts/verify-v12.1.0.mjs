import fs from 'node:fs';
const checks = [
 ['unified shell component', 'src/ui-core/components/UnifiedShellChrome.jsx'],
 ['ui core stylesheet', 'src/ui-core/styles/ui-core.css'],
 ['settings page', 'src/pages/Settings.jsx'],
];
for (const [label,file] of checks) { if (!fs.existsSync(file)) throw new Error(`Missing ${label}: ${file}`); }
const main=fs.readFileSync('src/main.jsx','utf8');
const shell=fs.readFileSync('src/ui-core/components/UnifiedShellChrome.jsx','utf8');
const settings=fs.readFileSync('src/pages/Settings.jsx','utf8');
const css=fs.readFileSync('src/ui-core/styles/ui-core.css','utf8');
const assertions=[
 ['main mounts unified shell', main.includes('<UnifiedShellChrome')],
 ['old top chrome removed from main', !main.includes('className=\"bes-top-chrome\"')],
 ['shell owns status navigation workspace', shell.includes('StatusMenuBar') && shell.includes('GlobalFlatNavigation') && shell.includes('WorkspaceTabs')],
 ['settings semantic page contract', settings.includes('data-ui=\"settings-page\"')],
 ['settings semantic grid contract', settings.includes('data-ui=\"settings-grid\"')],
 ['shell token styling', css.includes('.bui-shell-chrome')],
 ['settings 12-column grid', css.includes('grid-template-columns: repeat(12')],
 ['responsive settings', css.includes('@media (max-width: 980px)')],
];
let passed=0; for (const [label,ok] of assertions) { if(!ok) throw new Error(`FAIL: ${label}`); console.log(`✓ ${label}`); passed++; }
console.log(`V12.1.0 native shell/settings verification PASS (${passed}/${assertions.length})`);
