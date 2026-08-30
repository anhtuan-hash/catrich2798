import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const runtime = read('src/components/GlobalEditorialAuthorityRuntime.jsx');
const navigation = read('src/components/GlobalFlatNavigation.jsx');
const main = read('src/main.jsx');
const stage6 = read('src/styles/BrianStage6Polish.css');

const failures = [];
const requireText = (source, value, label) => {
  if (!source.includes(value)) failures.push(`${label}: missing ${value}`);
};

// Final authority order is explicit and Stage 6 remains the last visual layer.
for (const token of [
  'GlobalEditorialAuthority2026.css?inline',
  'GlobalNavigationFinal2026.css?inline',
  'BrianStage5Migration.css?inline',
  'BrianStage5WorkflowMigration.css?inline',
  'BrianStage6Polish.css?inline',
]) {
  requireText(runtime, token, 'editorial authority runtime');
}

const authorityOrder = [
  runtime.indexOf('editorialCss'),
  runtime.indexOf('navigationCss'),
  runtime.indexOf('stage5AppCss'),
  runtime.indexOf('stage5WorkflowCss'),
  runtime.indexOf('stage6PolishCss'),
];
if (authorityOrder.some((value) => value < 0) || authorityOrder.some((value, index) => index && value <= authorityOrder[index - 1])) {
  failures.push('editorial authority runtime: CSS authority order is not stable');
}

// Stage 6 removes the old timed promotion burst; lazy CSS is covered by MutationObserver.
if (runtime.includes('promoteBurst') || runtime.includes('setTimeout(')) {
  failures.push('editorial authority runtime: timed promotion burst has returned');
}
requireText(runtime, 'MutationObserver', 'editorial authority runtime');
requireText(runtime, 'requestAnimationFrame', 'editorial authority runtime');

// Navigation remains structurally untouched by design-system migration layers.
if (navigation.includes('BrianStage5Migration') || navigation.includes('BrianStage6Polish')) {
  failures.push('global navigation: design-system migration CSS must stay in final editorial authority runtime');
}

// Do not grow the old global versioned stylesheet stack beyond the Stage 6 baseline.
const versionedGlobalImports = [...main.matchAll(/import ['"]\.\/styles\/v\d+\.css['"];?/g)].length;
const versionedGlobalBaseline = 15;
if (versionedGlobalImports > versionedGlobalBaseline) {
  failures.push(`main.jsx: versioned global CSS debt grew from baseline ${versionedGlobalBaseline} to ${versionedGlobalImports}`);
}

// The retired standalone practice route must not regain a renderer.
if (/currentRoute === ['"]practice['"]\s*&&/.test(main)) {
  failures.push('main.jsx: retired standalone practice route is rendered again');
}

// Stage 6 is polish only: semantic tokens, scoped selectors, no palette or motion system.
for (const token of [
  '--brian-focus-color',
  '--brian-focus-ring',
  '--brian-touch-target',
  '@media (forced-colors: active)',
  '@media (prefers-reduced-motion: reduce)',
  "data-route='home'",
  "data-route='dashboard'",
  "data-route='homeroom'",
  '.ttcm-m3-shell',
]) {
  requireText(stage6, token, 'Stage 6 polish CSS');
}

if (/#[0-9a-fA-F]{3,8}\b/.test(stage6)) failures.push('Stage 6 polish CSS: hard-coded hex palette is not allowed');
if (/\b(animation|transition)\s*:/.test(stage6)) failures.push('Stage 6 polish CSS: presentation motion is not allowed');

if (failures.length) {
  console.error('Stage 6 polish audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Stage 6 polish audit passed.');
console.log(`Versioned global CSS imports: ${versionedGlobalImports}/${versionedGlobalBaseline} baseline.`);
console.log('Authority scheduling: MutationObserver + single RAF debounce, no timer burst.');
console.log('Responsive, focus, forced-colors and reduced-motion contracts are present.');
