import fs from 'node:fs';

const portal = fs.readFileSync('src/pages/BrianTeamPortal.jsx', 'utf8');
const hero = fs.readFileSync('src/pages/MonthlyReportsInteractiveHero.jsx', 'utf8');
const bundle = fs.readFileSync('src/styles/MonthlyReportsRouteBundle.css', 'utf8');
const skinPath = 'src/styles/MonthlyReportsTwoColumnV18.css';
const skin = fs.existsSync(skinPath) ? fs.readFileSync(skinPath, 'utf8') : '';

const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });

add(
  'Teacher report content is wrapped in a dedicated two-column layout',
  portal.includes('className="btp-report-grid"')
    && portal.includes('<MonthlyReportsWorkspace currentUser={currentUser} />')
    && portal.includes('<MonthlyReportsInteractiveHero />')
);

add(
  'Leader personal report uses the same two-column layout',
  portal.includes('currentUser={teacherViewUser}')
    && (portal.match(/btp-report-grid/g) || []).length >= 2
);

add(
  'Interactive companion exposes status, section progress, and guidance sidebar cards',
  hero.includes('mr-report-side-status')
    && hero.includes('mr-report-side-sections')
    && hero.includes('mr-report-side-guide')
);

add(
  'Sidebar keeps preview, edit, draft-save and submit workflow access',
  hero.includes('handlePreview')
    && hero.includes('handleSaveDraft')
    && hero.includes('handleSubmit')
    && hero.includes('Chỉnh sửa báo cáo')
);

add(
  'Final route bundle imports the V18 two-column visual authority last',
  bundle.trimEnd().endsWith("@import './MonthlyReportsTwoColumnV18.css';")
);

add(
  'Desktop app content uses an explicit two-column grid',
  /\.btp-report-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(280px,\s*clamp\(300px,\s*29vw,\s*390px\)\)/.test(skin)
);

add(
  'Sidebar is sticky on desktop and collapses to one column responsively',
  /\.mr-report-sidebar\s*\{[\s\S]*?position:\s*sticky/.test(skin)
    && /@media\s*\(max-width:\s*1080px\)[\s\S]*?\.btp-report-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/.test(skin)
);

add(
  'Five editor sections receive the approved blue green violet amber red identities',
  ['#2878d0', '#16945b', '#7653d6', '#df7b12', '#e34d5b'].every((token) => skin.toLowerCase().includes(token))
);

add(
  'Global navigation and global footer are outside the V18 selector scope',
  !skin.includes('.brian-nav')
    && !skin.includes('.bes-top-chrome')
    && !skin.includes('footer.site-footer')
    && !skin.includes('.global-footer')
);

for (const item of checks) console.log(`${item.pass ? '✓' : '✗'} ${item.name}`);
const failed = checks.filter((item) => !item.pass);
if (failed.length) {
  console.error(`\n❌ Monthly report two-column visual contract FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`\n✅ Monthly report two-column visual contract PASS (${checks.length}/${checks.length})`);
