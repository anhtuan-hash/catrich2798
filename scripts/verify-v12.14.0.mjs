import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['V11 navigation component is used', read('src/ui-core/components/UnifiedShellChrome.jsx').includes('GlobalFlatNavigation')],
  ['V11 top chrome class restored', read('src/ui-core/components/UnifiedShellChrome.jsx').includes('bes-top-chrome bes-v11-navigation-restored')],
  ['Status menu remains present', read('src/ui-core/components/UnifiedShellChrome.jsx').includes('<StatusMenuBar')],
  ['Workspace tabs are independent', read('src/ui-core/components/UnifiedShellChrome.jsx').includes('<WorkspaceTabs')],
  ['Workspace navigation replacement removed', !read('src/ui-core/components/UnifiedShellChrome.jsx').includes('UIWorkspaceNavigation')],
  ['Restoration CSS imported', read('src/main.jsx').includes('v11-navigation-restoration.css')],
  ['V12 UI Core remains enabled', read('src/main.jsx').includes('data-ui-core="v12"')],
  ['Command Center remains enabled', read('src/main.jsx').includes('<UICommandCenter')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`V12.14.0 V11 Navigation Restoration verification PASS (${checks.length}/${checks.length})`);
