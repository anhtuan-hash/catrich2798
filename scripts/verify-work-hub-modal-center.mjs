import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync('src/components/GlobalWorkHubModalCenter.css', 'utf8');
const navigation = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');

assert.match(css, /display:grid!important/);
assert.match(css, /place-items:center!important/);
assert.match(css, /align-content:center!important/);
assert.match(css, /justify-content:center!important/);
assert.match(css, /position:relative!important/);
assert.match(css, /top:auto!important/);
assert.match(css, /left:auto!important/);
assert.match(css, /align-self:center!important/);
assert.match(css, /justify-self:center!important/);
assert.match(css, /transform-origin:50% 50%!important/);

const anchorIndex = navigation.indexOf("import './GlobalWorkHubModalAnchor.css';");
const centerIndex = navigation.indexOf("import './GlobalWorkHubModalCenter.css';");
assert.ok(anchorIndex >= 0, 'Anchor stylesheet import missing');
assert.ok(centerIndex > anchorIndex, 'Center stylesheet must load after anchor rules');

console.log('Work Hub modal center contract passed.');
