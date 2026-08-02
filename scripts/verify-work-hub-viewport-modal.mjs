import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge = fs.readFileSync('src/components/GlobalWorkHubViewportModalBridge.jsx', 'utf8');
const styles = fs.readFileSync('src/components/GlobalWorkHubViewportModal.css', 'utf8');
const navigation = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');

assert.match(bridge, /\.v1093-drawer-backdrop/);
assert.match(bridge, /\.work-delivery-drawer/);
assert.match(bridge, /aria-modal/);
assert.match(bridge, /event\.key === 'Escape'/);
assert.match(bridge, /event\.key !== 'Tab'/);
assert.match(bridge, /MutationObserver/);
assert.match(bridge, /work-hub-viewport-modal-open/);
assert.match(styles, /position:fixed!important/);
assert.match(styles, /place-items:center!important/);
assert.match(styles, /max-height:min\(86dvh,900px\)!important/);
assert.match(styles, /overflow-y:auto!important/);
assert.match(styles, /width:min\(780px,calc\(100vw - 36px\)\)!important/);
assert.match(styles, /@media \(max-width:720px\)/);
assert.match(navigation, /GlobalWorkHubViewportModalBridge/);
assert.match(navigation, /GlobalWorkHubViewportModal\.css/);

console.log('Work Hub viewport modal contract passed.');
