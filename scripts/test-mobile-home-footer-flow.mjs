import fs from 'node:fs';

const homeSource = fs.readFileSync(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8');
const flowCss = fs.readFileSync(new URL('../src/styles/mobile/mobile-home-footer-flow-fix.css', import.meta.url), 'utf8');

const checks = [
  {
    name: 'Mobile Home loads footer flow guard last',
    ok: homeSource.includes("import '../styles/mobile/mobile-home-footer-flow-fix.css';")
      && homeSource.indexOf("mobile-home-footer-flow-fix.css") > homeSource.indexOf("mobile-home-footer-compact.css"),
  },
  {
    name: 'Home main does not reserve bottom-nav space before the shared footer',
    ok: /data-route=['"]home['"][\s\S]*?>\s*main#bes-main-content[\s\S]*?padding-bottom:\s*0\s*!important/.test(flowCss),
  },
  {
    name: 'Premium Home does not add a second bottom spacer',
    ok: /bes-mobile-home\.is-premium[\s\S]*?padding-bottom:\s*0\s*!important/.test(flowCss),
  },
  {
    name: 'Shared mobile Home footer remains visible and close to content',
    ok: /data-app-shell-footer=['"]true['"][\s\S]*?display:\s*flex\s*!important[\s\S]*?margin-top:\s*8px\s*!important/.test(flowCss),
  },
];

let failed = 0;
for (const check of checks) {
  const status = check.ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${check.name}`);
  if (!check.ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed} mobile-home footer flow check(s) failed.`);
  process.exit(1);
}

console.log('\nMobile Home footer flow contract passed.');
