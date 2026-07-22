import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

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
check(!native.includes('<iframe'), 'no iframe');
check(!native.includes('/to-chuyen-mon/'), 'no standalone route dependency');
check(/professional-hub|Hub Chuyên môn/.test(apps), 'Professional Hub launcher card retained');
check(!/department-workspace/.test(apps), 'old Department launcher ID removed');
check(!vite.includes('to-chuyen-mon/index.html'), 'single Vite application build');
check(!vercel.includes('/to-chuyen-mon'), 'no Professional Hub Vercel rewrite');
check(!fs.existsSync(path.join(root, 'to-chuyen-mon/index.html')), 'standalone HTML entry removed');
check(fs.existsSync(path.join(root, 'department-app/supabase/department-schema.sql')), 'Supabase schema retained');
check(fs.existsSync(path.join(root, 'department-app/supabase/department-bootstrap.sql')), 'TTCM bootstrap retained');

if (failures.length) {
  console.error(`Professional Hub native verification failed (${failures.length}).`);
  process.exit(1);
}

console.log('Professional Hub native verification passed.');
