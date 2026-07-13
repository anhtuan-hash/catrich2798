import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
function check(name, condition, detail = '') {
  checks.push({ name, pass: Boolean(condition), detail });
}

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const main = read('src/main.jsx');
const permissions = read('src/utils/permissions.js');
const runtime = read('src/services/runtime/core.js');
const migration = read('supabase/brian_v10_93_consolidated_migration.sql');
const version = JSON.parse(read('public/version.json'));

check('package version is 10.93.0', pkg.version === '10.93.0');
check('version manifest is 10.93.0', version.version === '10.93.0');
check('index meta is 10.93.0', index.includes('content="10.93.0"'));
check('native runtime exists', exists('src/services/runtime/core.js'));
check('runtime exports boot', runtime.includes('export async function bootRuntimeCore'));
check('runtime uses native Supabase client', runtime.includes("from '../../utils/supabase.js'"));
check('legacy key capture removed from index', !index.includes('supabase-key-capture'));
check('legacy Supabase bridge removed from index', !index.includes('supabase-bridge'));
check('legacy Work Hub injection removed', !index.includes('unified-work-hub'));
check('legacy Smart Knowledge injection removed', !index.includes('smart-knowledge-v10900'));

const pages = ['WorkHub','KnowledgeHub','AIWorkspace','ContentFactory','AssessmentCore'];
for (const page of pages) {
  check(`${page} page exists`, exists(`src/pages/${page}.jsx`));
  check(`${page} lazy route registered`, main.includes(`./pages/${page}.jsx`));
}
const routes = ['work-hub','knowledge-hub','ai-workspace','content-factory','assessment-core'];
for (const route of routes) {
  check(`${route} route registered`, main.includes(`'${route}'`));
  check(`${route} permission registered`, permissions.includes(`'${route}'`));
}

for (const table of ['bes_schema_registry','ai_workspace_projects','ai_workspace_messages','content_factory_projects','assessment_items','assessment_blueprints','assessment_tests','assessment_test_items']) {
  check(`migration creates ${table}`, migration.includes(`public.${table}`));
}
check('migration uses transaction', /^\s*--[\s\S]*?\nbegin;/i.test(migration));
check('migration commits', /\ncommit;\s*\n/i.test(migration));
check('RLS enabled for AI projects', migration.includes('alter table public.ai_workspace_projects enable row level security'));
check('RLS enabled for assessment items', migration.includes('alter table public.assessment_items enable row level security'));
check('platform manifest updated', exists('public/bes-modules-v10.93.0.json') && exists('public/bes-feature-flags-v10.93.0.json'));
check('V10.93 CSS loaded natively', main.includes("./styles/v1093.css"));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nV10.93 consolidated checks: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exit(1);
