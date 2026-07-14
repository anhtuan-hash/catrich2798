import fs from 'node:fs';

const required = [
  'src/ui-core/components/UIPlatform.jsx',
  'src/ui-core/styles/platform-core.css',
  'src/styles/legacy-active.css',
  'src/ui-core/layouts/routeLayout.js',
  'src/main.jsx',
  'src/config/version.js',
  'package.json',
  'index.html',
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const read = (file) => fs.readFileSync(file, 'utf8');
const component = read(required[0]);
const css = read(required[1]);
const legacy = read(required[2]);
const layouts = read(required[3]);
const main = read(required[4]);
const version = read(required[5]);
const pkg = JSON.parse(read(required[6]));
const index = read(required[7]);
const retired = ['v1100.css','v1110.css','v1131.css','v1132.css','v1133.css','v1136.css','v1137.css','v1154.css','v1158.css','v1159.css'];
const routeContracts = ['ai-workspace','content-factory','content-ecosystem','assessment-core','learning-intelligence','platform-readiness','automation-center','cloud-operations','collaboration-hub','data-governance','production-hardening'];
const assertions = [
  ['Native route surface component', component.includes('export function UIRouteSurface') && component.includes('data-ui="route-surface"')],
  ['Reusable platform primitives', component.includes('export function UIPlatformHeader') && component.includes('export function UIStatGrid') && component.includes('export function UIDataRegion')],
  ['Platform core stylesheet', css.includes('.bui-route-surface--platform') && css.includes('.bui-route-surface--operations')],
  ['Horizontal textarea protection', css.includes('writing-mode: horizontal-tb !important') && css.includes('inline-size: 100%')],
  ['Responsive platform grids', css.includes('@media (max-width: 980px)') && css.includes('grid-template-columns: 1fr !important')],
  ['Design adapter coverage', css.includes("html[data-design-language='material-3']") && css.includes("html[data-design-language='apple']")],
  ['Single isolated legacy stylesheet import', main.includes("import './styles/legacy-active.css';") && !main.includes("import './styles/v1093.css';")],
  ['UI Core loads after legacy compatibility', main.indexOf("legacy-active.css") < main.indexOf("ui-core.css")],
  ['Platform Core loads after base UI Core', main.indexOf("platform-core.css") > main.indexOf("ui-core.css")],
  ['Provider Hub styling restored', legacy.includes("@import './v1157-ai-provider-hub.css';")],
  ['Active compatibility styles retained', ['v1093','v1094','v1095','v1096','v1097','v1098','v1099','v1120'].every((id) => legacy.includes(`@import './${id}.css';`))],
  ['Dead legacy files retired', retired.every((name) => !fs.existsSync(`src/styles/${name}`))],
  ['All platform routes use route surfaces', routeContracts.every((route) => main.includes(`route=\"${route}\"`))],
  ['Content ecosystem workbench mapping', layouts.includes("['content-ecosystem', 'workbench']")],
  ['Operational management mappings', ['learning-intelligence','platform-readiness','automation-center','cloud-operations','collaboration-hub','production-hardening'].every((route) => layouts.includes(`['${route}', 'management']`))],
  ['Trash and app vault mappings', layouts.includes("['trash', 'library']") && layouts.includes("['app-vault', 'launch']")],
  ['Version registry', version.includes("12.8.0") && pkg.version === '12.8.0' && index.includes('content="12.8.0"')],
  ['V12.8 verification command', Boolean(pkg.scripts?.['verify:v12.8.0'])],
];
let passed = 0;
for (const [label, ok] of assertions) {
  if (!ok) throw new Error(`FAIL: ${label}`);
  console.log(`✓ ${label}`);
  passed += 1;
}
console.log(`V12.8.0 Platform Core & Legacy CSS Retirement verification PASS (${passed}/${assertions.length})`);
