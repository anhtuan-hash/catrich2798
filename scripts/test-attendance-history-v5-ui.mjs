import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../public/attendance-history-v5.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/attendance-history-v5.css', import.meta.url), 'utf8');

assert.match(index, /attendance-history-v5\.css\?v=2/, 'refined history CSS must use a fresh cache version');
assert.match(index, /attendance-history-v5\.js\?v=2/, 'refined history runtime must use a fresh cache version');

assert.match(js, /data-ah-v5-type-filter/, 'runtime must tag the native type select as a sync-only control');
assert.match(js, /ah-kind-remedial/, 'runtime must classify selected remedial detail');
assert.match(js, /ah-kind-gifted/, 'runtime must classify selected gifted detail');
assert.match(js, /ah-kind-supplemental/, 'runtime must classify selected supplemental detail');

assert.match(css, /\[data-ah-v5-type-filter="sync-only"\]/, 'native duplicate type selector must be visually hidden');
assert.match(css, /grid-template-columns:\s*minmax\(360px,\s*430px\)/, 'desktop list column must be slimmer');
assert.match(css, /\.ah-mockup-filterbar__hint\s*\{[\s\S]*display:\s*none\s*!important/, 'helper hint should be removed from the primary filter bar');
assert.match(css, /\.ahv3__info-grid\s*>\s*article\s*\{[\s\S]*border:\s*0\s*!important/, 'detail info tiles should not look like nested bordered boxes');
assert.match(css, /\.ahv3__stat-grid\s*>\s*article\s*\{[\s\S]*border:\s*0\s*!important/, 'summary tiles should use tonal surfaces instead of outlines');
assert.match(css, /\.ah-mockup-empty-art\s*\{[\s\S]*width:\s*220px/, 'empty-state illustration must be reduced');
assert.match(css, /\.ahv3__hero\.ah-kind-remedial/, 'selected remedial hero must have a type-specific accent');
assert.match(css, /\.ahv3__hero\.ah-kind-gifted/, 'selected gifted hero must have a type-specific accent');
assert.match(css, /\.ahv3__hero\.ah-kind-supplemental/, 'selected supplemental hero must have a type-specific accent');

console.log('attendance-history-v5 refined UI contract: ok');
