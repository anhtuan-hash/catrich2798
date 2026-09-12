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
  readOptional('../public/attendance-history-perfect-polish-v6-2.css'),
  readOptional('../public/attendance-card-size-sync-v1.css'),
].join('\n');

assert.match(index, /attendance-history-v5\.css\?v=2[\s\S]*attendance-history-pixel-v6\.css\?v=1[\s\S]*attendance-history-final-polish-v6-1\.css\?v=1[\s\S]*attendance-history-perfect-polish-v6-2\.css\?v=1[\s\S]*attendance-card-size-sync-v1\.css\?v=1/, 'shared sizing CSS must load after the perfect-polish History layer');
assert.match(index, /attendance-history-mockup-v4\.js\?v=2[\s\S]*attendance-history-v5\.js\?v=3[\s\S]*attendance-history-pixel-v6\.js\?v=1/, 'cleanup-aware History runtimes must load before the pixel-match runtime');

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
assert.match(css, /\.ah-mockup-filterbar__hint\s*\{[\s\S]*color:\s*#6f829c\s*!important/, 'desktop helper hint should remain readable');
assert.match(css, /grid-template-columns:\s*minmax\(430px,\s*490px\)/, 'desktop list rail should preserve the polished proportion');
assert.match(css, /\.ahv3__hero h2\s*\{[\s\S]*white-space:\s*nowrap\s*!important/, 'desktop hero titles should not orphan the class number');
assert.match(css, /\.ahv3__actions button\s*\{[\s\S]*min-height:\s*34px\s*!important/, 'hero actions should remain compact');
assert.match(css, /\.ahv3__filters select,[\s\S]*\.ahv3__date-filters input\s*\{[\s\S]*background:\s*#fbfdff\s*!important/, 'filter and date controls should keep the softer surface');
assert.match(css, /\.ahv3__date-filters input\s*\{[\s\S]*font-variant-numeric:\s*tabular-nums\s*!important/, 'date fields should use stable numeric rhythm');

assert.match(css, /button\.is-selected\.ah-kind-remedial[\s\S]*border-color:\s*#f5b98f\s*!important/, 'selected remedial card should use a softer premium border');
assert.match(css, /button\.is-selected\.ah-kind-gifted[\s\S]*border-color:\s*#a9cdfc\s*!important/, 'selected gifted card should use a softer premium border');
assert.match(css, /button\.is-selected\.ah-kind-supplemental[\s\S]*border-color:\s*#a9ddbb\s*!important/, 'selected supplemental card should use a softer premium border');
assert.match(css, /\[data-ah-v6-hero-art\][\s\S]*bottom:\s*0\s*!important[\s\S]*opacity:\s*\.86\s*!important/, 'hero artwork should sit slightly higher and read more clearly');
assert.match(css, /\.ahv3__stat-grid\s*>\s*article\s*\{[\s\S]*min-height:\s*70px\s*!important/, 'summary cards should be slightly shorter to reveal the audit panel');
assert.match(css, /\.ahv3__audit-actor-panel\s*\{[\s\S]*margin-top:\s*10px\s*!important/, 'audit panel should stay comfortably separated without wasting vertical space');
assert.match(css, /\.ahv3__info-grid\s*>\s*article\s*\{[\s\S]*border:\s*1px\s+solid\s+#[0-9a-fA-F]{6}\s*!important/, 'detail info tiles should keep subtle white-card borders');
assert.match(css, /\.ahv3__info-grid\s*>\s*article\s*\{[\s\S]*background:\s*#fff\s*!important/, 'detail info tiles should stay on white surfaces');
assert.match(css, /\.ahv3__number\[data-ah-v6-activity-icon\]/, 'activity icon bubbles must receive dedicated styling');
assert.match(css, /\.ahv3__hero-meta/, 'hero metadata row must be styled');
assert.match(css, /\[data-ah-v6-hero-art\]/, 'hero academic artwork must be positioned and styled');
assert.match(css, /\.ahv3__hero\.ah-kind-remedial/, 'selected remedial hero must have a type-specific accent');
assert.match(css, /\.ahv3__hero\.ah-kind-gifted/, 'selected gifted hero must have a type-specific accent');
assert.match(css, /\.ahv3__hero\.ah-kind-supplemental/, 'selected supplemental hero must have a type-specific accent');

console.log('attendance-history-v6.2 perfect-polish contract: ok');
