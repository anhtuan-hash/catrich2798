import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../public/attendance-history-mobile-polish.css', import.meta.url), 'utf8');
const behavior = fs.readFileSync(new URL('../public/attendance-history-v5.js', import.meta.url), 'utf8');

// Screenshot regression: the mobile list must consume the remaining History viewport
// instead of rendering ~3 cards followed by a large dead white area.
assert.match(css, /\.ahv3__list\s*\{[^}]*flex:\s*1\s+1\s+0%\s*!important;[^}]*height:\s*100%\s*!important;/s, 'History list must consume the full mobile workspace');
assert.match(css, /\.ahv3__items\s*\{[^}]*flex:\s*1\s+1\s+0%\s*!important;[^}]*height:\s*auto\s*!important;[^}]*max-height:\s*none\s*!important;[^}]*overflow-y:\s*auto\s*!important;/s, 'History cards must fill and scroll through the full remaining list height');

// Bottom sheet must be genuinely mobile-width. Desktop max-width/grid constraints must
// not leave the hero, information cards, audit, lists, or actions stuck at half width.
assert.match(css, /\.ahv3__hero,[\s\S]*?\.ahv3__info-grid,[\s\S]*?\.ahv3__info-grid > article,[\s\S]*?\.ahv3__audit-actor-panel,[\s\S]*?\.ahv3__absent-section,[\s\S]*?\.ahv3__footer-grid,[\s\S]*?\.ahv3__mobile-sheet-actions\s*\{[^}]*width:\s*100%\s*!important;[^}]*max-width:\s*none\s*!important;/s, 'Core mobile detail surfaces must share one full-width contract');
assert.match(css, /@media\s*\(max-width:\s*520px\)[\s\S]*?\.ahv3__info-grid\s*\{[^}]*width:\s*100%\s*!important;[^}]*max-width:\s*none\s*!important;[^}]*grid-template-columns:\s*1fr\s*!important;/s, 'Phone information cards must stack in one full-width column');
assert.match(css, /@media\s*\(max-width:\s*520px\)[\s\S]*?\.ahv3__info-grid > article\s*\{[^}]*width:\s*100%\s*!important;[^}]*max-width:\s*none\s*!important;/s, 'Each phone information card must span the sheet');

// Actions should stay reachable and span the sheet rather than shrinking to content width.
assert.match(css, /\.ahv3__mobile-sheet-actions\s*\{[^}]*position:\s*sticky\s*!important;[^}]*bottom:\s*0\s*!important;[^}]*grid-template-columns:\s*1fr\s*!important;[^}]*margin:\s*auto\s+0\s+0\s*!important;/s, 'Mobile actions must form a bottom-pinned full-width action rail');
assert.match(css, /\.ahv3__mobile-sheet-actions button\s*\{[^}]*width:\s*100%\s*!important;[^}]*max-width:\s*none\s*!important;/s, 'Mobile action buttons must span the sheet');

// Secondary audit/note content is collapsed by default to keep the mobile detail concise,
// but remains accessible through a dedicated disclosure control.
assert.match(behavior, /MOBILE_SECONDARY_CLASS\s*=\s*'is-mobile-secondary-open'/, 'History enhancer must track secondary mobile detail disclosure state');
assert.match(behavior, /MOBILE_SECONDARY_TOGGLE_CLASS\s*=\s*'ahv3__mobile-secondary-toggle'/, 'History enhancer must expose a secondary-info toggle');
assert.match(behavior, /MOBILE_POLISH_STYLESHEET_HREF\s*=\s*'\/attendance-history-mobile-polish\.css\?v=1'/, 'History enhancer must load the final polish layer after the bottom sheet');
assert.match(css, /\.ahv3__audit-actor-panel,[\s\S]*?\.ahv3__footer-grid\s*\{[^}]*display:\s*none\s*!important;/s, 'Secondary audit and note blocks should start collapsed on mobile');
assert.match(css, /\.is-mobile-secondary-open \.ahv3__audit-actor-panel,[\s\S]*?\.is-mobile-secondary-open \.ahv3__footer-grid\s*\{[^}]*display:\s*grid\s*!important;/s, 'Secondary audit and note blocks must become visible when expanded');
assert.match(css, /\.ahv3__mobile-secondary-toggle\s*\{[^}]*width:\s*100%\s*!important;[^}]*min-height:\s*46px\s*!important;/s, 'Secondary disclosure must be a touch-friendly full-width control');

// The activity chip rail should communicate horizontal overflow instead of clipping the
// last chip like a layout bug.
assert.match(css, /\.ah-mockup-filterbar__buttons\s*\{[^}]*overflow-x:\s*auto\s*!important;[^}]*padding-right:\s*28px\s*!important;[^}]*mask-image:\s*linear-gradient/s, 'Activity chips must scroll with a right-edge fade cue');

console.log('Attendance History mobile polish contract OK');
