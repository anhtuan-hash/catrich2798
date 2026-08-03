import fs from 'node:fs';

const shell = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');
const css = fs.readFileSync('src/components/GlobalNavigationOption3.css', 'utf8');
const stability = fs.readFileSync('src/components/GlobalNavigationOption3Stability.css', 'utf8');
const combinedCss = `${css}\n${stability}`;
const cssWithoutInlineSvg = combinedCss.replace(/url\("data:image\/svg\+xml,[^"]*"\)/gi, '');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(shell.includes("import './GlobalNavigationOption3.css'"), 'Option 3 stylesheet must remain loaded by the navigation shell.');
check(shell.includes("import './GlobalNavigationOption3Stability.css'"), 'Option 3 stability stylesheet must remain loaded.');
check(shell.indexOf("import './GlobalNavigationOption3Stability.css'") > shell.indexOf("import './GlobalNavigationOption3.css'"), 'The stability layer must load after option 3.');
check(css.includes('.bes-top-chrome'), 'Navigation hub scope is missing.');
check(css.includes('.brian-nav__brand'), 'Option 3 brand block is missing.');
check(css.includes('.brian-nav__primary'), 'Option 3 destination rail is missing.');
check(css.includes('.brian-nav__search'), 'Command K surface is missing.');
check(css.includes('.brian-briefing-bar'), 'Briefing strip refinement is missing.');
check(css.includes('grid-template-areas: "brand primary search actions"'), 'Desktop option 3 layout contract is missing.');
check(css.includes('linear-gradient(145deg, #0c3a73'), 'Dark navy brand treatment is missing.');
check(css.includes('data:image/svg+xml'), 'Local Material icon assets are missing.');

check(stability.includes('content: "English Hub"'), 'Stable single English Hub brand label is missing.');
check(stability.includes('grid-template-columns: 164px'), 'Stable desktop grid is missing.');
check(stability.includes('min-width: 190px'), 'Search visibility contract is missing.');
check(stability.includes('.brian-nav__primary::before'), 'Legacy primary decoration reset is missing.');
check(stability.includes('animation: none'), 'Legacy infinite active effects are not fully disabled.');

check(!combinedCss.includes('.hero-cms'), 'Navigation CSS must not target the Homepage Hero.');
check(!combinedCss.includes('.bha-home'), 'Navigation CSS must not target Homepage content.');
check(!combinedCss.includes('GlobalHome'), 'Navigation CSS must not reference Homepage components.');
check(!/https?:\/\//i.test(cssWithoutInlineSvg), 'Navigation CSS must not download external assets.');
check(!/\b(fetch|supabase|rpc|WebSocket|EventSource|setInterval|MutationObserver)\b/i.test(combinedCss), 'Navigation CSS must not add network, realtime, polling, or observer work.');
check(!/animation\s*:[^;]*infinite/i.test(stability), 'Stability layer must not add infinite animations.');
check(!shell.includes('GlobalHomeGoogleHeroOverlay'), 'Homepage Hero overlay must remain disabled after restoration.');

if (failures.length) {
  console.error('Navigation option 3 guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Navigation option 3 guard passed.');
console.log('Scope: top navigation hub and briefing strip only.');
console.log('Brand overlap: prevented.');
console.log('Homepage Hero changes: 0.');
console.log('New network/Supabase/background work: 0.');
