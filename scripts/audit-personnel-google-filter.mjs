import fs from 'node:fs';

const wrapper = fs.readFileSync('src/components/PersonnelLookupGoogleV2.jsx', 'utf8');
const css = fs.readFileSync('src/styles/personnel-google-material-v3.css', 'utf8');

const checks = [
  ['real filter trigger', /pgt-filter-button/.test(wrapper) && /addEventListener\('click', togglePanel\)/.test(wrapper)],
  ['filter proxies existing chips', /chip\.click\(\)/.test(wrapper)],
  ['clear filter action', /allChip\?\.click\(\)/.test(wrapper)],
  ['keyboard escape support', /event\.key !== 'Escape'/.test(wrapper)],
  ['search field forced visible', /\.pgt-search\{[\s\S]*display:flex!important/.test(css)],
  ['material metric cards', /\.pgt-metric\{[\s\S]*border-radius:20px!important/.test(css)],
  ['material filter popover', /\.pgt-advanced-filter-panel\{/.test(css)],
  ['selected row material state', /\.pgt-row\.is-selected\{/.test(css)],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
console.log(`PASS ${checks.length} personnel Google filter checks`);
