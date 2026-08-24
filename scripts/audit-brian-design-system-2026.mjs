import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { throw new Error(`[BrianDesignSystem2026] ${message}`); };
const expect = (condition, message) => { if (!condition) fail(message); };

const indexCss = read('src/index.css');
const designSystem = read('src/styles/BrianDesignSystem2026.css');
const burs = read('src/utils/bursReadability.js');
const versionTail = read('src/styles/v1159.css');
const retiredLoader = read('public/remove-floating-chatbot-launcher.js');

/* Load order: the Design System must enter through v1159, which is the last
   static version stylesheet imported by main.jsx. */
expect(!indexCss.includes('BrianDesignSystem2026.css'), 'Design System must not load early from index.css.');
expect(versionTail.trimStart().startsWith("@import './BrianDesignSystem2026.css';"), 'v1159.css must load the Design System first.');

for (const token of [
  '--bes-ds-display', '--bes-ds-page-title', '--bes-ds-section-title',
  '--bes-ds-card-title', '--bes-ds-body', '--bes-ds-support', '--bes-ds-caption',
  '--bes-ds-control', '--bes-ds-kpi', '--bes-ds-reader',
]) {
  expect(designSystem.includes(token), `Missing Design System token: ${token}`);
}
expect(designSystem.includes('#bes-main-content'), 'Design System must use the stable main-content anchor.');
expect(designSystem.includes('data-brian-ds="2026"'), 'Design System activation marker is missing.');

const forbiddenBursRuntime = ['MutationObserver', 'createTreeWalker', 'style.textContent', "document.createElement('style')"];
for (const token of forbiddenBursRuntime) {
  expect(!burs.includes(token), `BURS runtime still contains retired typography behavior: ${token}`);
}
expect(burs.includes("root.style.setProperty('--bes-ds-scale'"), 'BURS must scale only the Design System token.');
expect(burs.includes("root.style.setProperty('font-size', '100%', 'important')"), 'Root font-size lock is missing.');
expect(burs.includes("shell.setAttribute('data-brian-ds', '2026')"), 'Application shell activation is missing.');

/* v1159 can import the Design System but may no longer define typography itself. */
const versionTailWithoutImport = versionTail.replace(/^\s*@import[^;]+;\s*/u, '');
const forbiddenLegacyTypography = /\b(font-size|font-family|line-height|letter-spacing)\s*:/i;
expect(!forbiddenLegacyTypography.test(versionTailWithoutImport), 'v1159.css still defines legacy typography.');

/* The former runtime terminal layer must be gone, not merely overridden. */
expect(!exists('public/dashboard-typography-terminal-2026.css'), 'Retired terminal typography stylesheet still exists.');
expect(!retiredLoader.includes('bes-dashboard-typography-terminal-2026'), 'Retired terminal typography loader still exists.');
expect(!retiredLoader.includes('dashboard-typography-terminal-2026.css'), 'Runtime still references retired terminal typography.');

const routeContracts = [
  ['dashboard', '.gd-hero-copy'],
  ['home', '.hero-cms__content'],
  ['apps', '.apps-directory-hero-copy'],
  ['news', '.newsroom-v823-hero'],
  ['games', '.games-v44-hero-copy'],
  ['homeroom', '.hr-material-hero__class-row'],
  ['admin', '.admin-v41-hero-copy'],
  ['reports', '.mr-shell'],
];
for (const [route, selector] of routeContracts) {
  expect(designSystem.includes(selector), `Missing ${route} semantic contract: ${selector}`);
}

/* Validate selectors against the component that is actually rendered. This
   prevents stale classes elsewhere in the repository from producing a false PASS. */
const componentContracts = [
  ['dashboard', 'src/pages/WorkDashboard.jsx', 'gd-hero-copy'],
  ['home', 'src/components/HomeHeroExperience2026.jsx', 'hero-cms__content'],
  ['apps', 'src/pages/appsDirectoryComponents.jsx', 'apps-directory-hero-copy'],
  ['news', 'src/pages/NewsReader.jsx', 'newsroom-v823-hero'],
  ['games', 'src/pages/Games.jsx', 'games-v44-hero-copy'],
  ['homeroom', 'src/components/homeroom/HomeroomGlassHero.jsx', 'hr-material-hero__class-row'],
  ['admin', 'src/pages/AdminPage.jsx', 'admin-v41-hero-copy'],
  ['reports', 'src/pages/MonthlyReportsWorkspace.jsx', 'mr-shell'],
];
for (const [route, file, token] of componentContracts) {
  const source = read(file);
  expect(source.includes(token), `${route} contract token ${token} is missing from ${file}.`);
}

/* The current React shell must expose both anchors used by the contract. */
const main = read('src/main.jsx');
expect(main.includes('className="app-shell metro-shell metro-clean-system"'), 'Application shell class contract changed.');
expect(main.includes('id="bes-main-content"'), 'Main-content anchor changed.');

console.log('Brian Design System 2026 audit: PASS');
