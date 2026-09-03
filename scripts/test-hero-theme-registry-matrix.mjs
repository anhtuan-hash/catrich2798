import fs from 'node:fs';
import { HERO_REGISTRY, validateHeroRegistry } from '../src/heroTheme/heroRegistry.js';
import { resolveHeroTheme } from '../src/heroTheme/heroThemeModel.js';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function requireText(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`${label}: missing ${needle}`);
}

validateHeroRegistry(HERO_REGISTRY);
if (!HERO_REGISTRY.length) throw new Error('Hero Registry must not be empty.');

const keys = HERO_REGISTRY.map((entry) => entry.heroKey);
if (new Set(keys).size !== keys.length) throw new Error('Hero Registry contains duplicate heroKey values.');
for (const entry of HERO_REGISTRY) {
  if (!entry.route) throw new Error(`${entry.heroKey}: missing route`);
  if (!Array.isArray(entry.selectors) || !entry.selectors.length) throw new Error(`${entry.heroKey}: missing selectors`);
  if (entry.selectors.some((selector) => typeof selector !== 'string' || !selector.trim())) {
    throw new Error(`${entry.heroKey}: contains an empty selector`);
  }
  if (entry.route === 'tool' && !entry.toolSlug) throw new Error(`${entry.heroKey}: tool Hero missing toolSlug`);
}

const missingTheme = resolveHeroTheme({ version: 1, heroes: {} }, 'home.main');
if (missingTheme.mode !== 'original') throw new Error('Missing Hero config must resolve to ORIGINAL.');
const invalidCustom = resolveHeroTheme({ version: 1, heroes: { 'home.main': { mode: 'custom' } } }, 'home.main');
if (invalidCustom.mode !== 'original') throw new Error('Custom Hero without media must fail open to ORIGINAL.');

const runtime = read('src/components/HeroThemeRuntime.jsx');
requireText(runtime, 'new MutationObserver(scheduleSync)', 'Hero target replacement observer');
requireText(runtime, "observer.observe(document.getElementById('bes-main-content') || document.body, { childList: true, subtree: true })", 'Hero subtree observer');
requireText(runtime, 'nextTarget === currentTarget && nextTarget?.isConnected', 'Hero stable-target guard');
requireText(runtime, 'detach = attachThemeLayer(currentTarget, descriptor, theme, imageUrl)', 'Hero replacement reattach');
requireText(runtime, "if (theme.mode !== 'custom') return", 'ORIGINAL fail-open runtime');
requireText(runtime, 'original Hero preserved after media error', 'media failure fail-open runtime');

const gradebookCss = read('src/styles/GradebookMaterialHeroRuntime.css');
requireText(gradebookCss, ':not(.gbe-material-hero-runtime):not(.hero-theme-runtime__layer)', 'Gradebook nested Hero compatibility');

console.log(`Hero Theme registry/runtime matrix OK (${HERO_REGISTRY.length} heroes)`);
