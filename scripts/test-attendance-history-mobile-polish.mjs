import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../public/attendance-history-mobile-polish.css', import.meta.url), 'utf8');
const behavior = fs.readFileSync(new URL('../public/attendance-history-v5.js', import.meta.url), 'utf8');

// Screenshot regression: the mobile list must consume the remaining History viewport
// instead of rendering ~3 cards followed by a large dead white area.
assert.match(css, /\.ahv3__list\s*\{[^}]*flex:\s*1\s+1\s+0%\s*!important;[^}]*height:\s*100%\s*!important;/s, 'History list must consume the full mobile workspace');
assert.match(css, /\.ahv3__items\s*\{[^}]*flex:\s*1\s+1\s+0%\s*!important;[^}]*height:\s*auto\s*!important;[^}]*max-height:\s*none\s*!important;[^}]*overflow-y:\s*auto\s*!important;/s, 'History cards must fill and scroll through the full remaining list height');

// Approved compact-detail direction: the sheet should size to its content up to a safe
// viewport cap, rather than reserving a tall fixed panel that leaves dead white space.
assert.match(css, /\.ahv3__shell\.is-mobile-detail-open \.ahv3__detail\s*\{[^}]*height:\s*auto\s*!important;[^}]*max-height:\s*88dvh\s*!important;/s, 'Mobile History detail should be content-sized with an 88dvh cap');
assert.match(css, /\.ahv3__shell\.is-mobile-detail-open \.ahv3__detail\s*\{[^}]*padding-bottom:\s*max\(12px,\s*env\(safe-area-inset-bottom\)\)\s*!important;/s, 'Mobile History detail should keep only compact safe-area bottom padding');

// The close button must live inside the auto-height sheet so it stays pinned to the sheet
// chrome even when the content is much shorter than 88dvh.
assert.match(behavior, /detail\.prepend\(close\)/, 'Mobile detail close control must be anchored inside the sheet');
assert.match(css, /\.ahv3__mobile-sheet-close\s*\{[^}]*top:\s*10px\s*!important;[^}]*right:\s*10px\s*!important;/s, 'Mobile detail close control must stay in the sheet top-right corner');

// Bottom sheet must be genuinely mobile-width. Desktop max-width/grid constraints must
// not leave the hero, information cards, audit, lists, or actions stuck at half width.
assert.match(css, /\.ahv3__hero,[\s\S]*?\.ahv3__info-grid,[\s\S]*?\.ahv3__info-grid > article,[\s\S]*?\.ahv3__audit-actor-panel,[\s\S]*?\.ahv3__absent-section,[\s\S]*?\.ahv3__footer-grid,[\s\S]*?\.ahv3__mobile-sheet-actions\s*\{[^}]*width:\s*100%\s*!important;[^}]*max-width:\s*none\s*!important;/s, 'Core mobile detail surfaces must share one full-width contract');

// Phone information is intentionally compact: two columns / three rows for the six core
// facts, rather than a six-card vertical stack.
assert.match(css, /@media\s*\(max-width:\s*520px\)[\s\S]*?\.ahv3__info-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important;/s, 'Phone information cards must use a compact two-column grid');
assert.match(css, /@media\s*\(max-width:\s*520px\)[\s\S]*?\.ahv3__info-grid > article\s*\{[^}]*min-height:\s*58px\s*!important;[^}]*padding:\s*9px\s*!important;/s, 'Phone information cards must be compact rather than desktop-height tiles');

// The absent-student block should hug its content and must not keep a large desktop min-height.
assert.match(css, /\.ahv3__absent-section\s*\{[^}]*min-height:\s*0\s*!important;[^}]*height:\s*auto\s*!important;/s, 'Absent-student section must not reserve a tall empty desktop panel');

// Actions now sit directly after content. They stay full-width, but are not pushed to the
// bottom of a taller sheet and are not sticky when the detail is short.
assert.match(css, /\.ahv3__mobile-sheet-actions\s*\{[^}]*position:\s*static\s*!important;/s, 'Mobile actions must not be sticky');
assert.match(css, /\.ahv3__mobile-sheet-actions\s*\{[^}]*margin:\s*12px\s+0\s+0\s*!important;/s, 'Mobile actions must follow content without auto-margin dead space');
assert.match(css, /\.ahv3__mobile-sheet-actions\s*\{[^}]*grid-template-columns:\s*1fr\s*!important;/s, 'Mobile actions must remain a one-column rail');
assert.match(css, /\.ahv3__mobile-sheet-actions button\s*\{[^}]*width:\s*100%\s*!important;[^}]*min-height:\s*48px\s*!important;/s, 'Mobile action buttons must stay full-width and touch-friendly');

// Secondary audit/note content is collapsed by default to keep the mobile detail concise,
// but remains accessible through a dedicated disclosure control.
assert.match(behavior, /MOBILE_SECONDARY_CLASS\s*=\s*'is-mobile-secondary-open'/, 'History enhancer must track secondary mobile detail disclosure state');
assert.match(behavior, /MOBILE_SECONDARY_TOGGLE_CLASS\s*=\s*'ahv3__mobile-secondary-toggle'/, 'History enhancer must expose a secondary-info toggle');
assert.match(behavior, /MOBILE_POLISH_STYLESHEET_HREF\s*=\s*'\/attendance-history-mobile-polish\.css\?v=2'/, 'History enhancer must load the compact-detail polish layer without stale mobile CSS');
assert.match(css, /\.ahv3__audit-actor-panel,[\s\S]*?\.ahv3__footer-grid\s*\{[^}]*display:\s*none\s*!important;/s, 'Secondary audit and note blocks should start collapsed on mobile');
assert.match(css, /\.is-mobile-secondary-open \.ahv3__audit-actor-panel,[\s\S]*?\.is-mobile-secondary-open \.ahv3__footer-grid\s*\{[^}]*display:\s*grid\s*!important;/s, 'Secondary audit and note blocks must become visible when expanded');
assert.match(css, /\.ahv3__mobile-secondary-toggle\s*\{[^}]*width:\s*100%\s*!important;[^}]*min-height:\s*44px\s*!important;/s, 'Secondary disclosure must remain touch-friendly without adding excess height');

// The activity chip rail should communicate horizontal overflow instead of clipping the
// last chip like a layout bug.
assert.match(css, /\.ah-mockup-filterbar__buttons\s*\{[^}]*overflow-x:\s*auto\s*!important;[^}]*padding-right:\s*28px\s*!important;[^}]*mask-image:\s*linear-gradient/s, 'Activity chips must scroll with a right-edge fade cue');

console.log('Attendance History compact mobile detail contract OK');
