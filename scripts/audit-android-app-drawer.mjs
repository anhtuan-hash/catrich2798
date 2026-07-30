import fs from 'node:fs';

const css = fs.readFileSync('src/styles/apps-android-drawer.css', 'utf8');
const wrapper = fs.readFileSync('src/pages/WebAppsAndroidDrawer.jsx', 'utf8');
const entry = fs.readFileSync('src/pages/WebApps.jsx', 'utf8');

const checks = [
  ['auto-fill responsive grid', /grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(/.test(css)],
  ['comfortable grid spacing', /gap:\s*clamp\(26px/.test(css)],
  ['icon-led app tile', /\.flat-app-window-art[\s\S]*width:\s*88px/.test(css)],
  ['window chrome hidden in browse mode', /\.flat-app-window-chrome[\s\S]*display:\s*none/.test(css)],
  ['editing mode preserved', /\.is-launcher-edit-mode\s+\.apps-directory-grid-native/.test(css)],
  ['tablet layout', /@media \(max-width:\s*820px\)/.test(css)],
  ['mobile layout', /@media \(max-width:\s*560px\)/.test(css)],
  ['keyboard focus visible', /:focus-visible/.test(css)],
  ['reduced motion supported', /prefers-reduced-motion/.test(css)],
  ['wrapper imports final stylesheet', /apps-android-drawer\.css/.test(wrapper)],
  ['apps entry uses wrapper', /WebAppsAndroidDrawer/.test(entry)],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? '✓' : '✗'} ${name}`);
if (failed.length) {
  console.error(`Android app drawer audit failed: ${failed.map(([name]) => name).join(', ')}`);
  process.exit(1);
}
console.log('Android app drawer audit passed.');
