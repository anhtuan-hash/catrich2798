import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const resolve = (file) => path.join(root, file);

function exists(file) {
  return fs.existsSync(resolve(file));
}

function read(file) {
  return fs.readFileSync(resolve(file), 'utf8');
}

function write(file, content) {
  fs.writeFileSync(resolve(file), content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

function replaceRequired(file, search, replacement, label = search) {
  const current = read(file);
  if (!current.includes(search)) {
    throw new Error(`[remove-department] Missing expected text in ${file}: ${label}`);
  }
  write(file, current.replace(search, replacement));
}

function replaceAll(file, search, replacement) {
  const current = read(file);
  write(file, current.split(search).join(replacement));
}

function replaceRegexRequired(file, pattern, replacement, label = String(pattern)) {
  const current = read(file);
  if (!pattern.test(current)) {
    throw new Error(`[remove-department] Missing expected pattern in ${file}: ${label}`);
  }
  pattern.lastIndex = 0;
  write(file, current.replace(pattern, replacement));
}

function removePath(file) {
  const target = resolve(file);
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

// 1. Delete every UI, component, stylesheet, data adapter and test that belongs
// to the previous Department Workspace implementations.
const explicitRemovals = [
  'src/data/department.js',
  'src/utils/departmentStore.js',
  'scripts/department-runtime-test.mjs',
  'src/pages/department',
  'src/pages/department-approved',
  'src/pages/DepartmentWorkspace.jsx',
  'src/pages/DepartmentWorkspace.css',
  'src/pages/DepartmentWorkspaceV2.css',
  'src/pages/DepartmentWorkspaceModernFields.css',
  'src/pages/DepartmentWorkspaceFluent.css',
  'src/pages/DepartmentWorkspaceFluentPolish.css',
  'src/pages/DepartmentWorkCenterFluent.jsx',
];
explicitRemovals.forEach(removePath);

const pagesDir = resolve('src/pages');
if (fs.existsSync(pagesDir)) {
  for (const entry of fs.readdirSync(pagesDir)) {
    if (/^Department/i.test(entry)) removePath(`src/pages/${entry}`);
  }
}

// 2. Remove the app card registration.
replaceRequired(
  'src/data/apps.js',
  "import { DEPARTMENT_APP } from './department.js';\n\n",
  '',
  'DEPARTMENT_APP import',
);
replaceRequired(
  'src/data/apps.js',
  'export const APPS = [\n  DEPARTMENT_APP,\n\n',
  'export const APPS = [\n',
  'DEPARTMENT_APP catalog entry',
);

// 3. Remove the route, lazy component, design profile, usage title and renderer.
replaceRequired(
  'src/main.jsx',
  "const DepartmentWorkspace = lazy(() => import('./pages/DepartmentWorkspace.jsx'));\n",
  '',
  'DepartmentWorkspace lazy import',
);
replaceRequired(
  'src/main.jsx',
  ", 'department', 'homeroom'",
  ", 'homeroom'",
  'department route registry entry',
);
replaceRequired(
  'src/main.jsx',
  "  department: { accent: '#3B4CCA', soft: '#E0E4FF', ink: '#12183B' },\n",
  '',
  'department route design profile',
);
replaceRequired(
  'src/main.jsx',
  ", department: ['Department', 'Tổ chuyên môn']",
  '',
  'department usage title',
);
replaceRequired(
  'src/main.jsx',
  "          {canAccessRoute && currentRoute === 'department' && currentUser && <DepartmentWorkspace {...context} />}\n",
  '',
  'department route renderer',
);

// 4. Remove Department permissions and all access helpers.
replaceRequired(
  'src/utils/permissions.js',
  "import { DEPARTMENT_MODULES, DEPARTMENT_PERMISSION_ITEMS, DEPARTMENT_PUBLISH_PERMISSION_ID, DEPARTMENT_WORKSPACE_PERMISSION_ID, DEPARTMENT_WORKSPACE_SLUG } from '../data/department.js';\n",
  '',
  'Department permission import',
);
replaceRequired(
  'src/utils/permissions.js',
  '  department: DEPARTMENT_WORKSPACE_PERMISSION_ID,\n',
  '',
  'department route permission',
);
replaceRequired(
  'src/utils/permissions.js',
  'export const PERMISSION_ITEMS = [...CORE_PERMISSION_ITEMS, ...TOOL_PERMISSION_ITEMS, ...DEPARTMENT_PERMISSION_ITEMS];',
  'export const PERMISSION_ITEMS = [...CORE_PERMISSION_ITEMS, ...TOOL_PERMISSION_ITEMS];',
  'Department permission catalog merge',
);
replaceRegexRequired(
  'src/utils/permissions.js',
  /\n  \{\n    key: 'department',\n    title: 'English department workspace',\n    titleVi: 'Tổ chuyên môn',\n    ids: DEPARTMENT_PERMISSION_ITEMS\.map\(\(item\) => item\.id\),\n  \},/,
  '',
  'Department permission group',
);
replaceRegexRequired(
  'src/utils/permissions.js',
  /\nexport function canPublishDepartment\(user\) \{[\s\S]*?\n\}\n\nexport function hasPermissionId/,
  '\nexport function hasPermissionId',
  'canPublishDepartment helper',
);
replaceRegexRequired(
  'src/utils/permissions.js',
  /\nexport function hasDepartmentModuleAccess\(user, moduleId\) \{[\s\S]*?\n\}\n\nexport function hasAnyDepartmentAccess\(user\) \{[\s\S]*?\n\}\n/,
  '\n',
  'Department access helpers',
);
replaceRequired(
  'src/utils/permissions.js',
  "  if (route === 'department') return DEPARTMENT_WORKSPACE_PERMISSION_ID;\n",
  '',
  'getRoutePermissionId department branch',
);
replaceRequired(
  'src/utils/permissions.js',
  "  if (route === 'department') return hasAnyDepartmentAccess(user);\n",
  '',
  'hasRouteAccess department branch',
);

// 5. Remove every global navigation and command-palette reference.
replaceAll('src/components/GlobalFlatNavigation.jsx', ", department: 'Tổ chuyên môn'", '');
replaceAll('src/components/GlobalFlatNavigation.jsx', ", department: 'Department'", '');
replaceAll('src/components/GlobalFlatNavigation.jsx', ", department: '#3b4cca'", '');
replaceAll('src/components/GlobalFlatNavigation.jsx', ", department: '▦'", '');
replaceAll('src/components/GlobalFlatNavigation.jsx', ", 'department'", '');
replaceRequired(
  'src/components/GlobalCommandPalette.jsx',
  "  { route: 'department', vi: 'Tổ chuyên môn', en: 'Department', icon: '▦', color: '#3B4CCA' },\n",
  '',
  'Department command-palette route',
);

// 6. Remove the legacy visual profile and launcher tombstones.
replaceRegexRequired(
  'src/data/designProfiles.js',
  /\n  'department-workspace': \{\n    accent: '#3B4CCA',\n    soft: '#E0E4FF',\n    ink: '#12183B',\n    icon: 'department',\n    style: 'Department dashboard',\n    styleVi: 'Bảng quản lý tổ chuyên môn',\n  \},/,
  '',
  'Department design profile',
);
for (const line of [
  "  'department-workspace',\n",
  "  'tool:department-workspace',\n",
  "  'route:department',\n",
]) {
  replaceAll('src/utils/launcherPreferences.js', line, '');
}

// Reset only the non-essential recent-app cache namespace so old Department cards
// cannot survive in the home-page recent list. This does not touch user documents.
replaceRequired(
  'src/utils/appUsage.js',
  "const APP_USAGE_PREFIX = 'bes-app-usage-v1:';",
  "const APP_USAGE_PREFIX = 'bes-app-usage-v2:';",
  'app usage cache namespace',
);

// 7. Remove the dedicated Department test command from every verification chain.
const packagePath = 'package.json';
const packageJson = JSON.parse(read(packagePath));
delete packageJson.scripts?.['test:department'];
for (const [name, command] of Object.entries(packageJson.scripts || {})) {
  if (typeof command === 'string') {
    packageJson.scripts[name] = command
      .replaceAll(' && npm run test:department', '')
      .replaceAll('npm run test:department && ', '');
  }
}
write(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

// 8. Fail the migration if executable website code still contains an old module,
// route, identifier, component, style or test reference.
const auditRoots = ['src', 'scripts'];
const ignoredFiles = new Set([
  'scripts/remove-department-completely.mjs',
]);
const hardPatterns = [
  /DepartmentWorkspace/,
  /DepartmentWorkCenter/,
  /DepartmentTeacherDirectory/,
  /DepartmentWorkspaceV2/,
  /DepartmentWorkspaceModernFields/,
  /department-approved/,
  /department-rebuild-app/,
  /bes-department-workspace/,
  /department-workspace/,
  /route:department/,
  /#\/department/,
  /department:publish/,
  /department:dashboard/,
  /department:work-schedule/,
  /department:documents/,
  /department:work-hub/,
  /department:teachers/,
  /test:department/,
  /department-runtime-test/,
  /data\/department/,
  /departmentStore/,
  /route:\s*['"]department['"]/,
  /currentRoute\s*===\s*['"]department['"]/,
  /route\s*===\s*['"]department['"]/,
];

const textExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.css', '.json']);
const failures = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    if (ignoredFiles.has(relative)) continue;
    if (entry.isDirectory()) walk(absolute);
    else if (textExtensions.has(path.extname(entry.name))) {
      const content = fs.readFileSync(absolute, 'utf8');
      for (const pattern of hardPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(content)) failures.push(`${relative}: ${pattern}`);
      }
    }
  }
}
auditRoots.forEach((dir) => walk(resolve(dir)));

if (failures.length) {
  console.error('[remove-department] Remaining legacy references:');
  [...new Set(failures)].forEach((item) => console.error(` - ${item}`));
  throw new Error('Department removal audit failed.');
}

// The migration is one-time only; remove its own implementation and workflow
// from the final repository state after every check has passed.
removePath('scripts/remove-department-completely.mjs');
removePath('.github/workflows/remove-department-completely.yml');

console.log('[remove-department] Complete removal passed.');
