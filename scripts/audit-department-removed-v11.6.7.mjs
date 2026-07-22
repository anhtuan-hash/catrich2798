#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const checks = [];
const pass = (name, condition, detail = '') => {
  checks.push(name);
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};
const read = (relative) => {
  const file = path.join(root, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
};

const removedPaths = [
  'src/pages/DepartmentWorkspace.jsx',
  'src/pages/DepartmentWorkspaceModernFields.css',
  'src/pages/DepartmentWorkspaceV2.css',
  'src/pages/department',
  'src/data/department.js',
  'src/utils/departmentStore.js',
  'scripts/department-runtime-test.mjs',
];
for (const relative of removedPaths) {
  pass(`Removed ${relative}`, !fs.existsSync(path.join(root, relative)));
}

const activeFiles = [
  'src/main.jsx',
  'src/data/apps.js',
  'src/data/designProfiles.js',
  'src/pages/WebApps.jsx',
  'src/pages/WorkDashboard.jsx',
  'src/utils/dashboardAggregator.js',
  'src/utils/permissions.js',
  'src/components/GlobalFlatNavigation.jsx',
  'src/components/GlobalCommandPalette.jsx',
  'src/components/Navbar.jsx',
  'src/components/StatusMenuBar.jsx',
  'src/components/WindowsPhoneIndicator.jsx',
  'vite.config.js',
  'supabase/schema.sql',
];
const forbidden = [
  'DepartmentWorkspace',
  'departmentStore',
  'department-workspace',
  '#/department',
  "currentRoute === 'department'",
  "route: 'department'",
  'department_workspace_snapshots',
  'department_submission_requests',
  'department_submissions',
  'department-evidence',
];
for (const relative of activeFiles) {
  const text = read(relative);
  pass(`Critical file exists: ${relative}`, Boolean(text));
  for (const token of forbidden) {
    pass(`No ${token} in ${relative}`, !text.includes(token));
  }
}

const main = read('src/main.jsx');
pass('Department route removed from route registry', !/['"]department['"]/.test(main));
const apps = read('src/data/apps.js');
pass('Department launcher app removed', !apps.includes('DEPARTMENT_APP'));
const dashboard = read('src/pages/WorkDashboard.jsx');
const aggregator = read('src/utils/dashboardAggregator.js');
pass('Dashboard retains Work Hub integration', dashboard.includes('#/work-hub') && aggregator.includes('loadWorkHub'));
pass('Dashboard retains Resource Library integration', dashboard.includes('#/resource-library') && aggregator.includes('loadResources'));
pass('Dashboard retains Homeroom integration', dashboard.includes('#/homeroom') && aggregator.includes('loadHomeroom'));
pass('Dashboard uses generic work health', aggregator.includes('workHealth') && !aggregator.includes('departmentHealth'));

const index = read('index.html');
pass('Obsolete personal font URL removed', !index.includes('/fonts/personal-font.ttf'));
pass('Deployed personal font remains active', index.includes('/bes-fonts/brian-personal-font.ttf') && index.includes('/bes-fonts/brian-font.css'));
pass('Boot watchdog only runs when root is empty', index.includes('root.childElementCount > 0') && index.includes('root.textContent.trim().length > 0'));
pass('Boot watchdog no longer depends on app-shell', !index.includes("root.querySelector('.app-shell"));
pass('Recovery screen has a stable marker class', index.includes('class="bes-crash-recovery"'));

const serviceWorker = read('public/sw.js');
pass('Service Worker cache version matches app', serviceWorker.includes("const VERSION = '11.6.7'"));
pass('Legacy Service Worker cache version removed', !serviceWorker.includes("const VERSION = '11.3.2'"));

const launcher = read('src/utils/launcherPreferences.js');
pass('Launcher realtime uses unique channel topics', launcher.includes('nextLauncherRealtimeTopic()'));
pass('Legacy fixed launcher realtime topic removed', !launcher.includes(".channel('bes-launcher-settings-v1085')"));
pass('Launcher realtime cleanup ignores stale callbacks', launcher.includes('let active = true') && launcher.includes('active = false'));

for (const [name, ok] of checks.map((name) => [name, !failures.some((item) => item.startsWith(name))])) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
}
if (failures.length) {
  console.error(`\nDepartment app removal audit FAILED (${checks.length - failures.length}/${checks.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`\nDepartment app removal audit PASS (${checks.length}/${checks.length})`);
