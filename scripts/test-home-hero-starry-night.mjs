import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [heroSource, heroCss] = await Promise.all([
  readFile(new URL('../src/components/HomeHeroExperience2026.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/HomeHeroExperience2026.css', import.meta.url), 'utf8'),
]);

assert.match(heroSource, /data-hero-skin=["']starry-night["']/, 'Hero should expose the Starry Night skin marker');
assert.match(heroSource, /hero-cms__starfield/, 'Hero should render a decorative starfield layer');
assert.match(heroSource, /hero-cms__aurora/, 'Hero should render an aurora glow layer');
assert.match(heroSource, /hero-cms__meteor/, 'Hero should render decorative meteor accents');

assert.match(heroCss, /\.hero-cms__starfield\s*\{/, 'Starfield layer must be styled');
assert.match(heroCss, /\.hero-cms__aurora\s*\{/, 'Aurora layer must be styled');
assert.match(heroCss, /\.hero-cms__meteor\s*\{/, 'Meteor layer must be styled');
assert.match(heroCss, /@keyframes\s+hero-star-drift/, 'Starfield motion must have a dedicated keyframe');
assert.match(heroCss, /@keyframes\s+hero-aurora-drift/, 'Aurora motion must have a dedicated keyframe');
assert.match(heroCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'Hero motion must respect reduced-motion preferences');
assert.match(heroCss, /linear-gradient\([^)]*#07162f/i, 'Starry Night skin should include the approved deep-night palette');

console.log('Home Hero Starry Night contract: OK');
