import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge = fs.readFileSync('src/components/GlobalWorkHubViewportModalBridge.jsx', 'utf8');
const anchor = fs.readFileSync('src/components/GlobalWorkHubModalAnchor.css', 'utf8');
const navigation = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');

assert.match(bridge, /lastAnchorRect = rectSnapshot\(openButton\)/);
assert.match(bridge, /--work-hub-modal-left/);
assert.match(bridge, /--work-hub-modal-top/);
assert.match(bridge, /--work-hub-modal-max-height/);
assert.match(bridge, /preferredTop = anchor\.top - 140/);
assert.match(bridge, /minimumUsefulHeight/);
assert.match(anchor, /work-hub-modal-is-anchored/);
assert.match(anchor, /position:fixed!important/);
assert.match(anchor, /top:var\(--work-hub-modal-top/);
assert.match(anchor, /left:var\(--work-hub-modal-left/);
assert.match(anchor, /content-visibility:visible!important/);
assert.match(anchor, /@media \(max-width:680px\)/);
assert.ok(
  navigation.indexOf("import './GlobalWorkHubModalAnchor.css';")
    > navigation.indexOf("import './GlobalWorkHubViewportModalFinal.css';"),
  'anchor stylesheet must load after the final modal stylesheet',
);

console.log('Work Hub click-anchored modal contract passed.');
