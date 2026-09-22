import fs from 'node:fs';
import assert from 'node:assert/strict';

const bar = fs.readFileSync('src/components/BrianNewswireBar.jsx', 'utf8');
const css = fs.readFileSync('src/components/BrianNewswireBar.css', 'utf8');
const slot = fs.readFileSync('src/components/GlobalEditorialBriefBar.jsx', 'utf8');
const nav = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');
const reader = fs.readFileSync('src/pages/NewsReader.jsx', 'utf8');

assert.match(bar, /fetch\('\/api\/news-feed\?language=vi&category=all'\)/);
assert.match(bar, /ROTATE_MS = 6500/);
assert.match(bar, /onMouseEnter=\{\(\) => setHovered\(true\)\}/);
assert.match(bar, /setPaused\(\(value\) => !value\)/);
assert.match(bar, /bes-newswire-open-item/);
assert.match(bar, /window\.location\.hash = '#\/news'/);
assert.match(bar, /Xem tất cả/);
assert.match(bar, /aria-label=\{t\.prev\}/);
assert.match(bar, /aria-label=\{paused \? t\.play : t\.pause\}/);
assert.match(bar, /aria-label=\{t\.next\}/);

assert.match(css, /font-family:var\(--bes-font-newswire,var\(--bes-global-font-family,inherit\)\)/);
assert.match(css, /backdrop-filter:blur\(20px\)/);
assert.match(css, /@media\(max-width:620px\)/);
assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
assert.equal(css.includes('marquee'), false, 'newswire must not use legacy marquee motion');

assert.match(slot, /<BrianNewswireBar language=\{language\} \/>/);
assert.match(slot, /if \(!currentUser \|\| HIDDEN_ROUTES\.has\(route\)\) return null/);
assert.match(nav, /!mobile \? <GlobalEditorialBriefBar route=\{props\.route\} language=\{props\.language\} currentUser=\{props\.currentUser\} \/> : null/);

assert.match(reader, /NEWSWIRE_OPEN_ITEM_KEY = 'bes-newswire-open-item-v1'/);
assert.match(reader, /window\.addEventListener\('bes-newswire-open-item'/);
assert.match(reader, /openArticle\(item\)/);

console.log('Global Brian Newswire contract: PASS');
