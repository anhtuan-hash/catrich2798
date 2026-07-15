import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '12.29.0',
    release: 'Lesson Pack Connected Workflow',
    releaseName: 'Lesson Pack Connected Workflow',
    runtimeCore: '3.6.2',
    lessonPackWorkflowV2: true,
    lessonPackSixStepFlow: true,
    lessonPackSidebar: false,
    lessonPackModernHero: true,
    lessonPackConnectedDelivery: true,
    requiresSql: false,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 12.29.0');
