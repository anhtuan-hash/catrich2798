import fs from 'node:fs';
import './patch-ai-workspace-session.mjs';

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
  value.removedApplicationsV1167Cleanup = removedApplications;
  value.generatedAt = now;
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

console.log('Version registry synchronized: 11.6.7');
