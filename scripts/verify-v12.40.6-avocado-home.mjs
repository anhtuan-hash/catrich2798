import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const homeSource = fs.readFileSync('src/pages/Home.jsx', 'utf8');
const homeCss = fs.readFileSync('src/pages/HomeV12406.css', 'utf8').toLowerCase();

assert.equal(packageJson.version, '12.40.6');
assert.match(homeSource, /import ['"]\.\/HomeV12406\.css['"]/);
assert.match(homeSource, /data-home-theme="avocado-raised"/);
assert.match(homeSource, /home-v12406/);
assert.equal(fs.existsSync('src/pages/HomeV1215.css'), false, 'Legacy homepage CSS must be removed');

for (const requiredToken of [
  '#b2c248',
  '.flat-window-grammar',
  '.flat-window-textcare',
  '.flat-window-main',
  '.flat-window-game',
  '.flat-window-word',
  '.flat-pinned-apps',
  '@media (max-width: 1060px)',
  '@media (prefers-reduced-motion: reduce)',
]) {
  assert.equal(homeCss.includes(requiredToken), true, `Homepage CSS is missing ${requiredToken}`);
}

for (const manifestPath of ['public/version.json', 'public/release-manifest.json']) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.version, '12.40.6');
  assert.equal(manifest.homepageTheme, 'avocado-raised');
  assert.equal(manifest.homepagePrimaryColor, '#B2C248');
  assert.equal(manifest.homepageDimensionalCards, true);
}

console.log('V12.40.6 Avocado Raised Home checks passed.');
