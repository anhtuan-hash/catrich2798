import fs from 'node:fs';
const files = [
  'src/pages/DepartmentWorkspace.jsx',
  'src/pages/HomeroomWorkspace.jsx',
  'src/pages/WorkHub.jsx',
  'src/pages/AIGovernanceCenter.jsx',
  'src/ui-core/styles/ui-core.css',
  'src/config/version.js',
];
for (const file of files) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const sources = Object.fromEntries(files.map((file) => [file, fs.readFileSync(file, 'utf8')]));
const assertions = [
  ['Department management contract', sources[files[0]].includes('data-management-app="department"')],
  ['Homeroom management contract', sources[files[1]].includes('data-management-app="homeroom"')],
  ['Work Hub management contract', sources[files[2]].includes('data-management-app="work-hub"')],
  ['AI Governance management contract', sources[files[3]].includes('data-management-app="ai-governance"')],
  ['Shared management root styling', sources[files[4]].includes('.bui-management {')],
  ['Shared management header styling', sources[files[4]].includes('.bui-management-header')],
  ['Shared management metrics styling', sources[files[4]].includes('.bui-management-metrics')],
  ['Shared management layout styling', sources[files[4]].includes('.bui-management-layout')],
  ['Management card token bridge', sources[files[4]].includes('.department-list-panel') && sources[files[4]].includes('.ai-gov-card')],
  ['Horizontal textarea safeguard', sources[files[4]].includes('writing-mode: horizontal-tb !important')],
  ['Responsive management layout', sources[files[4]].includes('@media (max-width: 1040px)')],
  ['Version registry', sources[files[5]].includes("12.3.0")],
];
let passed = 0;
for (const [label, ok] of assertions) { if (!ok) throw new Error(`FAIL: ${label}`); console.log(`✓ ${label}`); passed++; }
console.log(`V12.3.0 native management UI verification PASS (${passed}/${assertions.length})`);
