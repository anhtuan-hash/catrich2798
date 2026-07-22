import fs from 'node:fs';

const checks = [
  ['launcher card', 'src/data/apps.js', "slug: 'department-workspace'"],
  ['tool route', 'src/pages/ToolPage.jsx', "tool?.slug === 'department-workspace'"],
  ['microfrontend component', 'src/pages/DepartmentMicrofrontend.jsx', 'src="/to-chuyen-mon/"'],
  ['multi-page HTML entry', 'to-chuyen-mon/index.html', '../department-app/src/main.jsx'],
  ['multi-page Vite input', 'vite.config.js', "department: resolve(process.cwd(), 'to-chuyen-mon/index.html')"],
  ['Vercel Department rewrite', 'vercel.json', '"source": "/to-chuyen-mon"'],
  ['Supabase schema', 'department-app/supabase/department-schema.sql', 'department_replace_collection'],
  ['TTCM bootstrap', 'department-app/supabase/department-bootstrap.sql', "anhtuan@pek.edu.vn"],
];

let failures = 0;
for (const [label, file, needle] of checks) {
  if (!fs.existsSync(file)) {
    console.error(`✗ ${label}: missing ${file}`);
    failures += 1;
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(needle)) {
    console.error(`✗ ${label}: expected marker not found in ${file}`);
    failures += 1;
  } else {
    console.log(`✓ ${label}`);
  }
}

if (fs.existsSync('dist')) {
  const builtEntry = 'dist/to-chuyen-mon/index.html';
  if (!fs.existsSync(builtEntry)) {
    console.error(`✗ build output: missing ${builtEntry}`);
    failures += 1;
  } else {
    const html = fs.readFileSync(builtEntry, 'utf8');
    if (!/assets\/.+\.js/.test(html)) {
      console.error('✗ build output: Department HTML does not reference a bundled JavaScript asset');
      failures += 1;
    } else {
      console.log('✓ build output includes Department multi-page entry');
    }
  }
}

if (failures) {
  console.error(`Department integration verification failed (${failures}).`);
  process.exit(1);
}
console.log('Department integration verification passed.');
