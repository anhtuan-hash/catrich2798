import fs from 'node:fs';

const jsx = fs.readFileSync('src/components/GlobalReportsNavigationTab.jsx', 'utf8');
const css = fs.readFileSync('src/components/GlobalReportsNavigationTab.css', 'utf8');

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
  'Countdown is a compact inline pill',
  css.includes('.brian-nav__reports-countdown')
    && css.includes('display: inline-flex;')
    && css.includes('border-radius: 999px;')
);
add(
  'Countdown pill has a distinct warm background and border',
  css.includes('background: linear-gradient(')
    && css.includes('border: 1px solid')
);
add(
  'Countdown pill has internal horizontal padding',
  /\.brian-nav__reports-countdown[\s\S]*padding:\s*[^;]+;/.test(css)
);
add(
  'Countdown pill stays vertically centered with the report label',
  /\.brian-nav__reports-copy[\s\S]*align-items:\s*center;/.test(css)
    && /\.brian-nav__reports-countdown[\s\S]*align-items:\s*center;/.test(css)
);

for (const item of checks) console.log(`${item.pass ? '✓' : '✗'} ${item.name}`);
const failed = checks.filter((item) => !item.pass);
if (failed.length) {
  console.error(`\n❌ Report navbar countdown pill contract FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`\n✅ Report navbar countdown pill contract PASS (${checks.length}/${checks.length})`);
