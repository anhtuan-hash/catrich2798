import fs from 'node:fs';
import path from 'node:path';

const removedSlugs = [
  'worksheet-factory', 'smart-id', 'speaking-studio', 'english-lesson-integration',
  'grammar-builder', 'writing-studio', 'pronunciation-coach', 'ai-workspace',
  'classroom-delivery', 'classroom-join', 'learning-intelligence', 'department-workspace',
];

const removedTitles = [
  'Worksheet Factory', 'SmartID Identity', 'Speaking Studio', 'AI Lesson Integration Studio',
  'Grammar Builder', 'Writing Studio', 'Pronunciation Coach', 'Brian AI Workspace',
  'Classroom Delivery', 'Learning Intelligence', 'Department Workspace',
];

const removedPaths = [
  'src/pages/WorksheetFactory.jsx', 'src/pages/WorksheetFactory.css', 'src/utils/worksheetFactory.js',
  'src/pages/SmartIdStudio.jsx', 'src/pages/SmartIdStudio.css',
  'src/pages/SpeakingStudio.jsx',
  'src/pages/EnglishLessonIntegrationStudio.jsx', 'src/components/LessonIntegrationBridgeAdapter.jsx',
  'src/vendor/englishLessonIntegration', 'public/bes-elis-v1142',
  'src/pages/GrammarBuilder.jsx', 'src/pages/GrammarBuilder.css',
  'src/pages/WritingStudio.jsx', 'src/pages/WritingStudio.css',
  'src/pages/PronunciationCoach.jsx', 'src/pages/PronunciationCoach.css',
  'src/pages/AIWorkspace.jsx', 'src/utils/aiWorkspaceFallback.js',
  'src/pages/ClassroomDelivery.jsx', 'src/pages/ClassroomJoin.jsx', 'src/utils/classroomDelivery.js',
  'src/pages/LearningIntelligence.jsx',
  'src/pages/DepartmentWorkspace.jsx', 'src/pages/DepartmentWorkspaceModernFields.css', 'src/pages/DepartmentWorkspaceV2.css',
  'src/pages/department', 'src/data/department.js', 'src/utils/departmentStore.js',
  'src/styles/v1094.css', 'src/styles/v1110.css',
  'supabase/brian_v10_94_learning_intelligence.sql',
  'supabase/brian_v11_1_classroom_delivery.sql',
  'supabase/brian_v11_4_2_lesson_integration.sql',
];

const criticalFiles = [
  'src/data/apps.js', 'src/data/designProfiles.js', 'src/pages/ToolPage.jsx', 'src/pages/Home.jsx',
  'src/main.jsx', 'src/components/GlobalFlatNavigation.jsx', 'src/components/GlobalCommandPalette.jsx',
  'src/utils/permissions.js', 'src/components/ContentTransferHub.jsx', 'src/pages/AIGovernanceCenter.jsx',
  'src/utils/aiGovernance.js', 'src/pages/ContentFactory.jsx', 'src/pages/AutomationCenter.jsx',
  'src/utils/automationEngine.js', 'src/utils/aiProviderHubRuntime.js', 'index.html', 'src/index.css',
  'public/manifest.webmanifest',
];

let failures = 0;
function pass(message) { console.log(`✓ ${message}`); }
function fail(message) { console.error(`✗ ${message}`); failures += 1; }

for (const item of removedPaths) {
  if (fs.existsSync(item)) fail(`retired source still exists: ${item}`);
  else pass(`removed ${item}`);
}

for (const file of criticalFiles) {
  if (!fs.existsSync(file)) { fail(`critical file missing: ${file}`); continue; }
  const text = fs.readFileSync(file, 'utf8');
  for (const slug of removedSlugs) {
    if (text.includes(slug)) fail(`${slug} remains active in ${file}`);
  }
  for (const title of removedTitles) {
    if (text.includes(title)) fail(`${title} remains active in ${file}`);
  }
}

const main = fs.readFileSync('src/main.jsx', 'utf8');
if (main.includes("./styles/v1094.css") || main.includes("./styles/v1110.css")) fail('retired route CSS is still imported');
else pass('retired route CSS imports removed');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.version !== '11.6.7') fail(`package version is ${pkg.version}`);
else pass('package version remains 11.6.7');
if (pkg.scripts?.['version:sync'] !== 'node scripts/sync-version-v11.6.7.mjs') fail('version sync does not target V11.6.7');
else pass('V11.6.7 version sync active');

const version = JSON.parse(fs.readFileSync('public/version.json', 'utf8'));
const release = JSON.parse(fs.readFileSync('public/release-manifest.json', 'utf8'));
if (version.version !== '11.6.7' || release.version !== '11.6.7') fail('public version metadata is not 11.6.7');
else pass('public version metadata is 11.6.7');
if ('requiredMigration' in version || 'requiredMigration' in release) fail('retired application SQL is still marked as required');
else pass('no retired SQL migration is required');

if (fs.existsSync('dist/assets')) {
  const chunkPattern = /WorksheetFactory|SmartId|SpeakingStudio|EnglishLesson|GrammarBuilder|WritingStudio|PronunciationCoach|AIWorkspace|ClassroomDelivery|ClassroomJoin|LearningIntelligence|DepartmentWorkspace/i;
  const chunks = fs.readdirSync('dist/assets').filter((name) => chunkPattern.test(name));
  if (chunks.length) fail(`retired production chunks found: ${chunks.join(', ')}`);
  else pass('no retired production chunks');
}

if (failures) {
  console.error(`Application removal audit failed (${failures} issue${failures === 1 ? '' : 's'}).`);
  process.exit(1);
}
console.log('Application removal audit passed.');
