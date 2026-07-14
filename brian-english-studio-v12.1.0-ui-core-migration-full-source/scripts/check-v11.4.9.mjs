import fs from 'node:fs';

let passed=0;
let failed=0;
const read=(file)=>fs.readFileSync(file,'utf8');
const exists=(file)=>fs.existsSync(file);
const pass=(name,condition)=>{if(condition){console.log(`✓ ${name}`);passed+=1;}else{console.error(`✗ ${name}`);failed+=1;}};

const pkg=JSON.parse(read('package.json'));
const versionJson=JSON.parse(read('public/version.json'));
const releaseJson=JSON.parse(read('public/release-manifest.json'));
const versionSource=read('src/config/version.js');
const grammar=read('src/pages/GrammarBuilder.jsx');
const css=read('src/pages/GrammarBuilder.css');
const apiEntries=fs.readdirSync('api').filter((name)=>!name.startsWith('_')&&/\.(?:js|mjs|ts|py|go)$/i.test(name));

pass('package version 11.4.9',pkg.version==='11.4.9');
pass('version registry 11.4.9',versionSource.includes("APP_VERSION = '11.4.9'")&&versionJson.version==='11.4.9'&&releaseJson.version==='11.4.9');
pass('runtime core 2.4.9',versionJson.runtimeCore==='2.4.9'&&releaseJson.runtime==='2.4.9');
pass('Grammar Builder V2.2 label',grammar.includes('GRAMMAR BUILDER · V2.2'));
pass('two-card setup retained',css.includes('.gb-setup-grid{gap:32px}')&&css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
pass('modern dimensional card system',css.includes('V11.4.9 — vivid selection system')&&css.includes('--gb-elevated-shadow')&&css.includes('.gb-card::before'));
pass('app-wide readable typography',css.includes('.gb-card-heading h2{margin:5px 0 8px;font-size:clamp(36px')&&css.includes('.gb-field input,.gb-field select,.gb-field textarea,.gb-source-input{min-height:64px'));
pass('build mode selection has full color state',css.includes('.gb-mode-grid button.active{border:2.5px solid var(--choice-accent)')&&css.includes('.gb-mode-grid button.active::after'));
pass('six build modes have distinct accents',(css.match(/\.gb-mode-grid button:nth-child\(/g)||[]).length>=6);
pass('quick grammar domain selection highlighted',grammar.includes("className={project.domain === value && !project.focusRequest ? 'active' : ''}")&&css.includes('.gb-domain-hints button.active'));
pass('selected field value highlighting',grammar.includes("'has-value'")&&css.includes('.gb-field.has-value input'));
pass('format chips show selected color',grammar.includes('aria-pressed={project.formats.includes(format.id)}')&&css.includes('.gb-chip-checks button.active'));
pass('quality rules show selected color',grammar.includes("className={project.constraints.includes(entry.id) ? 'active' : ''}")&&css.includes('.gb-constraint-grid label.active'));
pass('AI tasks show selected color',grammar.includes('aria-pressed={aiTask === task.id}')&&css.includes('.gb-ai-task-grid button.active'));
pass('workflow stages have selected color',grammar.includes("aria-current={active ? 'step' : undefined}")&&css.includes('.gb-workflow button.active'));
pass('editor item cards enlarged',css.includes('.gb-item-top h3{margin:7px 0 16px;font-size:21px')&&css.includes('.gb-item-card.selected{border:2.5px solid #2f6fe0'));
pass('audit cards enlarged',css.includes('.gb-audit-head h2{font-size:31px}')&&css.includes('.gb-summary-metric strong{font-size:31px}'));
pass('publish cards enlarged',css.includes('.gb-export-grid button,.gb-destination-grid button{min-height:128px')&&css.includes('.gb-export-grid strong,.gb-destination-grid strong{font-size:17px}'));
pass('modal cards enlarged',css.includes('.gb-modal>header h2{font-size:34px}')&&css.includes('.gb-ai-task-select strong{font-size:15px}'));
pass('responsive fallbacks retained',css.includes('@media(max-width:820px)')&&css.includes('@media(max-width:520px)'));
pass('grouped grammar domain catalogue retained',grammar.includes('GRAMMAR_DOMAIN_GROUPS')&&grammar.includes('THPT exam grammar'));
pass('real Brian AI gateway retained',grammar.includes('callAI({')&&grammar.includes('getActiveAiConfig'));
pass('Teacher Vault retained',grammar.includes('TEACHER VAULT'));
pass('Item Bank retained',grammar.includes('addQuestionsFromTextToBank'));
pass('Connected Workflow retained',grammar.includes('const DESTINATIONS')&&grammar.includes('createTransfer'));
pass('Vercel functions <=12',apiEntries.length<=12);
pass('no obsolete lesson AI function',!exists('api/lesson-ai.mjs'));
pass('public npm registry only',!read('package-lock.json').includes('applied-caas-gateway'));

console.log(`\nV11.4.9 Grammar Builder Vivid Card Check: ${passed}/${passed+failed} passed`);
console.log(`Deployable API entries: ${apiEntries.length}`);
if(failed)process.exit(1);
