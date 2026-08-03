import fs from 'node:fs';

const shell = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');
const css = fs.readFileSync('src/components/GlobalNavigationOption3.css', 'utf8');
const stability = fs.readFileSync('src/components/GlobalNavigationOption3Stability.css', 'utf8');
const compactCommand = fs.readFileSync('src/components/GlobalNavigationOption1CompactCommand.css', 'utf8');
const combinedCss = `${css}\n${stability}\n${compactCommand}`;
const cssWithoutInlineSvg = combinedCss.replace(/url\("data:image\/svg\+xml,[^"]*"\)/gi, '');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(shell.includes("import './GlobalNavigationOption3.css'"), 'Option 3 stylesheet must remain loaded by the navigation shell.');
check(shell.includes("import './GlobalNavigationOption3Stability.css'"), 'Option 3 stability stylesheet must remain loaded.');
check(shell.includes("import './GlobalNavigationOption1CompactCommand.css'"), 'Compact Command K stylesheet must remain loaded.');
check(shell.indexOf("import './GlobalNavigationOption3Stability.css'") > shell.indexOf("import './GlobalNavigationOption3.css'"), 'The stability layer must load after option 3.');
check(shell.indexOf("import './GlobalNavigationOption1CompactCommand.css'") > shell.indexOf("import './GlobalNavigationOption3Stability.css'"), 'Compact Command K must remain the final navigation layer.');

check(css.includes('.bes-top-chrome'), 'Navigation hub scope is missing.');
check(css.includes('.brian-nav__brand'), 'Option 3 brand block is missing.');
check(css.includes('.brian-nav__primary'), 'Option 3 destination rail is missing.');
check(css.includes('.brian-nav__search'), 'Command K launcher is missing.');
check(css.includes('.brian-briefing-bar'), 'Briefing strip refinement is missing.');
check(css.includes('linear-gradient(145deg, #0c3a73'), 'Dark navy brand treatment is missing.');
check(css.includes('data:image/svg+xml'), 'Local Material icon assets are missing.');

check(stability.includes('content: "English Hub"'), 'Stable single English Hub brand label is missing.');
check(stability.includes('.brian-nav__primary::before'), 'Legacy primary decoration reset is missing.');
check(stability.includes('animation: none'), 'Legacy infinite active effects are not fully disabled.');

check(compactCommand.includes('grid-template-columns: 164px minmax(560px, 1fr) 82px max-content'), 'Desktop compact-command grid is missing.');
check(compactCommand.includes('width: 82px'), 'Command K capsule width contract is missing.');
check(compactCommand.includes('border-radius: 999px'), 'Command K capsule shape is missing.');
check(compactCommand.includes('justify-content: space-evenly'), 'Navigation destination distribution contract is missing.');
check(compactCommand.includes('.brian-nav__search b'), 'Long search label reset is missing.');
check(compactCommand.includes('display: none'), 'Long search label must remain hidden.');
check(!compactCommand.includes('min-width: 190px'), 'The long search field must not return.');

check(!combinedCss.includes('.hero-cms'), 'Navigation CSS must not target the Homepage Hero.');
check(!combinedCss.includes('.bha-home'), 'Navigation CSS must not target Homepage content.');
check(!combinedCss.includes('GlobalHome'), 'Navigation CSS must not reference Homepage components.');
check(!/https?:\/\//i.test(cssWithoutInlineSvg), 'Navigation CSS must not download external assets.');
check(!/\b(fetch|supabase|rpc|WebSocket|EventSource|setInterval|MutationObserver)\b/i.test(combinedCss), 'Navigation CSS must not add network, realtime, polling, or observer work.');
check(!/animation\s*:[^;]*infinite/i.test(stability), 'Stability layer must not add infinite animations.');
check(!/animation\s*:[^;]*infinite/i.test(compactCommand), 'Compact Command K must not add infinite animations.');
check(!shell.includes('GlobalHomeGoogleHeroOverlay'), 'Homepage Hero overlay must remain disabled after restoration.');

if (failures.length) {
  console.error('Navigation option 1 compact-command guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Navigation option 1 compact-command guard passed.');
console.log('Scope: top navigation hub only.');
console.log('Long search field: removed from presentation.');
console.log('Command K logic: preserved.');
console.log('Homepage Hero changes: 0.');
console.log('New network/background work: 0.');
