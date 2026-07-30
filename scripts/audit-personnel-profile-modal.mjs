import fs from 'node:fs';

const wrapper = fs.readFileSync('src/components/PersonnelLookupGoogleV2.jsx', 'utf8');
const css = fs.readFileSync('src/styles/personnel-profile-modal.css', 'utf8');

const checks = [
  ['modal stylesheet imported', /personnel-profile-modal\.css/.test(wrapper)],
  ['modal controller mounted', /PersonnelProfileModalController/.test(wrapper)],
  ['escape closes profile', /event\.key === 'Escape'[\s\S]*closeButton\?\.click\(\)/.test(wrapper)],
  ['focus is trapped', /event\.key !== 'Tab'[\s\S]*focusableSelector/.test(wrapper)],
  ['page scroll is locked', /pgt-profile-modal-open/.test(wrapper) && /body\.pgt-profile-modal-open/.test(css)],
  ['dialog is centered', /\.pgt-drawer-layer[\s\S]*align-items:\s*center\s*!important[\s\S]*justify-content:\s*center\s*!important/.test(css)],
  ['dialog height is contained', /\.pgt-drawer[\s\S]*max-height:[\s\S]*overflow:\s*hidden\s*!important/.test(css)],
  ['modal body scrolls internally', /\.pgt-profile-view,[\s\S]*overflow-y:\s*auto\s*!important/.test(css)],
  ['profile view uses two columns', /\.pgt-profile-view\s*\{[\s\S]*grid-template-columns:\s*repeat\(2/.test(css)],
  ['degree cards use compact grid', /\.pgt-degree-view-list\s*\{[\s\S]*grid-template-columns:\s*repeat\(2/.test(css)],
  ['mobile becomes full screen', /@media \(max-width:\s*640px\)[\s\S]*height:\s*100dvh\s*!important/.test(css)],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
console.log(`PASS ${checks.length} personnel profile modal checks`);
