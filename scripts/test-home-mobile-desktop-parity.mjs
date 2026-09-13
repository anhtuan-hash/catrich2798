import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const pagePath = 'src/pages/HomeApproved.jsx';
const cssPath = 'src/styles/HomeMobileDesktopParity.css';

const page = readFileSync(pagePath, 'utf8');

assert.equal(
  page.includes("../components/mobile/MobileHomeView.jsx"),
  false,
  'HomeApproved must not import a separate MobileHomeView homepage.'
);
assert.equal(
  page.includes("../hooks/usePresentationMode.js"),
  false,
  'HomeApproved must not branch its content tree by presentation mode.'
);
assert.equal(
  page.includes("presentation.presentationMode === 'mobile'"),
  false,
  'HomeApproved must render one shared homepage tree on desktop and mobile.'
);
assert.match(page, /HomeHeroExperience2026/, 'Shared homepage must retain the desktop hero.');
assert.match(page, /className="bha-practice/, 'Shared homepage must retain weekly practice.');
assert.match(page, /className="bha-tools"/, 'Shared homepage must retain featured tools.');
assert.match(
  page,
  /import ['"]\.\.\/styles\/HomeMobileDesktopParity\.css['"];/,
  'HomeApproved must load the mobile parity overrides.'
);

assert.equal(existsSync(cssPath), true, 'Mobile parity stylesheet must exist.');
const css = readFileSync(cssPath, 'utf8');
assert.match(css, /@media\s*\(max-width:\s*620px\)/, 'Phone layout must have an explicit <=620px breakpoint.');
assert.match(css, /\.bha-top[^}]*display:\s*contents/s, 'Mobile layout must flatten the top wrapper so sections can be reordered.');
assert.match(css, /\.bha-hero[^}]*order:\s*1/s, 'Hero must be the first main mobile section.');
assert.match(css, /\.bha-practice[^}]*order:\s*2/s, 'Weekly practice must come before featured tools on mobile.');
assert.match(css, /\.bha-tools[^}]*order:\s*3/s, 'Featured tools must follow weekly practice on mobile.');

console.log('Home mobile/desktop parity contract passed.');
