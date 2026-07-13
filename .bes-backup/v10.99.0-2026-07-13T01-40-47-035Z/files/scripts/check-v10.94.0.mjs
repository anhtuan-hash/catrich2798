import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const checks=[];
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const exists=(file)=>fs.existsSync(path.join(root,file));
function check(name,condition){checks.push({name,pass:Boolean(condition)});}

const pkg=JSON.parse(read('package.json'));
const version=JSON.parse(read('public/version.json'));
const main=read('src/main.jsx');
const apps=read('src/data/apps.js');
const permissions=read('src/utils/permissions.js');
const nav=read('src/components/GlobalFlatNavigation.jsx');
const command=read('src/components/GlobalCommandPalette.jsx');
const page=read('src/pages/LearningIntelligence.jsx');
const factory=read('src/pages/ContentFactory.jsx');
const runtime=read('src/services/runtime/core.js');
const migration=read('supabase/brian_v10_94_learning_intelligence.sql');
const index=read('index.html');

check('package version 10.94.0',pkg.version==='10.94.0');
check('version manifest 10.94.0',version.version==='10.94.0');
check('index meta 10.94.0',index.includes('content="10.94.0"'));
check('V10.94 stylesheet loaded',main.includes("./styles/v1094.css"));
check('LearningIntelligence page exists',exists('src/pages/LearningIntelligence.jsx'));
check('LearningIntelligence lazy route',main.includes("./pages/LearningIntelligence.jsx"));
check('learning route registered',main.includes("'learning-intelligence'"));
check('learning app registered',apps.includes("slug: 'learning-intelligence'"));
check('learning permission registered',permissions.includes("'learning-intelligence': 'route:learning-intelligence'"));
check('learning navigation registered',nav.includes("'learning-intelligence'"));
check('learning command palette registered',command.includes("route: 'learning-intelligence'"));
check('runtime core upgraded',runtime.includes("version: '1.1.0'"));
check('page includes mastery analytics',page.includes('aggregateLearning'));
check('page includes error taxonomy',page.includes('ERROR_TAXONOMY'));
check('page includes adaptive plan',page.includes('buildAdaptivePlan'));
check('page supports CSV import',page.includes('parseAttemptImport'));
check('page supports offline fallback',page.includes('readLocal')&&page.includes('writeLocal'));
check('content factory receives learning transfer',factory.includes('bes-v1094-learning-to-content'));
for(const table of ['learning_learners','learning_attempts','learning_mastery','learning_interventions','learning_practice_sets']) check(`migration creates ${table}`,migration.includes(`public.${table}`));
check('migration creates mastery RPC',migration.includes('public.learning_rebuild_mastery'));
check('migration creates access helper',migration.includes('public.learning_can_access_learner'));
check('migration enables RLS',migration.includes('alter table public.learning_learners enable row level security'));
check('migration uses transaction',/\nbegin;\n/i.test(migration)&&/\ncommit;\n/i.test(migration));
check('V10.94 module manifest exists',exists('public/bes-modules-v10.94.0.json'));
check('V10.94 flags manifest exists',exists('public/bes-feature-flags-v10.94.0.json'));
check('V10.94 platform runtime exists',exists('public/bes-platform-control-v10940.js'));

const failed=checks.filter((item)=>!item.pass);
for(const item of checks) console.log(`${item.pass?'PASS':'FAIL'}  ${item.name}`);
console.log(`\nV10.94 Learning Intelligence checks: ${checks.length-failed.length}/${checks.length} passed.`);
if(failed.length) process.exit(1);
