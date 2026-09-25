import assert from 'node:assert/strict';
import fs from 'node:fs';

const rail = fs.readFileSync('src/components/GlobalQuickAccessRail.jsx', 'utf8');
const css = fs.readFileSync('src/components/GlobalQuickAccessRail.css', 'utf8');

for (const token of [
  'YOUTUBE_QUICK_MAX_PINS = 6',
  "bes-youtube-quick-pins:",
  'normalizeYoutubeQuickUrl',
  'handleYoutubeRailClick',
  'handleYoutubeRailDoubleClick',
  'handleYoutubeContextMenu',
  'youtubeQuickPlayableTarget',
  'https://www.youtube-nocookie.com/embed/',
  'allowFullScreen',
  'bqa-youtube-player-frame',
  'https://studio.youtube.com/',
  'https://music.youtube.com/',
  'bqa-youtube-rail',
  'bqa-youtube-panel',
  'bqa-youtube-context',
  'youtubePins.slice(0, 3)',
]) {
  assert.ok(rail.includes(token), `YouTube Quick Access contract missing: ${token}`);
}

assert.match(
  rail,
  /Math\.floor\(\(height - reserved\) \/ itemPitch\) - 1/,
  'Rail capacity must reserve one icon slot for the dedicated YouTube launcher.',
);

const railItemsStart = rail.indexOf('className="bqa-rail-items"');
const railItemsEnd = rail.indexOf('{railOverflowItems.length ? (', railItemsStart);
const fixedYoutubeIndex = rail.indexOf('bqa-youtube-fixed-control');
assert.ok(railItemsStart >= 0 && railItemsEnd > railItemsStart, 'Quick Access rail-items boundaries must exist.');
assert.ok(fixedYoutubeIndex > railItemsEnd, 'YouTube launcher must live outside the scrollable rail-items area so it stays visible.');
assert.equal((rail.match(/bqa-youtube-fixed-control/g) || []).length, 1, 'Exactly one fixed YouTube launcher must be rendered.');

for (const token of [
  'Brian YouTube Quick Access · 2026-09-25',
  '.bqa-youtube-rail',
  '.bqa-youtube-panel',
  '.bqa-youtube-context',
  '.bqa-youtube-player',
  '.bqa-youtube-player-frame',
  'min-height: 200px',
  '@media (max-width: 760px), (hover: none)',
  'display: none !important',
]) {
  assert.ok(css.includes(token), `YouTube Quick Access visual contract missing: ${token}`);
}

const searchHandlerStart = rail.indexOf('const handleYoutubeSearch = (event) => {');
const searchHandlerEnd = rail.indexOf('const openYoutubePinnedEntry', searchHandlerStart);
const searchHandler = rail.slice(searchHandlerStart, searchHandlerEnd);
assert.ok(searchHandlerStart >= 0 && searchHandlerEnd > searchHandlerStart, 'YouTube inline play handler must exist.');
assert.ok(searchHandler.includes('playYoutubeQuick(query)'), 'Submitting the YouTube field must play inside Brian.');
assert.ok(!searchHandler.includes('openYoutubeQuickExternal'), 'Submitting the inline play field must not open a new tab.');

const youtubeCss = css.slice(css.indexOf('Brian YouTube Quick Access · 2026-09-25'));
assert.ok(!/font-family\s*:/i.test(youtubeCss), 'YouTube Quick Access must inherit Brian custom fonts.');
assert.ok(!/\.app-shell\s*\{/.test(youtubeCss), 'YouTube Quick Access must not mutate global app-shell layout.');
assert.ok(!/body\s*\{/.test(youtubeCss), 'YouTube Quick Access CSS must remain component-scoped.');

console.log('PASS: YouTube Quick Access stays web-only and visible, plays videos/playlists inline in Brian, and preserves external fallbacks plus up to 6 pinned links.');
