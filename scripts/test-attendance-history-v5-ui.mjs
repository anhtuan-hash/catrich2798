import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const readOptional = (path) => fs.existsSync(new URL(path, import.meta.url))
  ? fs.readFileSync(new URL(path, import.meta.url), 'utf8')
  : '';
const js = [
  readOptional('../public/attendance-history-v5.js'),
  readOptional('../public/attendance-history-pixel-v6.js'),
].join('\n');
const css = [
  readOptional('../public/attendance-history-v5.css'),
  readOptional('../public/attendance-history-pixel-v6.css'),
  readOptional('../public/attendance-history-final-polish-v6-1.css'),
].join('\n');

assert.match(index, /attendance-history-v5\.css\?v=2[\s\S]*attendance-history-pixel-v6\.css\?v=1[\s\S]*attendance-history-final-polish-v6-1\.css\?v=1/, 'final-polish History CSS must load after the approved v6 layer');
assert.match(index, /attendance-history-v5\.js\?v=2[\s\S]*attendance-history-pixel-v6\.js\?v=1/, 'pixel-match runtime must load after the stable v5 runtime');

assert.match(js, /data-ah-v5-type-filter/, 'runtime must still recognize the native type selector');
assert.match(js, /data-ah-v6-activity-icon/, 'runtime must decorate list cards with activity-specific icons');
assert.match(js, /decorateActivityIcons/, 'runtime must own activity icon decoration');
assert.match(js, /data-ah-v6-hero-meta/, 'runtime must ensure the selected hero exposes mockup-style metadata');
assert.match(js, /ensureHeroMetadata/, 'runtime must restore hero metadata when the host DOM omits it');
assert.match(js, /data-ah-v6-hero-art/, 'runtime must provide the academic hero illustration used by the mockup');
assert.match(js, /classList\.remove\('ah-history-pixel-v6'\)/, 'runtime must remove the v6 scope when History is no longer active');
assert.match(js, /ah-kind-remedial/, 'runtime must classify selected remedial detail');
assert.match(js, /ah-kind-gifted/, 'runtime must classify selected gifted detail');
assert.match(js, /ah-kind-supplemental/, 'runtime must classify selected supplemental detail');

assert.match(css, /label\[data-ah-v5-type-filter="sync-only"\]\s*\{[\s\S]*display:\s*grid\s*!important/, 'the Loại lớp selector should stay visible like the approved mockup');
assert.match(css, /\.ah-mockup-filterbar\s*\{[\s\S]*border:\s*1px\s+solid\s+#[0-9a-fA-F]{6}\s*!important/, 'primary activity selector should keep its subtle outlined container');
assert.match(css, /\.ah-mockup-filterbar__hint\s*\{[\s\S]*color:\s*#6f829c\s*!important/, 'desktop helper hint should be readable rather than washed out');
assert.match(css, /grid-template-columns:\s*minmax\(430px,\s*490px\)/, 'desktop list rail should be slightly slimmer to give the detail panel more room');
assert.match(css, /\.ahv3__hero\s*\{[\s\S]*padding:\s*16px\s+245px\s+15px\s+20px\s*!important/, 'hero should reserve less dead space for artwork and actions');
assert.match(css, /\.ahv3__hero h2\s*\{[\s\S]*white-space:\s*nowrap\s*!important/, 'desktop hero titles should not orphan the class number onto its own line');
assert.match(css, /\.ahv3__hero h2\s*\{[\s\S]*font-size:\s*clamp\(26px,\s*1\.9vw,\s*32px\)\s*!important/, 'hero title should be slightly more compact while preserving hierarchy');
assert.match(css, /\.ahv3__actions button\s*\{[\s\S]*min-height:\s*34px\s*!important/, 'hero actions should be visually quieter and more compact');
assert.match(css, /\.ahv3__filters select,[\s\S]*\.ahv3__date-filters input\s*\{[\s\S]*background:\s*#fbfdff\s*!important/, 'filter and date controls should use the softer final-polish surface');
assert.match(css, /\.ahv3__date-filters input\s*\{[\s\S]*font-variant-numeric:\s*tabular-nums\s*!important/, 'date fields should use stable numeric rhythm');
assert.match(css, /\.ahv3__audit-actor-panel\s*\{[\s\S]*margin-top:\s*12px\s*!important/, 'audit panel should have clearer separation from attendance statistics');
assert.match(css, /\.ahv3__info-grid\s*>\s*article\s*\{[\s\S]*border:\s*1px\s+solid\s+#[0-9a-fA-F]{6}\s*!important/, 'detail info tiles should keep subtle white-card borders');
assert.match(css, /\.ahv3__info-grid\s*>\s*article\s*\{[\s\S]*background:\s*#fff\s*!important/, 'detail info tiles should stay on white surfaces');
assert.match(css, /\.ahv3__number\[data-ah-v6-activity-icon\]/, 'activity icon bubbles must receive dedicated styling');
assert.match(css, /\.ahv3__hero-meta/, 'hero metadata row must be styled');
assert.match(css, /\[data-ah-v6-hero-art\]/, 'hero academic artwork must be positioned and styled');
assert.match(css, /\.ahv3__hero\.ah-kind-remedial/, 'selected remedial hero must have a type-specific accent');
assert.match(css, /\.ahv3__hero\.ah-kind-gifted/, 'selected gifted hero must have a type-specific accent');
assert.match(css, /\.ahv3__hero\.ah-kind-supplemental/, 'selected supplemental hero must have a type-specific accent');

console.log('attendance-history-v6.1 final-polish contract: ok');
