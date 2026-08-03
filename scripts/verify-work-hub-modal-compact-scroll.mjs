import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync('src/components/GlobalWorkHubModalAnchor.css', 'utf8');

assert.match(css, /width:min\(580px,calc\(100vw - 40px\)\)!important/);
assert.match(css, /max-height:min\(var\(--work-hub-modal-max-height,calc\(100dvh - 120px\)\),640px\)!important/);
assert.match(css, /overflow-y:scroll!important/);
assert.match(css, /scrollbar-width:thin!important/);
assert.match(css, /scrollbar-gutter:stable!important/);
assert.match(css, /z-index:2147483647!important/);
assert.match(css, /isolation:isolate!important/);
assert.match(css, /background:#fff!important/);
assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
assert.match(css, /outline:0!important/);
assert.match(css, /work-hub-decoration/);
assert.match(css, /\[class\*="ornament"\]/);
assert.match(css, /\[class\*="decoration"\]/);
assert.match(css, /@media \(max-width:680px\)/);

console.log('Work Hub compact scrollable modal contract passed.');
