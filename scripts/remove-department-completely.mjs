import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const removedPaths = [
  'scripts/department-runtime-test.mjs',
  'src/data/department.js',
  'src/pages/DepartmentWorkspace.jsx',
  'src/pages/DepartmentWorkspaceModernFields.css',
  'src/pages/DepartmentWorkspaceV2.css',
  'src/pages/department/DepartmentIcons.jsx',
  'src/pages/department/DepartmentTeacherDirectory.css',
  'src/pages/department/DepartmentTeacherDirectory.jsx',
  'src/pages/department/DepartmentWorkCenter.jsx',
  'src/pages/department/DepartmentWorkspace.css',
  'src/utils/departmentStore.js',
];

const forbiddenMarkers = [
  'DepartmentWorkspace',
  'DEPARTMENT_APP',
  'DEPARTMENT_MODULES',
  'DEPARTMENT_PERMISSION_ITEMS',
  'DEPARTMENT_PUBLISH_PERMISSION_ID',
  'DEPARTMENT_WORKSPACE_PERMISSION_ID',
  'DEPARTMENT_WORKSPACE_SLUG',
  "route:department",
  '#/department',
  'bes-department-workspace',
  "currentRoute === 'department'",
  'departmentStore',
];

const scanRoots = ['src', 'package.json'];
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.css', '.html']);
const violations = [];

for (const relativePath of removedPaths) {
  if (fs.existsSync(path.join(root, relativePath))) {
    violations.push(`Removed path still exists: ${relativePath}`);
  }
}

function scan(target) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) return;
  const stat = fs.statSync(absolute);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(absolute)) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      scan(path.join(target, name));
    }
    return;
  }
  if (target !== 'package.json' && !sourceExtensions.has(path.extname(target))) return;
  const text = fs.readFileSync(absolute, 'utf8');
  for (const marker of forbiddenMarkers) {
    if (text.includes(marker)) violations.push(`${target}: forbidden marker ${JSON.stringify(marker)}`);
  }
}

for (const target of scanRoots) scan(target);

if (violations.length) {
  console.error('\nDepartment removal audit failed:\n');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Department removal audit passed: route, catalog entry, UI, styles, permissions, store and tests are absent.');
