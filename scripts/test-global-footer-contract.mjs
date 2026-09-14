import fs from 'node:fs';

const mainSource = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const footerSource = fs.readFileSync(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');
const footerCss = fs.readFileSync(new URL('../src/components/FooterAuthCards.css', import.meta.url), 'utf8');
const disclosureCss = fs.readFileSync(new URL('../src/components/FooterCompactDisclosure.css', import.meta.url), 'utf8');
const integrityCss = fs.readFileSync(new URL('../src/components/FooterIntegrity.css', import.meta.url), 'utf8');

const summaryIndex = footerSource.indexOf('className="signature-footer-static-summary"');
const expandedPanelIndex = footerSource.indexOf('className="signature-footer-expanded-panel"');

const checks = [
  {
    name: 'Footer is rendered for every route',
    ok: mainSource.includes('<Footer language={language} currentUser={currentUser} />')
      && !mainSource.includes("!['homeroom-portal', 'dashboard'].includes(currentRoute) ? <Footer"),
  },
  {
    name: 'App shell contains one canonical Footer mount',
    ok: (mainSource.match(/<Footer language=\{language\} currentUser=\{currentUser\} \/>/g) || []).length === 1,
  },
  {
    name: 'Approved card design is global, not login/register scoped',
    ok: !footerCss.includes(":is([data-route='login'], [data-route='register'])"),
  },
  {
    name: 'Footer summary is structurally last after expanded cards',
    ok: expandedPanelIndex >= 0 && summaryIndex > expandedPanelIndex,
  },
  {
    name: 'Nested route footers are suppressed in favor of the app-shell footer',
    ok: /main#bes-main-content footer\.signature-footer-collapsible\s*\{[\s\S]*?display:\s*none\s*!important/.test(integrityCss),
  },
  {
    name: 'Duplicate direct app-shell footers are suppressed',
    ok: /footer\.signature-footer-collapsible\s*~\s*footer\.signature-footer-collapsible\s*\{[\s\S]*?display:\s*none\s*!important/.test(integrityCss),
  },
  {
    name: 'Footer owns an isolated opaque visual zone',
    ok: /footer\.signature-footer-collapsible\s*\{[\s\S]*?isolation:\s*isolate\s*!important/.test(integrityCss)
      && /footer\.signature-footer-collapsible\s*\{[\s\S]*?background:\s*#f8fafc\s*!important/.test(integrityCss),
  },
  {
    name: 'Mobile Home no longer hides the shared footer',
    ok: !disclosureCss.includes("[data-route='home']:has([data-mobile-home-premium]) > footer.signature-footer-collapsible"),
  },
  {
    name: 'Mobile footer stacks cards in one column',
    ok: /@media\s*\(max-width:\s*720px\)[\s\S]*?signature-footer-v50-main[\s\S]*?grid-template-columns:\s*1fr\s*!important/.test(footerCss),
  },
  {
    name: 'Mobile app-shell guard enforces Dashboard footer parity after route styles',
    ok: /@media\s*\(max-width:\s*720px\)[\s\S]*?data-app-shell-footer=['"]true['"][\s\S]*?signature-footer-v50-main[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s*!important/.test(integrityCss)
      && /signature-footer-v50-credentials\s*>\s*ul\s*\{[\s\S]*?display:\s*flex\s*!important[\s\S]*?max-height:\s*none\s*!important/.test(integrityCss)
      && /signature-footer-v50-detail\s*\{[\s\S]*?display:\s*grid\s*!important/.test(integrityCss),
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
