import fs from 'node:fs';

const jsx = fs.readFileSync('src/components/GlobalReportsNavigationTab.jsx', 'utf8');
const css = fs.readFileSync('src/components/GlobalReportsNavigationTab.css', 'utf8');
const navAuthority = fs.readFileSync('src/styles/GlobalNavigationFinal2026.css', 'utf8');

const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });

add(
  'Vietnamese countdown includes days plus HH:MM:SS detail',
  jsx.includes("`${days} ngày ${clock}`")
    && jsx.includes("const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;")
);
add(
  'Countdown uses remainder hours/minutes/seconds rather than accumulated totals',
  jsx.includes('Math.floor((totalMs % 86400000) / 3600000)')
    && jsx.includes('Math.floor((totalMs % 3600000) / 60000)')
    && jsx.includes('Math.floor((totalMs % 60000) / 1000)')
);
add(
  'Countdown is rendered whenever a report window is open',
  jsx.includes('const showCountdownUnderLabel = reportWindowOpen;')
);
add(
  'Legacy nav authority still exists and is deliberately outranked',
  navAuthority.includes('min-height: 40px !important;')
    && navAuthority.includes('font-size: 12.5px !important;')
);
add(
  'Primary navigation pills use the compact shared 36px geometry',
  /\.brian-nav__primary > :is\(button,a,\[role='button'\]\)\s*\{[\s\S]*?min-height:\s*36px\s*!important;[\s\S]*?height:\s*36px\s*!important;[\s\S]*?max-height:\s*36px\s*!important;/.test(css)
    && css.includes('font-size: 11.75px !important;')
    && css.includes('padding: 0 9px 0 28px !important;')
);
add(
  'Compact nav icons shrink with the pills',
  css.includes('left: 9px !important;')
    && css.includes('width: 14px !important;')
    && css.includes('height: 14px !important;')
);
add(
  'Report component keeps the countdown inline within the shared compact height',
  /\.brian-nav__reports-tab\.brian-nav__reports-send\.shows-countdown\s*\{[\s\S]*?min-height:\s*36px\s*!important;[\s\S]*?height:\s*36px\s*!important;[\s\S]*?max-height:\s*36px\s*!important;/.test(css)
    && /\.brian-nav__reports-copy\s*\{[\s\S]*?display:\s*inline-flex\s*!important;/.test(css)
);
add(
  'Detailed countdown chip stays readable but compact',
  /\.brian-nav__reports-countdown\s*\{[\s\S]*?height:\s*20px\s*!important;/.test(css)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?font-size:\s*9.5px\s*!important;/.test(css)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?padding:\s*0 7px\s*!important;/.test(css)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?white-space:\s*nowrap\s*!important;/.test(css)
);
add(
  'Active Reports route keeps dark countdown text instead of white-on-pale',
  /\.brian-nav__reports-tab\.brian-nav__reports-send:is\(\.is-active,\[aria-current='page'\]\) \.brian-nav__reports-countdown\s*\{[\s\S]*?color:\s*#684900\s*!important;/.test(css)
);

for (const item of checks) console.log(`${item.pass ? '✓' : '✗'} ${item.name}`);
const failed = checks.filter((item) => !item.pass);
if (failed.length) {
  console.error(`\n❌ Report navbar compact countdown contract FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`\n✅ Report navbar compact countdown contract PASS (${checks.length}/${checks.length})`);
