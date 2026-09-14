import fs from 'node:fs';

const mainSource = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const footerCss = fs.readFileSync(new URL('../src/components/FooterAuthCards.css', import.meta.url), 'utf8');

const checks = [
  {
    name: 'Footer is rendered for every route',
    ok: mainSource.includes('<Footer language={language} currentUser={currentUser} />')
      && !mainSource.includes("!['homeroom-portal', 'dashboard'].includes(currentRoute) ? <Footer"),
  },
  {
    name: 'Approved card design is global, not login/register scoped',
    ok: !footerCss.includes(":is([data-route='login'], [data-route='register'])"),
  },
  {
    name: 'Mobile Home no longer hides the shared footer',
    ok: !footerCss.includes("[data-route='home']:has([data-mobile-home-premium]) > footer.signature-footer-collapsible"),
  },
  {
    name: 'Mobile footer stacks cards in one column',
    ok: /@media\s*\(max-width:\s*720px\)[\s\S]*?signature-footer-v50-main[\s\S]*?grid-template-columns:\s*1fr\s*!important/.test(footerCss),
  },
];

let failed = 0;
for (const check of checks) {
  const status = check.ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${check.name}`);
  if (!check.ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed} global-footer contract check(s) failed.`);
  process.exit(1);
}

console.log('\nGlobal footer contract passed.');
