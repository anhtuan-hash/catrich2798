import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge = fs.readFileSync('src/components/GlobalWorkHubViewportModalBridge.jsx', 'utf8');
const css = fs.readFileSync('src/components/GlobalWorkHubModalAnchor.css', 'utf8');

assert.match(bridge, /neutralizeAncestorContainingBlocks/);
assert.match(bridge, /offsetParent\.getBoundingClientRect/);
assert.match(bridge, /--work-hub-backdrop-top/);
assert.match(bridge, /--work-hub-backdrop-left/);
assert.match(bridge, /--work-hub-viewport-width/);
assert.match(bridge, /--work-hub-viewport-height/);
assert.match(bridge, /lastAnchorRect = rectSnapshot\(openButton\)/);
assert.match(bridge, /preferredTop = anchor\.top/);
assert.match(css, /position:absolute!important/);
assert.match(css, /top:var\(--work-hub-backdrop-top/);
assert.match(css, /height:var\(--work-hub-viewport-height/);
assert.match(css, /top:var\(--work-hub-modal-top/);
assert.match(css, /left:var\(--work-hub-modal-left/);
assert.doesNotMatch(css, /work-hub-modal-is-anchored[^}]*position:fixed!important/s);

console.log('Work Hub current viewport modal contract passed.');
