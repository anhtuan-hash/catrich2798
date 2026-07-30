import fs from 'node:fs';

const dashboard = fs.readFileSync(new URL('../src/pages/WorkDashboard.jsx', import.meta.url), 'utf8');
const component = fs.readFileSync(new URL('../src/components/PersonnelLookup.jsx', import.meta.url), 'utf8');
const cloud = fs.readFileSync(new URL('../src/utils/personnelDirectoryCloud.js', import.meta.url), 'utf8');

const checks = [
  [dashboard.includes('<PersonnelLookup currentUser={currentUser} language={language} />'), 'Personnel lookup is visible on every authenticated dashboard'],
  [component.includes('submitPersonnelProposal'), 'Teacher proposal action is connected'],
  [component.includes('reviewPersonnelProposal'), 'TTCM review action is connected'],
  [component.includes('t.approve') && component.includes('t.requestChanges'), 'Approve and request-changes controls exist'],
  [cloud.includes("PERSONNEL_SOURCE_MODULE = 'personnel-directory-v2'"), 'Cloud source module is stable'],
  [cloud.includes(".from('work_hub_items')"), 'Profiles use shared Supabase storage'],
  [cloud.includes('migrateLegacyPersonnelRecords'), 'Legacy local profiles are migrated'],
  [!component.includes("localStorage.setItem('bes-personnel-directory-v1'"), 'Component no longer writes professional data to legacy localStorage'],
];

const failed = checks.filter(([ok]) => !ok);
checks.forEach(([ok, label]) => console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`));
if (failed.length) process.exit(1);
