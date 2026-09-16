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
  'Component countdown is a compact inline pill',
  css.includes('.brian-nav__reports-countdown')
    && css.includes('display: inline-flex;')
    && css.includes('border-radius: 999px;')
);
add(
  'Final navigation authority keeps report countdown horizontally inline',
  /\.brian-nav__reports-tab\.shows-countdown\s*\{[\s\S]*?display:\s*inline-flex\s*!important;/.test(navAuthority)
    && !/\.brian-nav__reports-tab\.shows-countdown\s*\{[\s\S]*?display:\s*grid\s*!important;/.test(navAuthority)
);
add(
  'Final navigation authority gives countdown a readable gold pill',
  /\.brian-nav__reports-countdown\s*\{[\s\S]*?height:\s*22px\s*!important;/.test(navAuthority)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?font-size:\s*10px\s*!important;/.test(navAuthority)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?border:\s*1px solid/.test(navAuthority)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?background:\s*linear-gradient/.test(navAuthority)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?color:\s*#684900\s*!important;/.test(navAuthority)
);
add(
  'Active Reports route preserves dark countdown text and gold pill',
  /\.brian-nav__reports-tab:is\(\.is-active,\[aria-current='page'\]\) \.brian-nav__reports-countdown\s*\{[\s\S]*?color:\s*#684900\s*!important;/.test(navAuthority)
    && !/\.brian-nav__reports-tab:is\(\.is-active,\[aria-current='page'\]\) \.brian-nav__reports-countdown\s*\{[\s\S]*?color:\s*#fff\s*!important;/.test(navAuthority)
);
add(
  'Final navigation authority does not clamp countdown to a tiny chip',
  !/\.brian-nav__reports-countdown\s*\{[\s\S]*?max-width:\s*48px\s*!important;/.test(navAuthority)
    && !/\.brian-nav__reports-countdown\s*\{[\s\S]*?height:\s*10px\s*!important;/.test(navAuthority)
    && !/\.brian-nav__reports-countdown\s*\{[\s\S]*?font-size:\s*7\.5px\s*!important;/.test(navAuthority)
);

for (const item of checks) console.log(`${item.pass ? '✓' : '✗'} ${item.name}`);
const failed = checks.filter((item) => !item.pass);
if (failed.length) {
  console.error(`\n❌ Report navbar countdown pill contract FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`\n✅ Report navbar countdown pill contract PASS (${checks.length}/${checks.length})`);
