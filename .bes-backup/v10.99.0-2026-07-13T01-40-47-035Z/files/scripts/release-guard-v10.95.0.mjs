import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const failures = [];
const warnings = [];
const mustExist = [
  'index.html','package.json','package-lock.json','vercel.json','src/main.jsx','src/pages/PlatformReadiness.jsx','src/styles/v1095.css',
  'src/utils/accessibility.js','src/utils/pwa.js','src/utils/platformReadiness.js','src/utils/webVitals.js',
  'src/components/GlobalAccessibilityAnnouncer.jsx','src/components/PwaUpdateBanner.jsx','public/manifest.webmanifest','public/sw.js','public/offline.html',
  'public/pwa/icon-192.png','public/pwa/icon-512.png','public/pwa/maskable-192.png','public/pwa/maskable-512.png',
  'public/version.json','public/bes-release-v10.95.0.json','public/bes-modules-v10.95.0.json','public/bes-feature-flags-v10.95.0.json',
  'public/bes-migrations-v10.95.0.json','public/bes-platform-build-v10.95.0.json','public/bes-platform-control-v10950.js',
];
for (const file of mustExist) if (!fs.existsSync(path.join(root, file))) failures.push(`Missing ${file}`);
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!index.includes('bes-app-version" content="10.95.0"')) failures.push('Index version meta mismatch.');
if ((index.match(/bes-platform-control-v10950\.js/g) || []).length !== 1) failures.push('V10.95 Platform Control runtime must appear once.');
if ((index.match(/manifest\.webmanifest/g) || []).length !== 1) failures.push('PWA manifest link must appear once.');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.version !== '10.95.0') failures.push('package.json version mismatch.');
if (!pkg.scripts?.['verify:v10.95']) failures.push('verify:v10.95 missing.');
const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
if (/Authorization|apikey|supabase\.co/i.test(sw)) failures.push('Service worker must not cache or embed auth/API credentials.');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8'));
if (manifest.display !== 'standalone') failures.push('PWA display must be standalone.');
if (!Array.isArray(manifest.icons) || manifest.icons.length < 4) failures.push('PWA icon set is incomplete.');
const fonts = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','dist','.git','.bes-backup'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ttf|otf|woff2?)$/i.test(entry.name)) fonts.push(path.relative(root, full));
  }
}
walk(root);
if (fonts.length) warnings.push(`Font files must be excluded from deliverable ZIP: ${fonts.join(', ')}`);
for (const message of failures) console.error(`FAIL  ${message}`);
for (const message of warnings) console.warn(`WARN  ${message}`);
if (!failures.length) console.log('V10.95 release guard passed.');
console.log(`Failures: ${failures.length} · Warnings: ${warnings.length}`);
if (failures.length) process.exit(1);
