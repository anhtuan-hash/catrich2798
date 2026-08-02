import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const paletteEntry = read('src/components/GlobalCommandPalette.jsx');
const palette = read('src/components/GlobalCommandPaletteV21.jsx');
const paletteCss = read('src/components/GlobalCommandPaletteV21.css');
const localData = read('src/commandCenter/localCommandData.js');
const core = read('src/commandCenter/commandCenterCore.js');
const registry = read('src/commandCenter/commandRegistry.js');
const homeroom = read('src/pages/HomeroomWorkspace.jsx');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(paletteEntry.includes("GlobalCommandPaletteV21.jsx"), 'Global Command K entry must point to V2.1.');
check(palette.includes("import('../commandCenter/localCommandData.js')"), 'Local homeroom index must remain dynamically imported.');
check(palette.includes('requestIdleTask'), 'Local indexing must be scheduled during idle time.');
check(palette.includes('useDebouncedValue(query, 70)'), 'Search input must remain debounced.');
check(palette.includes('slice(0, 24)'), 'Rendered search results must remain capped.');
check(!palette.includes('setInterval('), 'Command center must not poll in the background.');
check(!palette.includes('fetch('), 'Command center UI must not make HTTP requests.');
check(!palette.toLowerCase().includes('supabase egress +0'), 'Technical egress copy must not be rendered in the user-facing palette.');

check(palette.includes('groupSearchResults'), 'Grouped result rendering is missing.');
check(palette.includes('command-v21-group'), 'Group headings are missing from the V2.1 palette.');
check(palette.includes('command-v21-inline-actions'), 'Quick actions must render inside the active result.');
check(!palette.includes('command-v2-action-panel'), 'The old fixed action panel must not return.');
check(palette.includes('expandedActionEntryId'), 'Compact more-actions behavior is missing.');
check(paletteCss.includes('max-height: min(700px, 76vh)'), 'V2.1 modal height cap is missing or changed.');
check(paletteCss.includes('@media (max-width: 520px)'), 'Narrow-screen layout guard is missing.');
check(paletteCss.includes('prefers-reduced-motion'), 'Reduced-motion support is missing.');

check(localData.includes('listLocalHomeroomWorkspaces'), 'Command index must use the local workspace catalog.');
check(localData.includes('loadLocalHomeroomWorkspace'), 'Command index must load local workspace snapshots only.');
check(!localData.includes('listHomeroomWorkspaces('), 'Command index must never list cloud workspaces.');
check(!localData.includes('loadHomeroomWorkspace('), 'Command index must never load a cloud workspace.');
check(!localData.includes('supabase'), 'Command index must not import or reference Supabase.');
check(!localData.includes('fetch('), 'Command index must not make HTTP requests.');
check(localData.includes('const MAX_CLASSES = 120'), 'Class indexing cap is missing or changed.');
check(localData.includes('const MAX_STUDENTS = 1400'), 'Student indexing cap is missing or changed.');
check(localData.includes("source: 'local-only'"), 'Local-only telemetry marker is missing.');
check(localData.includes('networkRequests: 0'), 'Zero-network telemetry marker is missing.');

check(core.includes('inferNaturalHomeroomCommand'), 'Local natural-language intent parser is missing.');
check(core.includes('toggleCommandPin'), 'Command pinning is missing.');
check(core.includes('setCommandShortcut'), 'Personal command shortcuts are missing.');
check(core.includes('PENDING_HOMEROOM_ACTION_KEY'), 'Same-tab pending action bridge is missing.');
check(!core.includes('fetch('), 'Command core must not make HTTP requests.');
check(!core.includes('supabase'), 'Command core must not reference Supabase.');

check(registry.includes('registerCommandProvider'), 'Command provider registry is missing.');
check(registry.includes("type: 'select-class'"), 'Parameterized class commands are missing.');
check(registry.includes("type: 'local.clear-history'"), 'Confirmed local history command is missing.');
check(homeroom.includes('consumePendingHomeroomAction'), 'Homeroom command bridge is not connected.');

if (failures.length) {
  console.error('\nCommand Center local-first guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Command Center V2.1 local-first and layout guard passed.');
console.log('Supabase/API requests introduced by Command Center: 0');
console.log('Indexed data source: localStorage workspace snapshots only');
console.log('Hard caps: 120 classes, 1400 active students, 24 visible results');
console.log('UI: grouped results, inline actions, compact modal, responsive safeguards');
