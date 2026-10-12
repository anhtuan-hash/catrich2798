import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HOMEROOM_TABS } from '../src/data/homeroom.js';
import { RETIRED_HOMEROOM_TAB_KEYS } from '../src/utils/homeroomClassTypes.js';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const tabs = HOMEROOM_TABS.map((t) => t.key);
assert.deepEqual(tabs, ['overview','classes','students','studentRecords','attendance','conduct','safety']);
for (const tab of tabs) assert.ok(!RETIRED_HOMEROOM_TAB_KEYS.includes(tab), 'Retired tab must not be re-exposed: '+tab);
const css = read('src/styles/homeroom-4-tokens.css');
const ws = read('src/pages/HomeroomWorkspace.jsx');
const docs = read('docs/homeroom-4/phase-1-baseline.md');
assert.match(ws, /import '\.\.\/styles\/homeroom-4-tokens\.css'/);
assert.match(ws, /fastPreferredHomeroom\(currentUser\)/, 'Keep fast GVCN initial opening');
assert.match(ws, /__besAwaitingCloudClass/, 'Keep cloud-only loading guard');
assert.match(ws, /<HomeroomConductTab\s/);
assert.match(ws, /<StudentRecordsTab\s/);
assert.match(ws, /<AttendanceTab\s/);
assert.match(css, /\.page\.hr-page\s*\{/);
assert.doesNotMatch(css, /^:root\s*\{/m, 'No global app tokens');
for(const key of ['primary','teal','violet','coral','ink','surface','outline','focus-ring','duration-normal']){
  assert.match(css, new RegExp('--hr4-'+key+'\\s*:'));
}
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /html\[data-theme="dark"\]/);
assert.doesNotMatch(css, /(?:\.app-shell|\.gradebook|\.attendance-app)\s*\{/, 'Cannot style other apps');
assert.match(docs, /source of truth/);
console.log('Homeroom 4.0 Phase 1: 7 active tabs, scoped design tokens, fast entry & safety contracts OK.');
