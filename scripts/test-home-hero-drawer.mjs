import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const editor = read('src/components/HomeHeroCmsEditor.jsx');
const preview = read('src/components/HomeHeroCmsPreviewDock.jsx');
const styling = read('src/styles/HomeHeroCmsEditorDrawer.css');
const home = read('src/pages/Home.jsx');
const hero = read('src/components/HomeHeroExperience2026.jsx');
function check(label, condition) {
  assert.ok(condition, label);
  console.log('✓ ' + label);
}

check('right drawer replaces centered full-screen modal', editor.includes('hero-editor hero-editor--drawer') &&
  styling.includes('justify-content: flex-end !important') &&
  styling.includes('width: min(660px, calc(100vw - 32px)) !important'));
check('Home CSS loads scoped drawer rules after the legacy skins',
  home.lastIndexOf('HomeHeroCmsEditorDrawer.css') > home.lastIndexOf('HomeHeroCmsEditorInteractionFix.css'));
check('editor is still an accessible modal dialog', editor.includes('role="dialog" aria-modal="true"'));
check('Escape, keyboard focus containment and focus restoration work', editor.includes("event.key === 'Escape'") &&
  editor.includes("event.key !== 'Tab'") &&
  editor.includes('previouslyFocused?.focus?.()'));
check('unsaved changes prompt appears before closing', editor.includes('lastSavedConfigRef') &&
  editor.includes('window.confirm(') && editor.includes('Bạn có thay đổi chưa lưu'));
check('full-size homepage Hero remains live behind the drawer', hero.includes('previewConfig || settings.published') &&
  editor.includes('onPreview?.(normalizeHomeHeroConfig(config), device)'));
check('preview is an optional panel within the drawer, not another column', preview.includes('.hero-editor--drawer .hero-editor__preview-slot') &&
  editor.includes('data-preview-expanded=') && styling.includes('data-preview-expanded="false"'));
check('five existing content tabs and editors are retained', ['content', 'buttons', 'info', 'background', 'overlay'].every((name) => editor.includes("['" + name + "'")));
check('the original upload, draft, reset and publication workflows remain',
  ['uploadHomeHeroMedia(', 'saveHomeHeroDraft(', 'publishHomeHero(', 'resetDefault'].every((phrase) => editor.includes(phrase)));
check('footer stays anchored and the form scrolls independently', styling.includes('grid-template-rows: auto minmax(0, 1fr) auto') &&
  styling.includes('overflow-y: auto !important') && styling.includes('.hero-editor__footer'));
check('mobile becomes a full-width drawer', styling.includes('@media (max-width: 760px)') &&
  styling.includes('width: 100vw !important'));
check('reduced motion is respected', styling.includes('prefers-reduced-motion: reduce'));
console.log('PASS: Home Hero Drawer regression contract');
