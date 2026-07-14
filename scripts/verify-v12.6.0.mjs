import fs from 'node:fs';

const required = [
  'src/ui-core/components/UIOverlays.jsx',
  'src/ui-core/styles/overlay-core.css',
  'src/components/GlobalCommandPalette.jsx',
  'src/components/ContentTransferHub.jsx',
  'src/components/GlobalAutosave.jsx',
  'src/components/StatusMenuBar.jsx',
  'src/components/UniversalAIAssist.jsx',
  'src/main.jsx',
  'src/config/version.js',
  'index.html',
  'package.json',
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);

const read = (file) => fs.readFileSync(file, 'utf8');
const overlay = read(required[0]);
const css = read(required[1]);
const palette = read(required[2]);
const transfer = read(required[3]);
const autosave = read(required[4]);
const status = read(required[5]);
const ai = read(required[6]);
const main = read(required[7]);
const version = read(required[8]);
const index = read(required[9]);
const pkg = JSON.parse(read(required[10]));

const assertions = [
  ['UI overlay portal primitive', overlay.includes('export function UIOverlayPortal') && overlay.includes('createPortal')],
  ['Overlay focus management', overlay.includes('focusableElements') && overlay.includes("event.key !== 'Tab'") && overlay.includes('restoreFocus')],
  ['Overlay escape and scroll lock', overlay.includes("event.key === 'Escape'") && overlay.includes('bui-overlay-lock')],
  ['Shared overlay surface primitives', ['UIOverlaySurface', 'UIOverlayHeader', 'UIOverlayClose'].every((name) => overlay.includes(`export function ${name}`))],
  ['Global toast core', overlay.includes('export function UIToastCenter') && overlay.includes("'brian:ui-toast'") && overlay.includes('export function notifyUI')],
  ['Command palette migrated', palette.includes('<UIOverlayPortal') && palette.includes('bui-command-palette') && !palette.includes('createPortal(')],
  ['Content transfer drawer migrated', transfer.includes('placement="drawer-right"') && transfer.includes('bui-transfer-panel') && transfer.includes('notifyUI')],
  ['Autosave history dialog migrated', autosave.includes('bui-version-panel') && autosave.includes('<UIOverlayPortal')],
  ['Notification center drawer migrated', status.includes('bui-notice-panel') && status.includes('placement="drawer-right"') && status.includes('aria-modal="true"')],
  ['React AI Dock core markers', ai.includes('bui-ai-dock-window') && ai.includes('data-ui="ai-dock"') && ai.includes('bui-ai-dock-editor')],
  ['AI composer horizontal contract', css.includes('.bui-ai-dock .bui-ai-dock-editor') && css.includes('writing-mode: horizontal-tb !important') && css.includes('grid-template-columns: minmax(0,1fr) 46px !important')],
  ['AI Dock containment and responsive contract', css.includes('contain: layout paint style') && css.includes('@media (max-width: 720px)')],
  ['Overlay design adapters', css.includes("html[data-design-language='material-3'] .bui-overlay-surface") && css.includes("html[data-design-language='apple'] .bui-overlay-surface")],
  ['Overlay CSS imported after legacy styles', main.indexOf("import './ui-core/styles/overlay-core.css';") > main.indexOf("import './styles/v1159.css';")],
  ['Toast center mounted', main.includes('<UIToastCenter />')],
  ['Legacy injected AI Dock script retired', !index.includes('/bes-ai-dock-v2/ai-dock-v2.js') && !fs.existsSync('public/bes-ai-dock-v2')],
  ['UI Core AI Dock ownership marker', index.includes('BES_UI_CORE_AI_DOCK_V126_START')],
  ['Version registry', version.includes("12.6.0") && pkg.version === '12.6.0'],
  ['V12.6 verification command', Boolean(pkg.scripts?.['verify:v12.6.0'])],
];

let passed = 0;
for (const [label, ok] of assertions) {
  if (!ok) throw new Error(`FAIL: ${label}`);
  console.log(`✓ ${label}`);
  passed += 1;
}
console.log(`V12.6.0 Overlay, Dialog & AI Dock Core verification PASS (${passed}/${assertions.length})`);
