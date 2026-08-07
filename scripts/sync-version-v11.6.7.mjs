import fs from 'node:fs';
import './patch-ai-workspace-session.mjs';
import './patch-weekly-manager-native-grade-filter.mjs';
import './patch-home-hero-media-optimizer.mjs';
import './patch-home-hero-static-publisher.mjs';

const now = new Date().toISOString();

for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  value.version = '11.6.7';
  if (file.endsWith('version.json')) value.releaseName = 'Streamlined Application Catalog';
  else value.release = 'Streamlined Application Catalog';
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

console.log('Version registry synchronized: 11.6.7 · streamlined application catalog');
