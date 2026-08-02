import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync('src/components/GlobalWorkHubViewportModalFinal.css', 'utf8');
const navigation = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');

assert.match(css, /width:min\(620px,calc\(100vw - 32px\)\)!important/);
assert.match(css, /max-height:min\(76dvh,720px\)!important/);
assert.match(css, /border-radius:30px!important/);
assert.match(css, /background:#fbfcf6!important/);
assert.match(css, /backdrop-filter:blur\(10px\)!important/);
assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
assert.match(css, /grid-template-columns:\.72fr 1\.08fr 1\.2fr!important/);
assert.match(css, /work-delivery-danger-zone/);
assert.match(css, /work-delivery-submission-box/);
assert.match(css, /v1093-comments>form/);
assert.match(css, /@media \(max-width:680px\)/);
assert.match(navigation, /GlobalWorkHubViewportModalFinal\.css/);

console.log('Compact Work Hub weekly-modal contract passed.');
