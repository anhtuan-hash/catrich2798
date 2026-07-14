import fs from 'node:fs';
const checks = [
 ['version', fs.readFileSync('src/config/version.js','utf8').includes("12.2.0")],
 ['shell component', fs.existsSync('src/ui-core/shell/UnifiedShellChrome.jsx')],
 ['shell tokens', fs.readFileSync('src/ui-core/styles/shell.css','utf8').includes('[data-ui="navigation-items"]')],
 ['settings contract', fs.readFileSync('src/ui-core/styles/settings.css','utf8').includes('[data-ui="settings-page"]')],
 ['shell mounted', fs.readFileSync('src/main.jsx','utf8').includes('<UnifiedShellChrome')],
 ['legacy top chrome removed', !fs.readFileSync('src/main.jsx','utf8').includes('<div className="bes-top-chrome">')],
 ['settings native marker', fs.readFileSync('src/pages/Settings.jsx','utf8').includes('data-ui="settings-page"')],
 ['navigation semantic markers', fs.readFileSync('src/components/GlobalFlatNavigation.jsx','utf8').includes('data-ui="navigation-primary"')],
 ['ui index exports shell', fs.readFileSync('src/ui-core/index.js','utf8').includes('UnifiedShellChrome')],
 ['ui css imports shell', fs.readFileSync('src/ui-core/index.css','utf8').includes("styles/shell.css")],
];
let failed=0; for (const [name, ok] of checks) { console.log(`${ok?'✅':'❌'} ${name}`); if(!ok) failed++; }
if(failed) process.exit(1); console.log(`V12.2.0 native migration verification PASS (${checks.length}/${checks.length})`);
