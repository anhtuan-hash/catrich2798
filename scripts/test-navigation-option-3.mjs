import fs from 'node:fs';

const shell = fs.readFileSync('src/components/GlobalFlatNavigation.jsx', 'utf8');
const css = fs.readFileSync('src/components/GlobalNavigationOption3.css', 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(shell.includes("import './GlobalNavigationOption3.css'"), 'Option 3 stylesheet must remain loaded by the navigation shell.');
check(shell.indexOf("import './GlobalNavigationOption3.css'") > shell.indexOf("import './GlobalNavigationSearchV3.css'"), 'Option 3 must remain the final navigation cascade layer.');
check(css.includes('.bes-top-chrome'), 'Navigation hub scope is missing.');
check(css.includes('.brian-nav__brand'), 'Option 3 brand block is missing.');
check(css.includes('.brian-nav__primary'), 'Option 3 destination rail is missing.');
check(css.includes('.brian-nav__search'), 'Command K surface is missing.');
check(css.includes('.brian-briefing-bar'), 'Briefing strip refinement is missing.');
check(css.includes('grid-template-areas: "brand primary search actions"'), 'Desktop option 3 layout contract is missing.');
check(css.includes('linear-gradient(145deg, #0c3a73'), 'Dark navy brand treatment is missing.');
check(css.includes('data:image/svg+xml'), 'Local Material icon assets are missing.');

check(!css.includes('.hero-cms'), 'Option 3 must not target the Homepage Hero.');
check(!css.includes('.bha-home'), 'Option 3 must not target Homepage content.');
check(!css.includes('GlobalHome'), 'Option 3 must not reference Homepage components.');
check(!/https?:\/\//i.test(css), 'Option 3 must not download external CSS assets.');
check(!/\b(fetch|supabase|rpc|WebSocket|EventSource|setInterval|MutationObserver)\b/i.test(css), 'Option 3 must not add network, realtime, polling, or observer work.');
check(!/animation\s*:[^;]*infinite/i.test(css), 'Option 3 must not add infinite animations.');
check(!shell.includes('GlobalHomeGoogleHeroOverlay'), 'Homepage Hero overlay must remain disabled after restoration.');

if (failures.length) {
  console.error('Navigation option 3 guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Navigation option 3 guard passed.');
console.log('Scope: top navigation hub and briefing strip only.');
console.log('Homepage Hero changes: 0.');
console.log('New network/Supabase/background work: 0.');
