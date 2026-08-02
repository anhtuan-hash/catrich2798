import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge = fs.readFileSync('src/components/GlobalWorkHubViewportModalBridge.jsx', 'utf8');
const finalStyles = fs.readFileSync('src/components/GlobalWorkHubViewportModalFinal.css', 'utf8');
const navigation = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');

assert.match(bridge, /querySelectorAll\(BACKDROP_SELECTOR\)/);
assert.match(bridge, /findWorkHubModal/);
assert.match(bridge, /OPEN_BUTTON_SELECTOR/);
assert.match(bridge, /dispatchEvent\(new MouseEvent\('click'/);
assert.match(bridge, /document\.addEventListener\('click', handleOpenClick, true\)/);
assert.match(finalStyles, /opacity:1!important/);
assert.match(finalStyles, /visibility:visible!important/);
assert.match(finalStyles, /pointer-events:auto!important/);
assert.match(finalStyles, /z-index:2147483000!important/);
assert.match(finalStyles, /\.v1093-work-hub>\.v1093-drawer-backdrop/);
assert.match(navigation, /GlobalNavigationOverlayLayer\.css';\n\/\/ The Work Hub modal visibility contract/);
assert.match(navigation, /GlobalWorkHubViewportModalFinal\.css/);

console.log('Work Hub modal opening regression guard passed.');
