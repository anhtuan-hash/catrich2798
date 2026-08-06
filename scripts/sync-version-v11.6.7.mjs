import fs from 'node:fs';
import './prepare-streamlined-catalog.mjs';
import './patch-ai-workspace-session.mjs';
import './patch-weekly-manager-native-grade-filter.mjs';
import './patch-home-hero-media-optimizer.mjs';
import './patch-home-hero-static-publisher.mjs';

const now = new Date().toISOString();
const removedApplications = [
  'Worksheet Factory',
  'SmartID Identity',
  'Speaking Studio',
  'AI Lesson Integration Studio',
  'Grammar Builder',
  'Writing Studio',
  'Pronunciation Coach',
  'Brian AI Workspace',
  'Classroom Delivery',
  'Learning Intelligence',
  'Lesson Architect',
  'Exam Studio',
  'WordGraph Studio',
  'Learner Sprint',
  'Reading Studio',
  'Assessment Core',
  'Flying Words',
  'Brian Group Maker',
  'Brian Classroom Stage',
  'Teaching Content Ecosystem',
  'Automation Center',
  'Collaboration Hub',
  'Knowledge Train',
  'Vocabulary Orbit',
  'Brian Activity Graph',
  'Crossword Trial',
];

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
  value.removedApplicationsV1167Cleanup = removedApplications;
  value.systemFontCatalog = ['Brian Gesco', 'Quicksand', 'MJ Bexdroga', '1FTV Nasi', 'VL Monologue'];
  value.generatedAt = now;
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

console.log('Version registry synchronized: 11.6.7 · streamlined application catalog');
