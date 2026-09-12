import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../public/attendance-history-v5.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/attendance-history-v5.css', import.meta.url), 'utf8');

assert.match(index, /attendance-history-v5\.css\?v=3/, 'pixel-match History CSS must use a fresh cache version');
assert.match(index, /attendance-history-v5\.js\?v=3/, 'pixel-match History runtime must use a fresh cache version');

assert.match(js, /data-ah-v5-type-filter/, 'runtime must keep the native type select as a sync-only control');
assert.match(js, /data-ah-v6-activity-icon/, 'runtime must decorate list cards with activity-specific icons');
assert.match(js, /decorateActivityIcons/, 'runtime must own activity icon decoration');
assert.match(js, /data-ah-v6-hero-meta/, 'runtime must ensure the selected hero exposes mockup-style metadata');
assert.match(js, /ensureHeroMetadata/, 'runtime must restore hero metadata when the host DOM omits it');
assert.match(js, /ah-kind-remedial/, 'runtime must classify selected remedial detail');
assert.match(js, /ah-kind-gifted/, 'runtime must classify selected gifted detail');
assert.match(js, /ah-kind-supplemental/, 'runtime must classify selected supplemental detail');

assert.match(css, /\[data-ah-v5-type-filter="sync-only"\]/, 'native duplicate type selector must stay visually hidden');
assert.match(css, /\.ah-mockup-filterbar\s*\{[\s\S]*border:\s*1px\s+solid\s+#[0-9a-fA-F]{6}\s*!important/, 'primary activity selector should regain a subtle outlined container');
assert.match(css, /\.ah-mockup-filterbar__hint\s*\{[\s\S]*display:\s*inline-flex\s*!important/, 'desktop helper hint should be visible like the mockup');
assert.match(css, /\.ahv3__info-grid\s*>\s*article\s*\{[\s\S]*border:\s*1px\s+solid\s+#[0-9a-fA-F]{6}\s*!important/, 'detail info tiles should use subtle white-card borders');
assert.match(css, /\.ahv3__info-grid\s*>\s*article\s*\{[\s\S]*background:\s*#fff\s*!important/, 'detail info tiles should return to white surfaces');
assert.match(css, /\.ahv3__number\[data-ah-v6-activity-icon\]/, 'activity icon bubbles must receive dedicated styling');
assert.match(css, /\.ahv3__hero-meta/, 'hero metadata row must be styled');
assert.match(css, /\.ahv3__hero\.ah-kind-remedial/, 'selected remedial hero must have a type-specific accent');
assert.match(css, /\.ahv3__hero\.ah-kind-gifted/, 'selected gifted hero must have a type-specific accent');
assert.match(css, /\.ahv3__hero\.ah-kind-supplemental/, 'selected supplemental hero must have a type-specific accent');
assert.match(css, /\.ahv3__hero h2\s*\{[\s\S]*font-size:\s*clamp\(27px/, 'hero title hierarchy should be stronger and closer to the mockup');

console.log('attendance-history-v6 pixel-match contract: ok');
