import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const retiredSlugs = [
  'worksheet-factory',
  'exam-studio',
  'reading-studio',
  'smart-id',
  'speaking-studio',
  'student-practice',
  'writing-studio',
  'pronunciation-coach',
];
const deletedModules = [
  'src/pages/WorksheetFactory.jsx',
  'src/pages/WorksheetFactory.css',
  'src/utils/worksheetFactory.js',
  'src/pages/SpecializedAppPage.jsx',
  'src/utils/specializedAppEngines.js',
  'src/pages/ReadingStudio.jsx',
  'src/pages/SmartIdStudio.jsx',
  'src/pages/SmartIdStudio.css',
  'src/pages/SpeakingStudio.jsx',
  'src/pages/StudentPractice.jsx',
  'src/pages/WritingStudio.jsx',
  'src/pages/WritingStudio.css',
  'src/pages/PronunciationCoach.jsx',
  'src/pages/PronunciationCoach.css',
];
const retiredCssPatterns = [
  /\[data-(?:tool|route)=["'](?:exam-studio|reading-studio|speaking-studio|practice|writing-studio|pronunciation-coach|worksheet-factory|smart-id)["']\]/i,
  /\.exam-(?!preview-panel\b|output\b)/i,
  /\.(?:reading|speaking|smartid|pc|wf2|wf3)-/i,
  /\.practice-(?:v39|page|player|progress|question-card|results|topline|options)/i,
];
const currentVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;

function collectRuntimeFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectRuntimeFiles(fullPath);
    return /\.(?:css|js|jsx|json)$/.test(entry.name) ? [fullPath] : [];
  });
}

const runtimeFiles = collectRuntimeFiles('src');
for (const filePath of runtimeFiles) {
  const source = fs.readFileSync(filePath, 'utf8').toLowerCase();
  for (const slug of retiredSlugs) {
    assert.equal(source.includes(slug), false, `${filePath} still references ${slug}`);
  }
}

for (const filePath of deletedModules) assert.equal(fs.existsSync(filePath), false, `${filePath} must be deleted`);

for (const filePath of collectRuntimeFiles('src').filter((filePath) => filePath.endsWith('.css'))) {
  const source = fs.readFileSync(filePath, 'utf8');
  for (const pattern of retiredCssPatterns) {
    assert.equal(pattern.test(source), false, `${filePath} still contains retired application CSS: ${pattern}`);
  }
}

const appSource = fs.readFileSync('src/data/apps.js', 'utf8');
const toolPage = fs.readFileSync('src/pages/ToolPage.jsx', 'utf8');
const mainSource = fs.readFileSync('src/main.jsx', 'utf8');
for (const slug of retiredSlugs) {
  assert.equal(appSource.includes(slug), false, `${slug} remains in the app registry`);
  assert.equal(toolPage.includes(slug), false, `${slug} remains in ToolPage`);
}
assert.equal(mainSource.includes("'practice'"), false, 'The retired Learner Sprint practice route remains registered');

for (const manifestPath of ['public/version.json', 'public/release-manifest.json']) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.version, currentVersion);
  const serializedManifest = JSON.stringify(manifest);
  for (const slug of retiredSlugs) {
    assert.equal(serializedManifest.includes(slug), false, `${manifestPath} still publicly exposes ${slug}`);
  }
  assert.equal(manifest.retiredApplicationCount, retiredSlugs.length);
}

console.log('V12.40.5 retired-app removal checks passed.');
