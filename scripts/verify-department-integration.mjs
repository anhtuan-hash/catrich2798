import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`missing file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

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

function exists(relativePath, label) {
  const ok = fs.existsSync(path.join(root, relativePath));
  console.log(`${ok ? '✓' : '✕'} ${label}`);
  if (!ok) failures.push(label);
}

function contains(content, pattern, label) {
  const ok = typeof pattern === 'string'
    ? content.includes(pattern)
    : pattern.test(content);
  console.log(`${ok ? '✓' : '✕'} ${label}`);
  if (!ok) failures.push(label);
}

function excludes(content, pattern, label) {
  const ok = typeof pattern === 'string'
    ? !content.includes(pattern)
    : !pattern.test(content);
  console.log(`${ok ? '✓' : '✕'} ${label}`);
  if (!ok) failures.push(label);
}

const allSource = readSourceTree('src');
const apps = read('src/data/apps.js');
const component = read('src/pages/DepartmentMicrofrontend.jsx');
const styles = read('src/pages/DepartmentMicrofrontend.css');
const vite = read('vite.config.js');
const vercel = read('vercel.json');
const schema = read('department-app/supabase/department-schema.sql');
const bootstrap = read('department-app/supabase/department-bootstrap.sql');

contains(
  apps,
  /department-workspace|Tổ chuyên môn|to-chuyen-mon/,
  'launcher card',
);

contains(
  allSource,
  /DepartmentMicrofrontend/,
  'Department component is registered in Brian source',
);

contains(
  allSource,
  /department-workspace|to-chuyen-mon/,
  'Department route or tool identifier is registered',
);

contains(
  component,
  'data-testid="department-microfrontend"',
  'embedded microfrontend component',
);

contains(
  component,
  '/to-chuyen-mon/?embedded=1',
  'embedded Department iframe route',
);

contains(
  component,
  'department-microfrontend-header',
  'Brian-shell application header',
);

excludes(
  component,
  /createPortal|classList\.add\(\s*['"]department-microfrontend-active['"]/,
  'component does not enter fullscreen/focus mode',
);

contains(
  styles,
  '.department-microfrontend-frame',
  'embedded frame styling',
);

excludes(
  styles,
  /z-index:\s*214748|body\s*>\s*\.department-microfrontend|100dvh\s*!important/,
  'styles do not replace the Brian shell',
);

exists(
  'to-chuyen-mon/index.html',
  'multi-page HTML entry',
);

contains(
  vite,
  /to-chuyen-mon\/index\.html/,
  'multi-page Vite input',
);

contains(
  vercel,
  /to-chuyen-mon/,
  'Vercel Department rewrite',
);

contains(
  schema,
  /department_replace_collection/,
  'Supabase schema',
);

contains(
  bootstrap,
  /department_head/,
  'TTCM bootstrap',
);

exists(
  'dist/to-chuyen-mon/index.html',
  'build output includes Department multi-page entry',
);

if (failures.length > 0) {
  console.error(`Department integration verification failed (${failures.length}).`);
  process.exit(1);
}

console.log('Department integration verification passed.');
