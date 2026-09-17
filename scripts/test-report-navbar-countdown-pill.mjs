import fs from 'node:fs';

const jsx = fs.readFileSync('src/components/GlobalReportsNavigationTab.jsx', 'utf8');
const css = fs.readFileSync('src/components/GlobalReportsNavigationTab.css', 'utf8');
const navAuthority = fs.readFileSync('src/styles/GlobalNavigationFinal2026.css', 'utf8');
const navCompact = fs.readFileSync('src/styles/GlobalNavigationCompactPills.css', 'utf8');

const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });

add(
  'Detailed report countdown keeps day plus HH:MM:SS instead of day-only text',
  jsx.includes("const hours = Math.floor((totalMs % 86400000) / 3600000);")
    && jsx.includes("const minutes = Math.floor((totalMs % 3600000) / 60000);")
    && jsx.includes("const seconds = Math.floor((totalMs % 60000) / 1000);")
    && jsx.includes("const clock = [hours, minutes, seconds]")
    && jsx.includes("padStart(2, '0')")
    && jsx.includes("`${days} ngày ${clock}`")
    && jsx.includes("`${days}d ${clock}`")
    && !jsx.includes("if (days > 0) return language === 'vi' ? `${days} ngày` : `${days}d`;")
);
add(
  'Sub-day countdown still renders a full clock including seconds',
  jsx.includes('return clock;')
    && jsx.includes('window.setInterval(() => setNow(Date.now()), 1000)')
);
add(
  'Countdown is rendered whenever a report window is open',
  jsx.includes('const showCountdownUnderLabel = reportWindowOpen;')
);
add(
  'Compact nav layer declares one geometry for all primary destinations',
  navCompact.includes('--bes-nav-pill-height: 38px')
    && navCompact.includes('--bes-nav-pill-radius: 13px')
    && navCompact.includes('--bes-nav-pill-font-size: 12px')
    && navCompact.includes('--bes-nav-pill-icon-size: 14px')
);
add(
  'All primary pills consume the shared compact height, radius and type scale',
  navCompact.includes('min-height: var(--bes-nav-pill-height) !important;')
    && navCompact.includes('height: var(--bes-nav-pill-height) !important;')
    && navCompact.includes('max-height: var(--bes-nav-pill-height) !important;')
    && navCompact.includes('border-radius: var(--bes-nav-pill-radius) !important;')
    && navCompact.includes('font-size: var(--bes-nav-pill-font-size) !important;')
);
add(
  'Primary icons are reduced through the shared compact icon token',
  navCompact.includes('width: var(--bes-nav-pill-icon-size) !important;')
    && navCompact.includes('min-width: var(--bes-nav-pill-icon-size) !important;')
    && navCompact.includes('height: var(--bes-nav-pill-icon-size) !important;')
    && navCompact.includes('min-height: var(--bes-nav-pill-icon-size) !important;')
);
add(
  'Report module loads the compact geometry after its component styles',
  jsx.includes("import '../styles/GlobalNavigationCompactPills.css';")
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
  'Reports button shares the same compact height as every other primary pill',
  /\.brian-nav__reports-tab\.brian-nav__reports-send\.shows-countdown\s*\{[\s\S]*?min-height:\s*var\(--bes-nav-pill-height\)\s*!important;/.test(css)
    && /\.brian-nav__reports-tab\.brian-nav__reports-send\.shows-countdown\s*\{[\s\S]*?height:\s*var\(--bes-nav-pill-height\)\s*!important;/.test(css)
    && /\.brian-nav__reports-tab\.brian-nav__reports-send\.shows-countdown\s*\{[\s\S]*?max-height:\s*var\(--bes-nav-pill-height\)\s*!important;/.test(css)
);
add(
  'Winning override keeps Reports content horizontally inline',
  /\.brian-nav__reports-tab\.brian-nav__reports-send\.shows-countdown\s*\{[\s\S]*?display:\s*inline-flex\s*!important;/.test(css)
    && /\.brian-nav__reports-copy\s*\{[\s\S]*?display:\s*inline-flex\s*!important;/.test(css)
);
add(
  'Detailed countdown pill stays readable, stable-width and warm gold',
  /\.brian-nav__reports-countdown\s*\{[\s\S]*?height:\s*20px\s*!important;/.test(css)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?min-width:\s*92px\s*!important;/.test(css)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?font-size:\s*9\.5px\s*!important;/.test(css)
    && /\.brian-nav__reports-countdown\s*\{[\s\S]*?font-variant-numeric:\s*tabular-nums\s*!important;/.test(css)
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
  console.error(`\n❌ Compact navbar + detailed report countdown contract FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`\n✅ Compact navbar + detailed report countdown contract PASS (${checks.length}/${checks.length})`);
