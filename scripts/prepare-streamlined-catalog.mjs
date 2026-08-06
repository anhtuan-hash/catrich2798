import fs from 'node:fs';
import path from 'node:path';

const slugs = [
  'lesson-plan-ai', 'exam-studio', 'word2graph', 'student-practice',
  'reading-studio', 'assessment-core', 'flying-words',
  'random-group-generator', 'classroom-screen', 'content-ecosystem',
  'automation-center', 'collaboration-hub', 'knowledge-train',
  'word-orbit', 'activity-graph', 'crossword-trial', 'practice',
];
const titles = [
  'Lesson Architect', 'Exam Studio', 'WordGraph Studio', 'Learner Sprint',
  'Reading Studio', 'Assessment Core', 'Ngân hàng câu hỏi & đề thi',
  'Flying Words', 'Từ Ngữ Biết Bay', 'Brian Group Maker',
  'Brian Classroom Stage', 'Teaching Content Ecosystem',
  'Hệ sinh thái nội dung dạy học', 'Automation Center',
  'Trung tâm tự động hóa', 'Collaboration Hub', 'Không gian cộng tác',
  'Knowledge Train', 'Đoàn Tàu Tri Thức', 'Vocabulary Orbit',
  'Quỹ đạo từ vựng', 'Brian Activity Graph', 'Crossword Trial',
  'Ô Chữ Bàn Thử',
];
const components = [
  'LessonArchitect', 'ExamStudio', 'ExamStudioUploadPage', 'WordGraphStudio',
  'StudentPractice', 'ReadingStudio', 'AssessmentCore', 'FlyingWordsGame',
  'RandomGroupGenerator', 'ClassroomScreenHost', 'ContentEcosystem',
  'AutomationCenter', 'CollaborationHub', 'KnowledgeTrainGame',
  'WordOrbitGame', 'ActivityGraphStudio', 'CrosswordTrialGame',
];
const filenameTokens = [
  'lessonarchitect', 'examstudio', 'wordgraph', 'studentpractice',
  'readingstudio', 'assessmentcore', 'flyingwords', 'randomgroupgenerator',
  'classroomscreen', 'contentecosystem', 'automationcenter',
  'collaborationhub', 'knowledgetrain', 'wordorbit', 'activitygraph',
  'crosswordtrial', 'registeractivitygraph', 'registerwordorbit',
];

const exists = (file) => fs.existsSync(file);
const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const targetPattern = new RegExp([...slugs, ...titles, ...components].map(escapeRegExp).join('|'), 'i');

function matchingBrace(text, start) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1] || '';
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function removeAppObjects(text) {
  const markers = [
    ...slugs.flatMap((slug) => [`slug: '${slug}'`, `slug: "${slug}"`]),
    ...titles.flatMap((title) => [`title: '${title}'`, `title: "${title}"`, `titleVi: '${title}'`, `titleVi: "${title}"`]),
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 0; index < text.length; index += 1) {
      if (text[index] !== '{') continue;
      const end = matchingBrace(text, index);
      if (end < 0) break;
      const block = text.slice(index, end + 1);
      if (!markers.some((marker) => block.includes(marker))) {
        index = end;
        continue;
      }
      let left = index;
      let right = end + 1;
      while (left > 0 && /\s/.test(text[left - 1])) left -= 1;
      if (text[left - 1] === ',') left -= 1;
      else {
        while (right < text.length && /\s/.test(text[right])) right += 1;
        if (text[right] === ',') right += 1;
      }
      text = text.slice(0, left) + text.slice(right);
      changed = true;
      break;
    }
  }
  return text;
}

function removeNamedFunction(text, name) {
  const match = new RegExp(`\\bfunction\\s+${escapeRegExp(name)}\\s*\\(`).exec(text);
  if (!match) return text;
  const brace = text.indexOf('{', match.index + match[0].length);
  const end = brace >= 0 ? matchingBrace(text, brace) : -1;
  return end >= 0 ? text.slice(0, match.index) + text.slice(end + 1) : text;
}

function cleanImports(text) {
  return text.replace(/^\s*import\b[\s\S]*?;\s*$/gm, (statement) => targetPattern.test(statement) ? '' : statement);
}

function removeQuotedValues(text) {
  for (const slug of slugs) {
    const q = escapeRegExp(slug);
    text = text.replace(new RegExp(`\\s*['"]${q}['"]\\s*,?`, 'g'), '');
  }
  return text.replace(/,\s*,/g, ',').replace(/\[\s*,/g, '[').replace(/,\s*\]/g, ']');
}

function cleanMain() {
  const file = 'src/main.jsx';
  if (!exists(file)) return;
  let text = cleanImports(read(file));
  text = text.split('\n').filter((line) => {
    if (!targetPattern.test(line)) return true;
    return !(
      line.includes('lazy(() => import(') ||
      line.includes('currentRoute ===') ||
      line.includes('selectedTool?.slug') ||
      /^\s*['"][^'"]+['"]\s*:\s*\{/.test(line) ||
      /^\s*[A-Za-z0-9_$-]+\s*:\s*\{/.test(line)
    );
  }).join('\n');
  for (const slug of slugs) {
    const q = escapeRegExp(slug);
    text = text.replace(new RegExp(`(?:['"]${q}['"]|${q.replace(/-/g, '\\-')})\\s*:\\s*\\[[^\\]]*\\]\\s*,?`, 'g'), '');
  }
  text = removeQuotedValues(text).replace(/\n{3,}/g, '\n\n');
  write(file, text);
}

function cleanToolPage() {
  const file = 'src/pages/ToolPage.jsx';
  if (!exists(file)) return;
  let text = cleanImports(read(file));
  text = text.split('\n').filter((line) => !targetPattern.test(line)).join('\n');
  text = removeQuotedValues(text).replace(/\n{3,}/g, '\n\n');
  write(file, text);
}

function cleanRegistry(file) {
  if (!exists(file)) return;
  let text = cleanImports(read(file));
  text = text.split('\n').filter((line) => {
    if (!targetPattern.test(line)) return true;
    const compact = line.trim();
    return !(
      compact.startsWith('import ') ||
      compact.startsWith('//') ||
      /^['"][^'"]+['"]\s*:/.test(compact) ||
      /^[A-Za-z0-9_$-]+\s*:/.test(compact) ||
      compact.startsWith('if (') || compact.startsWith('if(')
    );
  }).join('\n');
  text = removeQuotedValues(text).replace(/\n{3,}/g, '\n\n');
  write(file, text);
}

// Remove catalog records first.
if (exists('src/data/apps.js')) {
  write('src/data/apps.js', removeAppObjects(read('src/data/apps.js')).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
}
cleanMain();
cleanToolPage();
[
  'src/applicationBootstrap.jsx',
  'src/data/designProfiles.js',
  'src/data/appVisibilityRegistry.js',
  'src/utils/permissions.js',
  'src/components/GlobalCommandPalette.jsx',
  'src/components/GlobalFlatNavigation.jsx',
  'src/components/ContentTransferHub.jsx',
  'src/pages/Home.jsx',
  'src/pages/WebApps.jsx',
].forEach(cleanRegistry);

// Remove the build-time Group Maker injector.
if (exists('vite.config.js')) {
  let config = removeNamedFunction(read('vite.config.js'), 'randomGroupGeneratorPlugin');
  config = config.replace(/^.*randomGroupGeneratorPlugin\(\).*$\n?/gm, '').replace(/\n{3,}/g, '\n\n');
  write('vite.config.js', config);
}

// Delete dedicated modules so Rollup cannot emit hidden chunks for retired apps.
for (const root of ['src/pages', 'src/styles', 'src/data']) {
  if (!exists(root)) continue;
  for (const name of fs.readdirSync(root)) {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (filenameTokens.some((token) => normalized.includes(token))) {
      fs.rmSync(path.join(root, name), { recursive: true, force: true });
    }
  }
}

// Keep the legacy second build command harmless while emitting no Classroom Stage output.
fs.mkdirSync('apps/classroom-screen', { recursive: true });
write('apps/classroom-screen/empty.js', 'export default null;\n');
write('apps/classroom-screen/vite.config.ts', `import { defineConfig } from 'vite';\nimport { fileURLToPath } from 'node:url';\nexport default defineConfig({ build: { write: false, lib: { entry: fileURLToPath(new URL('./empty.js', import.meta.url)), formats: ['es'], fileName: 'retired' } } });\n`);
for (const name of fs.readdirSync('apps/classroom-screen')) {
  if (!['empty.js', 'vite.config.ts'].includes(name)) fs.rmSync(path.join('apps/classroom-screen', name), { recursive: true, force: true });
}

const critical = [
  'src/data/apps.js', 'src/main.jsx', 'src/pages/ToolPage.jsx',
  'src/applicationBootstrap.jsx', 'src/data/designProfiles.js',
  'src/data/appVisibilityRegistry.js', 'src/utils/permissions.js',
  'src/components/GlobalCommandPalette.jsx', 'src/components/GlobalFlatNavigation.jsx',
  'src/components/ContentTransferHub.jsx', 'src/pages/Home.jsx', 'vite.config.js',
];
const leftovers = [];
for (const file of critical) {
  if (!exists(file)) continue;
  const text = read(file);
  for (const value of [...slugs, ...titles]) {
    if (text.toLowerCase().includes(value.toLowerCase())) leftovers.push(`${value} in ${file}`);
  }
}
if (leftovers.length) {
  throw new Error(`Retired applications still active:\n${leftovers.join('\n')}`);
}
console.log('Streamlined catalog prepared: 16 retired Brian applications removed from the production build.');
