import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [homeSource, heroCss] = await Promise.all([
  readFile(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/HomeHeroStarryNight.css', import.meta.url), 'utf8').catch(() => ''),
]);

assert.match(homeSource, /HomeHeroStarryNight\.css/, 'Home should load the Starry Night Hero skin');
const starryImportIndex = homeSource.indexOf("import '../styles/HomeHeroStarryNight.css';");
const editorialBlueImportIndex = homeSource.indexOf("import '../styles/HomeEditorialBlueV9.css';");
assert.ok(starryImportIndex > editorialBlueImportIndex, 'Starry Night must load after the final Home editorial skin so later !important rules cannot overwrite it');

assert.match(heroCss, /\.app-shell\[data-route=["']home["']\]\s+\.bha-hero\.hero-cms\s*\{/, 'Starry Night root selector must match BlueV9 specificity so the night container wins the cascade');
assert.match(heroCss, /\.hero-cms__background::before\s*\{/, 'Starry Night skin should render a CSS starfield layer');
assert.match(heroCss, /\.hero-cms__background::after\s*\{/, 'Starry Night skin should render an aurora and moon glow layer');
assert.match(heroCss, /\.hero-cms::before\s*\{/, 'Starry Night skin should render meteor accents');
assert.match(heroCss, /@keyframes\s+hero-star-drift/, 'Starfield motion must have a dedicated keyframe');
assert.match(heroCss, /@keyframes\s+hero-aurora-drift/, 'Aurora motion must have a dedicated keyframe');
assert.match(heroCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'Hero motion must respect reduced-motion preferences');
assert.match(heroCss, /linear-gradient\([^)]*#07162f/i, 'Starry Night skin should include the approved deep-night palette');
assert.match(heroCss, /#FFD75D/i, 'Starry Night skin should include the warm moon-and-star accent');
assert.match(heroCss, /#FFE582/i, 'Starry Night skin should include the soft gold highlight');

console.log('Home Hero Starry Night contract: OK');
