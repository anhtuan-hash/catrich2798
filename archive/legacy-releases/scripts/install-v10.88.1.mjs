import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const sqlPath = path.join(root, 'supabase', 'resource_library_v10_88_1_access_sync_fix.sql');
const checkPath = path.join(root, 'scripts', 'check-resource-library-v10.88.1.mjs');

for (const file of [pkgPath, sqlPath, checkPath]) {
  if (!fs.existsSync(file)) {
    console.error(`Missing required file: ${file}`);
    process.exit(1);
  }
}

const backupDir = path.join(root, '.bes-backup', 'v10.88.1-resource-library');
fs.mkdirSync(backupDir, { recursive: true });
const backupPkg = path.join(backupDir, 'package.json');
if (!fs.existsSync(backupPkg)) fs.copyFileSync(pkgPath, backupPkg);

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts ||= {};
pkg.scripts['test:resource-library-access'] = 'node scripts/check-resource-library-v10.88.1.mjs';
pkg.scripts['verify:v10.88.1'] = 'npm run test:resource-library-access && npm run build && npm test && npm run test:department';
pkg.version = '10.88.1';
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const versionPath = path.join(root, 'public', 'version.json');
if (fs.existsSync(versionPath)) {
  const backupVersion = path.join(backupDir, 'version.json');
  if (!fs.existsSync(backupVersion)) fs.copyFileSync(versionPath, backupVersion);
  try {
    const version = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    version.version = '10.88.1';
    version.release = 'Resource Library Access Sync Fix';
    version.requiresSql = true;
    version.requiredMigration = 'resource_library_v10_88_1_access_sync_fix.sql';
    fs.writeFileSync(versionPath, `${JSON.stringify(version, null, 2)}\n`);
  } catch {
    console.warn('WARN: public/version.json is not valid JSON; left unchanged.');
  }
}

console.log('Installed V10.88.1 package metadata and verification script.');
console.log('IMPORTANT: Run supabase/resource_library_v10_88_1_access_sync_fix.sql in Supabase SQL Editor.');
