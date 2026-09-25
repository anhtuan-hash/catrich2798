import assert from 'node:assert/strict';
import fs from 'node:fs';

const rail = fs.readFileSync('src/components/GlobalQuickAccessRail.jsx', 'utf8');
const css = fs.readFileSync('src/components/GlobalQuickAccessRail.css', 'utf8');
const gateway = fs.readFileSync('api/gateway.js', 'utf8');
const vercel = fs.readFileSync('vercel.json', 'utf8');
const searchHandler = fs.readFileSync('serverless-handlers/_youtube-search.js', 'utf8');

for (const token of [
  'YOUTUBE_QUICK_MAX_PINS = 6',
  'YOUTUBE_QUICK_SEARCH_MAX = 12',
  "bes-youtube-quick-pins:",
  'normalizeYoutubeQuickUrl',
  'handleYoutubeRailClick',
  'handleYoutubeRailDoubleClick',
  'handleYoutubeContextMenu',
  'youtubeQuickPlayableTarget',
  'https://www.youtube-nocookie.com/embed/',
  'allowFullScreen',
  'bqa-youtube-player-frame',
  'youtubeSearchResults',
  '/api/youtube-search?q=',
  'playYoutubeSearchResult',
  'bqa-youtube-results',
  'bqa-youtube-result',
  'data-bes-keep-search="true"',
  'https://studio.youtube.com/',
  'https://music.youtube.com/',
  'bqa-youtube-rail',
  'bqa-youtube-panel',
  'bqa-youtube-context',
  'youtubePins.slice(0, 3)',
  'youtubePlayerFrameRef',
  'stopYoutubeQuickPlayback',
  "frame.src = 'about:blank'",
  "func: 'stopVideo'",
  "enablejsapi: '1'",
  'onClick={closeYoutubeQuickPanel}',
  'onClick={stopYoutubeQuickPlayback}',
  "youtubeQuickOpen || youtubePlayer",
  "is-background-player",
  "data-background-player",
  "onClick={() => setYoutubeQuickOpen(true)}",
  "is-youtube-playing",
]) {
  assert.ok(rail.includes(token), `YouTube Quick Access contract missing: ${token}`);
}

assert.match(
  rail,
  /Math\.floor\(\(height - reserved\) \/ itemPitch\) - 1/,
  'Rail capacity must reserve one icon slot for the dedicated YouTube launcher.',
);

assert.ok(
  rail.includes('limit=${YOUTUBE_QUICK_SEARCH_MAX}'),
  'YouTube keyword search must request the configured expanded result count.',
);
assert.ok(
  rail.includes('data.results.slice(0, YOUTUBE_QUICK_SEARCH_MAX)'),
  'YouTube keyword search must retain the configured expanded result count.',
);
assert.ok(
  searchHandler.includes('if (!Number.isFinite(parsed)) return 12;')
    && searchHandler.includes('Math.min(20, parsed)'),
  'YouTube server search limit must default to 12 and allow up to 20.',
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
  '.bqa-youtube-results',
  '.bqa-youtube-result',
  '.bqa-youtube-search-error',
  '.bqa-youtube-panel.is-background-player',
  'body > .bqa-root.is-youtube-playing',
  'bqa-youtube-float-in',
  'min-height: 200px',
  '@media (max-width: 760px), (hover: none)',
  'display: none !important',
]) {
  assert.ok(css.includes(token), `YouTube Quick Access visual contract missing: ${token}`);
}

const searchHandlerStart = rail.indexOf('const handleYoutubeSearch = async (event) => {');
const searchHandlerEnd = rail.indexOf('const playYoutubeSearchResult', searchHandlerStart);
const clientSearchHandler = rail.slice(searchHandlerStart, searchHandlerEnd);
assert.ok(searchHandlerStart >= 0 && searchHandlerEnd > searchHandlerStart, 'YouTube keyword search handler must exist.');
assert.ok(clientSearchHandler.includes('playYoutubeQuick(query)'), 'Playable links must still play directly inside Brian.');
assert.ok(clientSearchHandler.includes('/api/youtube-search?q='), 'Keyword searches must call the Brian YouTube search endpoint.');
assert.ok(!clientSearchHandler.includes('openYoutubeQuickExternal'), 'Submitting the search field must not open a new tab.');

assert.ok(gateway.includes("import youtubeSearch from '../serverless-handlers/_youtube-search.js';"), 'Gateway must import YouTube search handler.');
assert.ok(gateway.includes("'youtube-search': youtubeSearch"), 'Gateway must register YouTube search handler.');
assert.ok(vercel.includes('"source": "/api/youtube-search"'), 'Vercel must expose the YouTube search route.');
assert.ok(vercel.includes('"destination": "/api/gateway?handler=youtube-search"'), 'YouTube search route must reuse the shared gateway.');
for (const token of [
  'process.env.YOUTUBE_API_KEY',
  'process.env.VITE_YOUTUBE_API_KEY',
  'https://www.googleapis.com/youtube/v3/search',
  "type: 'video'",
  "safeSearch: 'moderate'",
  'https://www.youtube.com/results?',
  'ytInitialData',
  'videoRenderer',
  "source = 'youtube-html'",
  "source = 'youtube-html-fallback'",
]) {
  assert.ok(searchHandler.includes(token), `YouTube search API contract missing: ${token}`);
}

const closeHelperStart = rail.indexOf('const closeYoutubeQuickPanel = useCallback(() => {');
const closeHelperEnd = rail.indexOf('const catalog = useMemo', closeHelperStart);
const closeHelper = rail.slice(closeHelperStart, closeHelperEnd);
assert.ok(closeHelperStart >= 0 && closeHelperEnd > closeHelperStart, 'YouTube close helper must exist.');
assert.ok(closeHelper.includes('setYoutubeQuickOpen(false)'), 'Closing YouTube Quick must hide the full sidebar panel.');
assert.ok(!closeHelper.includes('stopYoutubeQuickPlayback()'), 'Closing YouTube Quick must not stop the current video.');
assert.ok(rail.includes('{(youtubeQuickOpen || youtubePlayer) ? ('), 'Player must remain mounted after the YouTube sidebar closes.');
assert.ok(css.includes('.bqa-youtube-panel.is-background-player > :not(.bqa-youtube-player)'), 'Closed YouTube sidebar must collapse into the floating player only.');

const youtubeCss = css.slice(css.indexOf('Brian YouTube Quick Access · 2026-09-25'));
assert.ok(!/font-family\s*:/i.test(youtubeCss), 'YouTube Quick Access must inherit Brian custom fonts.');
assert.ok(!/\.app-shell\s*\{/.test(youtubeCss), 'YouTube Quick Access must not mutate global app-shell layout.');
assert.ok(!/body\s*\{/.test(youtubeCss), 'YouTube Quick Access CSS must remain component-scoped.');

console.log('PASS: YouTube Quick Access shows up to 12 search results, plays inline, and keeps the same player alive as a floating mini-player when the sidebar closes.');
