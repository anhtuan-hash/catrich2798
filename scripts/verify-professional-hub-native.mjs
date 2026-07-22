import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function readSourceTree(relativeDir) {
  const start = path.join(root, relativeDir);
  const allowed = new Set(['.js', '.jsx', '.ts', '.tsx']);
  const chunks = [];

  function walk(current) {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (allowed.has(path.extname(entry.name))) {
        chunks.push(fs.readFileSync(absolute, 'utf8'));
      }
    }
  }

  walk(start);
  return chunks.join('\n');
}

function read(file) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    failures.push(`missing ${file}`);
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
}

function check(ok, label) {
  console.log(`${ok ? '✓' : '✕'} ${label}`);
  if (!ok) failures.push(label);
}

const page = read('src/pages/ProfessionalHub.jsx');
const native = read('src/apps/professional-hub/ProfessionalHubNative.jsx');
const apps = read('src/data/apps.js');
const vite = read('vite.config.js');
const vercel = read('vercel.json');

check(page.includes('ProfessionalHubNative'), 'Brian page imports Professional Hub native component');
check(native.includes('data-testid="professional-hub-native-app"'), 'native Professional Hub component');
const rootModule = read('src/apps/professional-hub/ProfessionalHubRoot.jsx');
check(native.includes("import { DepartmentRoot } from './ProfessionalHubRoot.jsx'"), 'native wrapper imports DepartmentRoot');
check(native.includes('<DepartmentRoot />'), 'native wrapper renders DepartmentRoot');
check(rootModule.includes('export { DepartmentRoot }'), 'DepartmentRoot is exported');
check(!rootModule.includes('createRoot('), 'no nested ReactDOM root');

check(!native.includes('<iframe'), 'no iframe');
check(!native.includes('/to-chuyen-mon/'), 'no standalone route dependency');
check(/professional-hub|Hub Chuyên môn/.test(apps), 'Professional Hub launcher card retained');
check(!/department-workspace/.test(apps), 'old Department launcher ID removed');
check(!vite.includes('to-chuyen-mon/index.html'), 'single Vite application build');
check(!vercel.includes('/to-chuyen-mon'), 'no Professional Hub Vercel rewrite');
check(!fs.existsSync(path.join(root, 'to-chuyen-mon/index.html')), 'standalone HTML entry removed');
const usersContext = read('src/apps/professional-hub/BrianUsersContext.jsx');
const professionalHubSource = readSourceTree(
  'src/apps/professional-hub',
);

check(usersContext.includes("from '../../utils/supabase.js'"), 'Hub uses Brian Supabase client');
check(usersContext.includes("bes_admin_list_profiles"), 'Hub loads Brian profiles');
check(native.includes('<BrianUsersProvider>'), 'Hub is wrapped with Brian users provider');
check(!/Nguyễn Thị Mai|Trần Minh Đức|Phạm Thu Hà|Lê Hoàng Nam|Đỗ Thị Hương/.test(professionalHubSource), 'mock teacher names removed');

check(fs.existsSync(path.join(root, 'department-app/supabase/department-schema.sql')), 'Supabase schema retained');
check(fs.existsSync(path.join(root, 'department-app/supabase/department-bootstrap.sql')), 'TTCM bootstrap retained');

if (failures.length) {
  console.error(`Professional Hub native verification failed (${failures.length}).`);
  process.exit(1);
}

console.log('Professional Hub native verification passed.');
