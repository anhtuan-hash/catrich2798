import fs from 'node:fs';
import assert from 'node:assert/strict';

const footerUrl = new URL('../src/components/Footer.jsx', import.meta.url);
const footerCssUrl = new URL('../src/components/FooterCompactDisclosure.css', import.meta.url);

const footer = fs.readFileSync(footerUrl, 'utf8');
const footerCss = fs.readFileSync(footerCssUrl, 'utf8');

assert.doesNotMatch(footer, /useState\s*\(/, 'Footer must not keep collapse/expand state');
assert.doesNotMatch(footer, /aria-expanded=/, 'Footer must not expose a collapse control');
assert.doesNotMatch(footer, /data-expanded=/, 'Footer must not have collapsed/expanded variants');
assert.doesNotMatch(footer, /signature-footer-disclosure-action/, 'Footer must not render the collapse/expand action or chevron');
assert.doesNotMatch(footer, /collapseLabel|detailsLabel/, 'Footer copy must not contain collapse/expand labels');
assert.doesNotMatch(footer, /\{\s*expanded\s*\?/, 'Footer detail panel must not be conditionally hidden');
assert.match(footer, /className="signature-footer-static-summary"/, 'Footer must render a non-interactive static summary bar');
assert.match(footer, /<div[^>]*className="signature-footer-expanded-panel">/, 'Footer detail panel must render unconditionally');

assert.doesNotMatch(footerCss, /\[data-expanded=/, 'Footer CSS must not depend on collapse state');
assert.doesNotMatch(footerCss, /signature-footer-disclosure-action/, 'Footer CSS must not style a removed collapse action');
assert.match(footerCss, /\.signature-footer-static-summary\s*\{/, 'Footer CSS must style the permanent summary bar');

console.log('Footer always-expanded contract OK');
