import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('../src/utils/gradebookMaterialHeroRuntime.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/GradebookMaterialHeroRuntime.css', import.meta.url), 'utf8');

for (const token of [
  'gbe-m3-pastel-orb is-blue',
  'gbe-m3-art-left',
  'gbe-m3-art-right',
  'gbe-m3-hand-note',
  'Mỗi nỗ lực',
  'Good Students',
  'gbe-m3-mini-stats',
  'article class="is-blue"',
  'article class="is-mint"',
  'article class="is-peach"',
  'Bắt đầu nhập <i aria-hidden="true">›</i>',
]) {
  assert.ok(runtime.includes(token), `Colorful gradebook hero markup missing: ${token}`);
}

for (const token of [
  'Gradebook Colorful Hero V1',
  '--gbe-blue: #1f78e9',
  '--gbe-lilac: #9b84f7',
  '--gbe-mint: #58c98b',
  '--gbe-peach: #ffb476',
  '--gbe-yellow: #ffd45f',
  'font-family: var(--gbe-font) !important',
  '.gbe-m3-hand-note',
  '.gbe-m3-art-left',
  '.gbe-m3-art-right',
  '.gbe-m3-mini-stats article.is-mint',
  '.gbe-m3-mini-stats article.is-peach',
  'background: linear-gradient(90deg, #ffd34f',
  'background: linear-gradient(135deg, #1f78e9, #1762c7)',
]) {
  assert.ok(css.includes(token), `Colorful gradebook hero CSS missing: ${token}`);
}

assert.ok(css.includes('--gbe-font: var(--bes-global-font-family'), 'Gradebook hero must respect the global/custom font system.');
assert.ok(!css.includes('Georgia, \'Times New Roman\''), 'Old beige editorial serif authority must be removed.');

const opens=(css.match(/{/g)||[]).length;
const closes=(css.match(/}/g)||[]).length;
assert.equal(opens, closes, 'Colorful gradebook hero CSS braces must be balanced.');

console.log('PASS: Gradebook hero matches the approved colorful pastel mockup architecture and preserves global font authority.');
