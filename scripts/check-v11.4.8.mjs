import fs from 'node:fs';

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
const apiEntries = fs.readdirSync('api').filter((name) => !name.startsWith('_') && /\.(?:js|mjs|ts|py|go)$/i.test(name));

pass('package version 11.4.8', pkg.version === '11.4.8');
pass('version registry 11.4.8', versionSource.includes("APP_VERSION = '11.4.8'") && versionJson.version === '11.4.8' && releaseJson.version === '11.4.8');
pass('runtime core 2.4.8', versionJson.runtimeCore === '2.4.8' && releaseJson.runtime === '2.4.8');
pass('Grammar Builder V2.1 label', grammar.includes('GRAMMAR BUILDER · V2.1'));
pass('grouped grammar domains', grammar.includes('GRAMMAR_DOMAIN_GROUPS') && grammar.includes("label: 'Common grammar contrasts'") && grammar.includes("label: 'Exam and integrated grammar'"));
const domainBlock = grammar.slice(grammar.indexOf('const GRAMMAR_DOMAIN_GROUPS'), grammar.indexOf('const GRAMMAR_DOMAINS'));
pass('expanded domain catalogue', (domainBlock.match(/'[^']+'/g) || []).length >= 108);
pass('domain-only focus UI', grammar.includes('Yêu cầu cụ thể khác') && !grammar.includes('label="Grammar contrast"') && !grammar.includes('label="Cấu trúc bắt buộc"') && !grammar.includes('label="Cấu trúc loại trừ"'));
pass('custom focus migration', grammar.includes('function normalizeProject') && grammar.includes('raw.focusRequest || raw.contrast'));
pass('AI prompts use consolidated grammar focus', grammar.includes('function grammarFocus') && grammar.includes('Specific focus / teacher request'));
pass('quick domain suggestions', grammar.includes('gb-domain-hints') && grammar.includes('THPT exam grammar'));
pass('two-card desktop setup', grammarCss.includes('V11.4.8 — approved two-card workflow') && grammarCss.includes('.gb-setup-grid{grid-template-columns:repeat(2,minmax(0,1fr))'));
pass('all six setup cards occupy one grid cell', grammarCss.includes('.gb-card-mode,.gb-card-blueprint,.gb-card-ai{grid-column:auto}'));
pass('large card headings', grammarCss.includes('font-size:clamp(30px,2.1vw,38px)'));
pass('large field typography', grammarCss.includes('font-size:16px;line-height:1.6'));
pass('large build-mode cards', grammarCss.includes('min-height:154px') && grammarCss.includes('.gb-mode-grid{grid-template-columns:repeat(2'));
pass('large AI task cards', grammarCss.includes('min-height:142px') && grammarCss.includes('.gb-ai-task-grid{grid-template-columns:repeat(2'));
pass('dimensional hero markup', ['gb-hero-visual','gb-visual-book','gb-visual-chart','gb-visual-ai'].every((value) => grammar.includes(value)));
pass('dimensional hero styling', grammarCss.includes('V11.4.8 — dimensional Grammar Builder hero') && grammarCss.includes('perspective:1000px'));
pass('responsive one-column fallback', grammarCss.includes('@media(max-width:1050px)') && grammarCss.includes('.gb-setup-grid{grid-template-columns:1fr}'));
pass('existing seven-step workflow retained', grammar.includes('const WORKFLOW_STEPS') && (grammar.match(/\['0[1-7]'/g) || []).length >= 7);
pass('existing nine-card workflow retained', ['number="01"','number="02"','number="03"','number="04"','number="05"','number="06"','CARD 07','CARD 08','number="09"'].every((value) => grammar.includes(value)));
pass('real Brian AI gateway retained', grammar.includes('callAI({') && grammar.includes('getActiveAiConfig'));
pass('Vercel functions <=12', apiEntries.length <= 12);
pass('no obsolete lesson AI function', !exists('api/lesson-ai.mjs'));
pass('public npm registry only', !read('package-lock.json').includes('applied-caas-gateway'));

console.log(`\nV11.4.8 Grammar Builder Large Card Check: ${passed}/${passed + failed} passed`);
console.log(`Deployable API entries: ${apiEntries.length}`);
if (failed) process.exit(1);
