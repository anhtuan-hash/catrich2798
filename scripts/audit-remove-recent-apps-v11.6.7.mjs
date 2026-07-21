import fs from 'node:fs';

const webApps = fs.readFileSync(new URL('../src/pages/WebApps.jsx', import.meta.url), 'utf8');
const legacyCss = fs.readFileSync(new URL('../src/styles/legacy/06-current-features.css', import.meta.url), 'utf8');
const launcherCss = fs.readFileSync(new URL('../src/styles/v1136.css', import.meta.url), 'utf8');

const checks = [
  ['recent heading removed', !webApps.includes('Mở gần đây') && !webApps.includes('Recently opened')],
  ['recent subtitle removed', !webApps.includes('Tiếp tục công việc đang làm') && !webApps.includes('Continue where you left off')],
  ['recent component removed', !webApps.includes('launcher-recent-strip') && !webApps.includes('launcher-recent-chips')],
  ['recent usage subscription removed from Apps', !webApps.includes('getAppUsage') && !webApps.includes('subscribeAppUsage') && !webApps.includes('recentItems')],
  ['legacy recent styles removed', !legacyCss.includes('launcher-recent-strip') && !legacyCss.includes('launcher-recent-chips')],
  ['V11 launcher recent selector removed', !launcherCss.includes('launcher-recent-strip')],
  ['search retained', webApps.includes('launcher-search-box') && webApps.includes('normalizedSearch')],
  ['density retained', webApps.includes('bes-launcher-density') && webApps.includes('launcher-density-switch')],
];

const failed = checks.filter(([, pass]) => !pass);
for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}`);
if (failed.length) {
  console.error(`Recent Apps removal audit FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`Recent Apps removal audit PASS (${checks.length}/${checks.length})`);
