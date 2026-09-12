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
].join('\n');

assert.match(index, /attendance-history-v5\.css\?v=2[\s\S]*attendance-history-pixel-v6\.css\?v=1/, 'pixel-match CSS must load after the stable v5 layer');
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

assert.match(css, /label\[data-ah-v5-type-filter="sync-only"\]\s*\{[\s\S]*display:\s*grid\s*!important/, 'the Loại lớp selector should be visible again because it appears in the approved mockup');
assert.match(css, /\.ah-mockup-filterbar\s*\{[\s\S]*border:\s*1px\s+solid\s+#[0-9a-fA-F]{6}\s*!important/, 'primary activity selector should regain a subtle outlined container');
assert.match(css, /\.ah-mockup-filterbar__hint\s*\{[\s\S]*display:\s*inline-flex\s*!important/, 'desktop helper hint should be visible like the mockup');
assert.match(css, /grid-template-columns:\s*minmax\(455px,\s*520px\)/, 'desktop list rail should return to the wider mockup proportion');
assert.match(css, /\.ahv3__info-grid\s*>\s*article\s*\{[\s\S]*border:\s*1px\s+solid\s+#[0-9a-fA-F]{6}\s*!important/, 'detail info tiles should use subtle white-card borders');
assert.match(css, /\.ahv3__info-grid\s*>\s*article\s*\{[\s\S]*background:\s*#fff\s*!important/, 'detail info tiles should return to white surfaces');
assert.match(css, /\.ahv3__number\[data-ah-v6-activity-icon\]/, 'activity icon bubbles must receive dedicated styling');
assert.match(css, /\.ahv3__hero-meta/, 'hero metadata row must be styled');
assert.match(css, /\[data-ah-v6-hero-art\]/, 'hero academic artwork must be positioned and styled');
assert.match(css, /\.ahv3__hero\.ah-kind-remedial/, 'selected remedial hero must have a type-specific accent');
assert.match(css, /\.ahv3__hero\.ah-kind-gifted/, 'selected gifted hero must have a type-specific accent');
assert.match(css, /\.ahv3__hero\.ah-kind-supplemental/, 'selected supplemental hero must have a type-specific accent');
assert.match(css, /\.ahv3__hero h2\s*\{[\s\S]*font-size:\s*clamp\(27px/, 'hero title hierarchy should be stronger and closer to the mockup');

console.log('attendance-history-v6 pixel-match contract: ok');
