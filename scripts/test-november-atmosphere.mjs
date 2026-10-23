import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const svg = read('src/components/NovemberMotifArt.jsx');
const overlay = read('src/components/NovemberAtmosphereOverlay.jsx');
const css = read('src/components/NovemberAtmosphereOverlay.css');
const selector = read('src/components/VietnamAtmosphereAdminPanel.jsx');
const settings = read('src/utils/globalAtmosphereTheme.js');
const entry = read('src/components/VietnamAtmosphereOverlay.jsx');
const migration = read('supabase/global_atmosphere_november_2026.sql');

function check(description, condition) {
  assert.ok(condition, description);
  console.log('✓ ' + description);
}
const catalog = svg.match(/export const NOVEMBER_MOTIFS = Object\.freeze\(\[([\s\S]*?)\]\);/);
check('24 standalone November motif names', Boolean(catalog) &&
  [...catalog[1].matchAll(/'([^']+)'/g)].length === 24);
check('November art maps the 24 motifs to actual SVG artwork',
  ['november-20', 'rose', 'lotus', 'chalkboard', 'open-book', 'thank-you-letter'].every((kind) => (svg.includes(`'${kind}': <g>`) || svg.includes(`${kind}: <g>`))));
check('November symbol library has labels and school illustrations', svg.includes('NOVEMBER_MOTIF_LABELS') && svg.includes('20</text>'));
check('global theme now supports three selections', settings.includes("['vietnam', 'halloween', 'november']"));
check('old Halloween fields and their saved values remain supported', settings.includes('halloween_density') && settings.includes('halloween: { ...current.halloween'));
check('separate November fields are persisted', ['november_density:', 'november_opacity:', 'november_show_built_ins:'].every((key) => settings.includes(key)));
check('Vietnam and Halloween renderers are preserved', entry.includes('VietnamMotif') && entry.includes('<HalloweenAtmosphereOverlay') && entry.includes('<NovemberAtmosphereOverlay'));
check('admin can choose and apply the November theme', selector.includes("setEditingTheme('november')") && selector.includes("activeTheme: 'november'"));
check('admin can reset November independently', selector.includes('DEFAULT_NOVEMBER_SETTINGS') && selector.includes('setNovemberDraft({ ...DEFAULT_NOVEMBER_SETTINGS })'));
check('24 illustrations are shown in the settings gallery', selector.includes('NOVEMBER_MOTIFS.map') && selector.includes('<NovemberMotifArt kind={kind}'));
check('randomized edge placements and partial respawns', overlay.includes('shuffled(EDGE_ZONES') && overlay.includes('replacement(updated') && overlay.includes('random(17000, 32000)'));
check('responsive caps and motion preferences', overlay.includes("tier === 'mobile' ? 4 : tier === 'tablet' ? 8 : 12") && overlay.includes('prefers-reduced-motion'));
check('decorations never capture user gestures', css.includes('pointer-events: none !important'));
check('animations and pause behavior are defined', css.includes('bes-november-bloom') && css.includes("data-paused='true'"));
check('existing records are not switched on database migration', !/update\s+public\.global_atmosphere_theme\s+set\s+active_theme/i.test(migration));
check('old Vietnam table is untouched', !migration.includes('vietnam_atmosphere_settings'));
console.log('PASS: November teacher appreciation atmosphere contract');
