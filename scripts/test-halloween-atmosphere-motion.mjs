import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const overlay = read('src/components/HalloweenAtmosphereOverlay.jsx');
const css = read('src/components/HalloweenAtmosphereOverlay.css');
const motifs = read('src/components/HalloweenMotifArt.jsx');
const vietnam = read('src/components/VietnamAtmosphereOverlay.jsx');
const theme = read('src/utils/globalAtmosphereTheme.js');

function check(description, condition) {
  assert.ok(condition, description);
  console.log(`✓ ${description}`);
}

check('all 28 illustrated Halloween motifs remain available', (motifs.match(/<g>/g) || []).length >= 28);
check('the active Halloween renderer still reuses the original Vietnam selector', vietnam.includes('<HalloweenAtmosphereOverlay') && vietnam.includes('globalAtmosphere.activeTheme'));
check('Vietnam remains the default global atmosphere', /activeTheme:\s*'vietnam'/.test(theme));
check('scene positions shuffle on mount and pick random offsets', overlay.includes('shuffle(EDGE_ZONES') && overlay.includes('Math.random()') && overlay.includes('randomBetween(-spread, spread)'));
check('desktop, tablet, phone and low-power modes have bounded motif counts', overlay.includes("tier === 'mobile' ? 5 : tier === 'tablet' ? 9 : 14") && overlay.includes('Math.min(requested, 3)'));
check('scene changes replace a subset rather than clearing all motifs', overlay.includes('Math.random() < 0.7 ? 1 : 2') && overlay.includes('replacementFor') && overlay.includes('setMotifs(next)'));
check('scene waves have random timing', overlay.includes('randomBetween(14000, 26000)'));
check('exit fade and new spawn are separated', overlay.includes('leaving: true') && overlay.includes('850)') && css.includes('bes-halloween-depart') && css.includes('bes-halloween-arrive'));
check('six distinct motion families are defined', ['fly', 'float', 'swing', 'fall', 'glimmer', 'hover'].every((name) => overlay.includes(`'${name}'`) && css.includes(`.is-${name}`)));
check('animations are visible by default', css.includes('infinite alternate') && css.includes('--h-duration'));
check('the layer never intercepts interaction', css.includes('pointer-events: none !important'));
check('reduced motion and low-power modes disable animation', css.includes('(prefers-reduced-motion: reduce)') && css.includes("data-performance='low'") && css.includes("data-performance='minimal'"));
check('background tabs pause motion and spawns', overlay.includes('visibilitychange') && overlay.includes('pageVisible') && css.includes("data-paused='true'"));
check('printing excludes decorations', css.includes('@media print'));
check('existing Vietnam motifs are not edited by this feature', !overlay.includes('VietnamMotif'));

console.log('PASS: Halloween floating, randomized spawn and compatibility checks.');
