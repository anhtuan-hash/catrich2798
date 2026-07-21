import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
let failed = 0;
const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const pass = (name, condition) => {
  if (condition) { console.log(`✓ ${name}`); passed += 1; }
  else { console.error(`✗ ${name}`); failed += 1; }
};

const pkg = JSON.parse(read('package.json'));
const versionJson = JSON.parse(read('public/version.json'));
const releaseJson = JSON.parse(read('public/release-manifest.json'));
const versionSource = read('src/config/version.js');
const grammar = read('src/pages/GrammarBuilder.jsx');
const grammarCss = read('src/pages/GrammarBuilder.css');
const toolPage = read('src/pages/ToolPage.jsx');
const apps = read('src/data/apps.js');
const home = read('src/pages/Home.jsx');
const apiEntries = fs.readdirSync('api').filter((name) => !name.startsWith('_') && /\.(?:js|mjs|ts|py|go)$/i.test(name));

pass('package version 11.4.7', pkg.version === '11.4.7');
pass('version registry 11.4.7', versionSource.includes("APP_VERSION = '11.4.7'") && versionJson.version === '11.4.7' && releaseJson.version === '11.4.7');
pass('runtime core 2.4.7', versionJson.runtimeCore === '2.4.7' && releaseJson.runtime === '2.4.7');
pass('Grammar Builder lazy route', toolPage.includes("lazy(() => import('./GrammarBuilder.jsx'))") && toolPage.includes("tool?.slug === 'grammar-builder'"));
pass('Grammar Builder launcher registration', apps.includes("slug: 'grammar-builder'"));
pass('Grammar Builder animated home registration', home.includes("makeAppWindow('grammar-builder'"));
pass('seven-step workflow declared', grammar.includes('const WORKFLOW_STEPS') && (grammar.match(/\['0[1-7]'/g) || []).length >= 7);
pass('six build modes declared', ['mini-lesson','practice-set','thpt-exam','diagnostic','revision-pack','interactive'].every((value) => grammar.includes(`id: '${value}'`)));
pass('nine-card workflow markers', ['number="01"','number="02"','number="03"','number="04"','number="05"','number="06"','CARD 07','CARD 08','number="09"'].every((value) => grammar.includes(value)));
pass('metadata-rich sample items', ['sample-mcq','sample-verb','sample-error','sample-transform','sample-cloze'].every((value) => grammar.includes(value)));
pass('format-specific metadata fields', ['grammarPoint','cognitive','commonError','pattern','status'].every((value) => grammar.includes(value)));
pass('real Brian AI gateway wired', grammar.includes('callAI({') && grammar.includes('getActiveAiConfig') && grammar.includes('getProviderInfo'));
pass('controlled batch AI generation', grammar.includes('sectionDraftPrompt') && grammar.includes('batchItems') && grammar.includes('generated in controlled batches'));
pass('diagnostic engine wired', grammar.includes('diagnosticPrompt') && grammar.includes("task === 'diagnose'") && grammar.includes('remediationPlan'));
pass('AI validation and item rewrite wired', grammar.includes('validationPrompt') && grammar.includes('itemRewritePrompt') && grammar.includes("task === 'validate'"));
pass('Teacher Vault and version history', grammar.includes('TEACHER VAULT') && grammar.includes('saveVersion') && grammar.includes('restoreVersion'));
pass('Quality Audit engine', grammar.includes('auditProject') && grammar.includes('QUALITY AUDIT REPORT') && grammar.includes('duplicateGroups'));
pass('Item Bank integration', grammar.includes('addQuestionsFromTextToBank') && grammar.includes('addToItemBank'));
pass('DOCX and PDF source import', grammar.includes('readDocxTextFromBuffer') && grammar.includes('readPdfTextFromBuffer'));
pass('Connected Workflow destinations', ['lesson-plan-ai','exam-studio','worksheet-factory','textlab-activities','reading-studio','writing-studio','speaking-studio','english-lesson-integration'].every((value) => grammar.includes(`id: '${value}'`)));
pass('content-transfer inbox listener', grammar.includes('TRANSFER_APPLY_EVENT') && grammar.includes('window.addEventListener'));
pass('grammar pack transfer schema', grammar.includes('bes-grammar-pack/1.0'));
pass('large content editor cards', grammarCss.includes('.gb-item-card') && grammarCss.includes('.gb-editor-stage'));
pass('responsive editor and audit layout', grammarCss.includes('@media(max-width:1180px)') && grammarCss.includes('.gb-audit-card'));
pass('no obsolete lesson AI function', !exists('api/lesson-ai.mjs'));
pass('Vercel functions <=12', apiEntries.length <= 12);
pass('public npm registry only', !read('package-lock.json').includes('applied-caas-gateway'));

console.log(`\nV11.4.7 Grammar Production Workflow Check: ${passed}/${passed + failed} passed`);
console.log(`Deployable API entries: ${apiEntries.length}`);
if (failed) process.exit(1);
