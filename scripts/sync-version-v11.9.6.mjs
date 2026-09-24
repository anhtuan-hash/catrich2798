import fs from 'node:fs';
import './prepare-streamlined-catalog-v3.mjs';
import './patch-ai-workspace-session.mjs';
import './patch-weekly-manager-native-grade-filter.mjs';
import './patch-home-hero-media-optimizer.mjs';
import './patch-home-hero-static-publisher.mjs';

const now = new Date().toISOString();
const expectedVersion = '11.9.6';
const expectedRelease = 'Golden Bank & Exam Factory · Production Certified · Brian Plugin/MCP';

const indexPath = 'index.html';
if (fs.existsSync(indexPath)) {
  const index = fs.readFileSync(indexPath, 'utf8');
  const next = /<meta\s+name=["']bes-app-version["']\s+content=["'][^"']*["']\s*\/?>/i.test(index)
    ? index.replace(
        /<meta\s+name=["']bes-app-version["']\s+content=["'][^"']*["']\s*\/?>/i,
        `<meta name="bes-app-version" content="${expectedVersion}">`,
      )
    : index.replace('</head>', `  <meta name="bes-app-version" content="${expectedVersion}">\n</head>`);
  fs.writeFileSync(indexPath, next);
}

for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  value.version = expectedVersion;
  value.releaseName = expectedRelease;
  if (file.endsWith('release-manifest.json')) {
    value.release = expectedRelease;
  }
  value.runtimeCore = '2.6.7';
  value.runtime = '2.6.7';
  value.requiresSql = false;
  delete value.requiredMigration;
  delete value.sharedBackgroundMusic;
  delete value.sharedBackgroundMusicAdminUpload;
  delete value.sharedBackgroundMusicRealtime;
  delete value.sharedBackgroundMusicTeacherReadOnly;
  delete value.sharedBackgroundMusicSetupFile;
  delete value.removedApplicationsV1167Cleanup;
  value.systemFontCatalog = ['Brian Gesco', 'Quicksand', 'MJ Bexdroga', '1FTV Nasi', 'VL Monologue'];
  value.generatedAt = now;
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

console.log('Version registry synchronized: 11.9.6 · Golden Bank & Exam Factory · Production Certified · Brian Plugin/MCP');
