import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const paletteEntry = read('src/components/GlobalCommandPalette.jsx');
const palette = read('src/components/GlobalCommandPaletteV21.jsx');
const paletteCss = read('src/components/GlobalCommandPaletteV21.css');
const hoverCss = read('src/components/GlobalCommandPaletteV22HoverFix.css');
const localData = read('src/commandCenter/localCommandData.js');
const core = read('src/commandCenter/commandCenterCore.js');
const registry = read('src/commandCenter/commandRegistry.js');
const homeroom = read('src/pages/HomeroomWorkspace.jsx');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(paletteEntry.includes("GlobalCommandPaletteV21.jsx"), 'Global Command K entry must point to V2.1.');
check(paletteEntry.includes("GlobalCommandPaletteV22HoverFix.css"), 'Interaction cleanup must load after the base palette styles.');
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
check(paletteCss.includes('max-height: min(760px, 79vh)'), 'Apple-style modal height cap is missing or changed.');
check(paletteCss.includes('backdrop-filter: blur(34px) saturate(170%)'), 'Apple-style frosted glass surface is missing.');
check(paletteCss.includes('font-family: -apple-system'), 'Apple system font stack is missing.');
check(paletteCss.includes('border-radius: 30px'), 'Apple-style modal radius is missing.');
check(paletteCss.includes('html[data-theme="dark"]'), 'Dark mode support is missing.');
check(paletteCss.includes('@media (max-width: 520px)'), 'Narrow-screen layout guard is missing.');
check(paletteCss.includes('prefers-reduced-motion'), 'Reduced-motion support is missing.');

check(hoverCss.includes('-webkit-focus-ring-color: transparent !important'), 'Browser focus ring must remain disabled.');
check(hoverCss.includes('outline: 0 !important'), 'Command palette outlines must remain disabled.');
check(hoverCss.includes('background: var(--cmd-active-neutral) !important'), 'Selected results must use a neutral background.');
check(hoverCss.includes(':focus-visible::before'), 'Focus pseudo-elements must remain disabled.');
check(hoverCss.includes('content: none !important'), 'Global focus decorations must remain suppressed.');
check(!hoverCss.includes('--cmd-keyboard-ring'), 'No keyboard focus ring token may return.');
check(!hoverCss.includes('inset 2px 0 0'), 'No blue edge indicator may return.');
check(!hoverCss.includes('inset 3px 0 0'), 'No thick blue edge indicator may return.');
check(hoverCss.includes('@media (forced-colors: active)'), 'High-contrast fallback is missing.');
check(!hoverCss.includes('fetch('), 'Interaction cleanup must remain CSS-only and make no requests.');
check(!hoverCss.toLowerCase().includes('supabase'), 'Interaction cleanup must not reference Supabase.');

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

console.log('Command Center no-frame local-first guard passed.');
console.log('Supabase/API requests introduced by Command Center: 0');
console.log('Indexed data source: localStorage workspace snapshots only');
console.log('Hard caps: 120 classes, 1400 active students, 24 visible results');
console.log('UI: no blue borders, no focus rings, no edge indicators, neutral selection only');
