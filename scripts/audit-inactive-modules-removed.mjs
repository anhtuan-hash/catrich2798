import fs from 'node:fs';

const removedPaths = [
  'apps/classroom-screen',
  'public/samples/exam-studio',
  'public/gamehub-top-layout.css',
  'public/teaching-methods-google-full.css',
  'public/teaching-methods-inline.css',
  'public/teaching-methods-inline.js',
  'public/word-orbit-visible-flight.css',
  'public/word-orbit-visible-flight.js',
  'src/components/GlobalWordGraphGoogleM3.css',
  'src/components/TesolMethodHero.css',
  'src/components/TesolMethodHero.jsx',
  'src/data/registerWordOrbit.js',
  'src/pages/ClassroomScreenHost.jsx',
  'src/pages/CrosswordTrialGame.jsx',
  'src/pages/ExamStudioUploadPage.jsx',
  'src/pages/FlyingWordsContrast.jsx',
  'src/pages/FlyingWordsGame.jsx',
  'src/pages/FlyingWordsGamePlus.jsx',
  'src/pages/Games.jsx',
  'src/pages/KnowledgeTrainGame.jsx',
  'src/pages/RandomGroupGenerator.jsx',
  'src/pages/ReadingStudio.jsx',
  'src/pages/ReadingStudioAccordionLibrary.jsx',
  'src/pages/ReadingStudioSampleLibrary.jsx',
  'src/pages/SeatingChartStudio.jsx',
  'src/pages/SmartIdStudio.jsx',
  'src/pages/SpecializedAppPage.jsx',
  'src/pages/WordGraphStudio.jsx',
  'src/pages/WordOrbitGame.jsx',
  'src/styles/ExamAutoRecognition.css',
  'src/styles/TopFiveArena.css',
  'src/styles/games-route-retired.css',
  'src/styles/random-group-generator.css',
  'src/tesolMethodRouteRegistry.js',
  'src/utils/examAutoRecognition.js',
  'src/utils/specializedAppEngines.js',
  'src/utils/teachingToolHub.js',
  'src/utils/teachingToolSharing.js',
];

const criticalFiles = [
  'src/main.jsx',
  'src/data/designProfiles.js',
  'src/pages/appsDirectoryData.js',
  'src/utils/permissions.js',
  'src/data/appVisibilityRegistry.js',
  'src/components/ExternalAppsIntegration.jsx',
  'src/pages/WebAppsAndroidDrawer.jsx',
  'src/data/retiredApps.js',
  'src/utils/retiredFeatureCleanup.js',
  'src/components/GlobalFlatNavigation.jsx',
  'vite.config.js',
  'package.json',
];

const forbiddenTokens = [
  'reading-studio', 'ReadingStudio',
  'exam-studio', 'ExamStudio',
  'flying-words', 'FlyingWords',
  'word2graph', 'WordGraph',
  'random-group', 'RandomGroup',
  'smart-id', 'SmartId',
  'seating-chart', 'SeatingChart',
  'classroom-screen', 'ClassroomScreen',
  'crossword-trial', 'CrosswordTrial',
  'word-orbit', 'WordOrbit',
  'knowledge-train', 'KnowledgeTrain',
  'lesson-plan-ai', 'lesson-architect',
  'teaching-methods-hub',
  'top-five-arena', 'top-5-arena', 'TopFive',
  'tesol-method', 'TesolMethod', 'TESOL_METHOD',
  'teaching-tool-hub', 'teachingToolHub', 'teachingToolSharing',
  'game-hub', 'games-route-retired', 'data-route="games"',
];

const failures = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walk(path);
    return path;
  });
}

for (const path of removedPaths) {
  if (fs.existsSync(path)) failures.push(`removed path still exists: ${path}`);
}

for (const path of criticalFiles) {
  if (!fs.existsSync(path)) failures.push(`critical file missing: ${path}`);
}

const runtimeFiles = [
  ...walk('src'),
  ...walk('public'),
  'package.json',
  'vite.config.js',
  'vercel.json',
  'index.html',
].filter((path) => fs.existsSync(path) && /\.(?:js|jsx|ts|tsx|css|json|html)$/.test(path));

for (const path of runtimeFiles) {
  const source = fs.readFileSync(path, 'utf8');
  for (const token of forbiddenTokens) {
    if (source.includes(token)) failures.push(`${token} remains in runtime file ${path}`);
  }
}

if (failures.length) {
  console.error(`Inactive/retired module removal audit FAILED (${failures.length})`);
  failures.forEach((failure) => console.error(`✗ ${failure}`));
  process.exit(1);
}

console.log(`Inactive/retired module removal audit PASS (${removedPaths.length} removed paths; ${runtimeFiles.length} runtime files scanned)`);
