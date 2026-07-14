import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const add = (label, condition) => checks.push({ label, condition: Boolean(condition) });
const main = read('src/main.jsx');
const department = read('src/pages/DepartmentWorkspace.jsx');
const shell = read('src/ui-core/components/UnifiedShellChrome.jsx');
const activity = read('src/ui-core/components/UIActivityCenter.jsx');
const css = read('src/ui-core/styles/department-detail-workspace-v1223.css');

add('V12.23 CSS is loaded after the V12.22 Department system', main.includes("department-color-system-v1222.css") && main.includes("department-detail-workspace-v1223.css") && main.indexOf('department-detail-workspace-v1223.css') > main.indexOf('department-color-system-v1222.css'));
add('Department detail panel carries active module context', department.includes('department-v1223-details-panel') && department.includes('data-active-module={activeTab}') && department.includes('department-v1223-module-content'));
add('Legacy 1180px Department rail is overridden', css.includes('.department-work-panel.panel') && css.includes('max-width:none!important') && css.includes('--dept23-gutter'));
add('Detail workspace uses fixed chrome and internal module scrolling', css.includes('display:flex!important') && css.includes('.department-v1223-module-content') && css.includes('overflow:auto!important') && css.includes('scrollbar-gutter:stable'));
add('Work schedule module uses unified compact card language', css.includes('.work-schedule-panel') && css.includes('.department-schedule-import-card') && css.includes('.work-schedule-form'));
add('Unified shell mounts the activity center event owner', shell.includes("import UIActivityCenter from './UIActivityCenter.jsx'") && shell.includes('externalTrigger'));
add('Activity Center supports an external StatusMenuBar trigger', activity.includes('externalTrigger = false') && activity.includes('{!externalTrigger ? ('));
add('Overlay z-index keeps notification/activity drawers above restored chrome', css.includes('.bui-activity-layer') && css.includes('2147483000'));

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? '✓' : '✗'} ${item.label}`);
if (failed.length) process.exit(1);
console.log(`All ${checks.length} V12.23.0 checks passed.`);
