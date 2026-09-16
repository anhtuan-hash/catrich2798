import fs from 'node:fs';

const jsx = fs.readFileSync('src/components/GlobalReportsNavigationTab.jsx', 'utf8');
const css = fs.readFileSync('src/components/GlobalReportsNavigationTab.css', 'utf8');
const navAuthority = fs.readFileSync('src/styles/GlobalNavigationFinal2026.css', 'utf8');

const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });

add(
  'Vietnamese day countdown uses readable day label',
  jsx.includes("`${days} ngày`") && !jsx.includes("`${days}n`")
);
add(
  'Countdown is rendered whenever a report window is open',
  jsx.includes('const showCountdownUnderLabel = reportWindowOpen;')
);
add(
  'Global nav authority contains the legacy tiny-chip rule that must be outranked',
  navAuthority.includes('font-size: 7.5px !important;')
    && navAuthority.includes('height: 10px !important;')
);
add(
  'Report component installs a higher-specificity final countdown override',
  css.includes('html body #root .app-shell[data-route] .brian-nav__primary > .brian-nav__reports-tab.brian-nav__reports-send.shows-countdown')
);
add(
  'Winning override keeps Reports content horizontally inline',
  /\.brian-nav__reports-tab\.brian-nav__reports-send\.shows-countdown\s*\{[\s\S]*?display:\s*inline-flex\s*!important;/.test(css)
    && /\.brian-nav__reports-copy\s*\{[\s\S]*?display:\s*inline-flex\s*!important;/.test(css)
);
add(
  'Winning countdown pill is readable and warm gold',
  /\.brian-nav__reports-countdown\s*\{[\s\S]*?height:\s*22px\s*!important;/.test(css)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?font-size:\s*10px\s*!important;/.test(css)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?border:\s*1px solid/.test(css)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?background:\s*linear-gradient/.test(css)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?color:\s*#684900\s*!important;/.test(css)
);
add(
  'Active Reports route keeps dark countdown text instead of white-on-pale',
  /\.brian-nav__reports-tab\.brian-nav__reports-send:is\(\.is-active,\[aria-current='page'\]\) \.brian-nav__reports-countdown\s*\{[\s\S]*?color:\s*#684900\s*!important;/.test(css)
);

for (const item of checks) console.log(`${item.pass ? '✓' : '✗'} ${item.name}`);
const failed = checks.filter((item) => !item.pass);
if (failed.length) {
  console.error(`\n❌ Report navbar countdown pill contract FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`\n✅ Report navbar countdown pill contract PASS (${checks.length}/${checks.length})`);
