import fs from 'node:fs';
const removedRoutes = ['ai-workspace','content-factory','lesson-pack','classroom-delivery','classroom-join','learning-intelligence'];
const runtimeFiles = [
  'src/main.jsx','src/data/apps.js','src/components/GlobalFlatNavigation.jsx','src/ui-core/components/UICommandCenter.jsx',
  'src/ui-core/layouts/routeLayout.js','src/ui-core/runtime/workspaceRegistry.js','src/utils/permissions.js',
  'src/components/ContentTransferHub.jsx','src/utils/contentEcosystem.js','src/pages/ContentEcosystem.jsx'
];
let failed = 0;
for (const file of runtimeFiles) {
  const text = fs.readFileSync(file,'utf8');
  for (const route of removedRoutes) {
    if (text.includes(`'${route}'`) || text.includes(`"${route}"`) || text.includes(`#/${route}`)) {
      console.error(`FAIL ${file} still references ${route}`); failed++;
    }
  }
}
for (const file of ['src/pages/AIWorkspace.jsx','src/pages/ContentFactory.jsx','src/pages/LessonPack.jsx','src/pages/ClassroomDelivery.jsx','src/pages/ClassroomJoin.jsx','src/pages/LearningIntelligence.jsx']) {
  if (fs.existsSync(file)) { console.error(`FAIL retired page still exists: ${file}`); failed++; }
}
const apps = fs.readFileSync('src/data/apps.js','utf8');
for (const label of ['Brian AI Workspace','Teaching Content Factory','Lesson Pack','Classroom Delivery','Learning Intelligence']) {
  if (apps.includes(label)) { console.error(`FAIL app catalog still contains ${label}`); failed++; }
}
if (failed) process.exit(1);
console.log('V12.30.0 retired-app cleanup verified.');
