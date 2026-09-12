import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const readOptional = (path) => fs.existsSync(new URL(path, import.meta.url))
  ? fs.readFileSync(new URL(path, import.meta.url), 'utf8')
  : '';

const index = read('../index.html');
const v4 = read('../public/attendance-history-mockup-v4.js');
const v5 = read('../public/attendance-history-v5.js');
const syncCss = readOptional('../public/attendance-card-size-sync-v1.css');

// Lifecycle regression: History-owned UI must be fully removed/restored when History is not active.
assert.match(v4, /function\s+cleanupMockupArtifacts\s*\(/, 'V4 must expose an explicit History cleanup routine');
assert.match(v4, /data-ah-mockup-owned[\s\S]*filterbar/, 'History filterbar must remain explicitly owned by the History enhancer');
assert.match(v4, /cleanupMockupArtifacts\(observedShell\)/, 'leaving History must clean shared-shell artifacts');
assert.match(v4, /data-ah-original-text/, 'enhanced success banners must retain enough state to be restored');
assert.match(v4, /removeAttribute\(['"]data-ah-mockup-owned['"]\)/, 'cleanup must release History ownership attributes');

assert.match(v5, /function\s+restoreDuplicateActivityFilters\s*\(/, 'V5 must restore filters it previously hid');
assert.match(v5, /style\.removeProperty\(['"]display['"]\)/, 'V5 cleanup must remove its display:none override');
assert.match(v5, /removeAttribute\(DUPLICATE_ATTRIBUTE\)/, 'V5 cleanup must release duplicate-filter state');
assert.match(v5, /removeAttribute\(TYPE_FILTER_ATTRIBUTE\)/, 'V5 cleanup must release native type-filter state');

// Card-size contract: History is the visual source of truth for comparable class/session cards.
assert.match(index, /attendance-history-perfect-polish-v6-2\.css\?v=1[\s\S]*attendance-card-size-sync-v1\.css\?v=1/, 'shared card-size layer must load after the final History polish');
assert.match(syncCss, /--attendance-session-card-min-height:\s*80px/, 'shared card token must preserve History 80px session-card rhythm');
assert.match(syncCss, /--attendance-session-card-radius:\s*15px/, 'shared card token must preserve History corner radius');
assert.match(syncCss, /\.ahv3__items\s*>\s*button/, 'History session cards must participate in shared sizing');
assert.match(syncCss, /\.attendance-class-list\s*>\s*div:last-child\s*>\s*button/, 'daily attendance class cards must share History sizing');
assert.match(syncCss, /\.attendance-manage-classes\s*>\s*button/, 'Manage classes cards must share History sizing');
assert.match(syncCss, /\.bes-supplemental-daily-card/, 'supplemental-learning class cards must share History sizing');
assert.match(syncCss, /\.att-report-m3__teacher-grid\s*>\s*article/, 'report teacher cards must share History sizing rhythm');

console.log('attendance History lifecycle + card-size sync contract: ok');
