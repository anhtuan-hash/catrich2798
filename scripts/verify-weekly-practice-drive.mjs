import fs from 'node:fs';

const weekly = fs.readFileSync('src/utils/weeklyPractice.js', 'utf8');
const publicFile = fs.readFileSync('api/weekly-practice-file.js', 'utf8');
const driveAction = fs.readFileSync('api/weekly-practice-drive-action.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260730090000_weekly_practice_google_drive_v4.sql', 'utf8');

const checks = [
  ['new uploads use Google Drive', weekly.includes("fetch('/api/google-drive-upload'") && weekly.includes("WEEKLY_PRACTICE_DRIVE_STORAGE = 'google-drive'")],
  ['weekly HTML no longer uploads to Supabase Storage', !/storage\s*\.\s*from\(WEEKLY_PRACTICE_BUCKET\)\s*\.\s*upload/.test(weekly)],
  ['public HTML uses caching gateway', weekly.includes('/api/weekly-practice-file') && publicFile.includes('s-maxage=')],
  ['browser persists raw HTML cache', weekly.includes('caches.open(WEEKLY_HTML_CACHE_NAME)') && weekly.includes('pruneOldWeeklyHtml')],
  ['legacy rows migrate to Drive', weekly.includes("driveAction('migrate'") && driveAction.includes('migratedFrom')],
  ['legacy object is removed after successful migration', driveAction.includes('client.storage.from(legacyBucket).remove([legacyPath])')],
  ['direct public Storage access is disabled', migration.includes('drop policy if exists "Public can download published weekly practice HTML"')],
  ['proof image workflow remains separate', weekly.includes("WEEKLY_PRACTICE_PROOF_BUCKET = 'weekly-practice-proofs'")],
];

let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${label}`);
  if (!passed) failed += 1;
}
if (failed) process.exit(1);
