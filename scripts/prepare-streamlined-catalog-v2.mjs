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
  'Reading Studio', 'Ngân hàng câu hỏi & đề thi', 'Từ Ngữ Biết Bay',
  'Brian Group Maker', 'Brian Classroom Stage', 'Hệ sinh thái nội dung dạy học',
  'Trung tâm tự động hóa', 'Không gian cộng tác', 'Đoàn Tàu Tri Thức',
  'Quỹ đạo từ vựng', 'Brian Activity Graph', 'Ô Chữ Bàn Thử',
];
const componentNames = [
  'LessonArchitect', 'ExamStudioUploadPage', 'WordGraphStudio', 'StudentPractice',
  'ReadingStudio', 'AssessmentCore', 'FlyingWordsGame', 'RandomGroupGenerator',
  'ClassroomScreenHost', 'ContentEcosystem', 'AutomationCenter',
  'CollaborationHub', 'KnowledgeTrainGame', 'WordOrbitGame',
  'ActivityGraphStudio', 'CrosswordTrialGame',
];
const fileTokens = [
  'lessonarchitect', 'examstudio', 'wordgraph', 'studentpractice',
  'readingstudio', 'assessmentcore', 'flyingwords', 'randomgroupgenerator',
  'classroomscreen', 'contentecosystem', 'automationcenter',
  'collaborationhub', 'knowledgetrain', 'wordorbit', 'activitygraph',
  'crosswordtrial', 'registeractivitygraph', 'registerwordorbit',
];

const exists = (file) => fs.existsSync(file);
const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);
const esc = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasTarget = (value) => {
  const lower = String(value).toLowerCase();
  return slugs.some((slug) => lower.includes(slug))
    || titles.some((title) => lower.includes(title.toLowerCase()))
    || componentNames.some((name) => lower.includes(name.toLowerCase()));
};

function matchingBrace(text, start) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1] || '';
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; index += 1; } continue; }
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

function removeCatalogObjects(text) {
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
      if (!markers.some((marker) => block.includes(marker))) { index = end; continue; }
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
  const match = new RegExp(`\\bfunction\\s+${esc(name)}\\s*\\(`).exec(text);
  if (!match) return text;
  const open = text.indexOf('{', match.index + match[0].length);
  const close = open >= 0 ? matchingBrace(text, open) : -1;
  return close >= 0 ? text.slice(0, match.index) + text.slice(close + 1) : text;
}

function removeTargetImports(text) {
  return text.replace(/^\s*import\b[\s\S]*?;\s*$/gm, (statement) => hasTarget(statement) ? '' : statement);
}

function removeQuotedSlugs(text) {
  for (const slug of slugs) {
    text = text.replace(new RegExp(`\\s*['"]${esc(slug)}['"]\\s*,?`, 'g'), '');
  }
  return text.replace(/,\s*,/g, ',').replace(/\[\s*,/g, '[').replace(/,\s*\]/g, ']');
}

if (exists('src/data/apps.js')) {
  write('src/data/apps.js', removeCatalogObjects(read('src/data/apps.js')).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
}

if (exists('src/pages/ToolPage.jsx')) {
  let text = removeTargetImports(read('src/pages/ToolPage.jsx'));
  text = text.split('\n').filter((line) => !hasTarget(line)).join('\n');
  text = removeQuotedSlugs(text).replace(/\n{3,}/g, '\n\n');
  write('src/pages/ToolPage.jsx', text);
}

if (exists('src/main.jsx')) {
  let text = removeTargetImports(read('src/main.jsx'));
  text = text.split('\n').filter((line) => {
    if (!hasTarget(line)) return true;
    return !(
      line.includes('lazy(() => import(')
      || line.includes('currentRoute ===')
      || line.includes('selectedTool?.slug')
      || /^\s*['"][^'"]+['"]\s*:\s*\{/.test(line)
      || /^\s*[A-Za-z0-9_$-]+\s*:\s*\{/.test(line)
    );
  }).join('\n');
  for (const slug of slugs) {
    const key = esc(slug);
    text = text.replace(new RegExp(`(?:['"]${key}['"]|${key})\\s*:\\s*\\[[^\\]]*\\]\\s*,?`, 'g'), '');
  }
  text = removeQuotedSlugs(text).replace(/\n{3,}/g, '\n\n');
  write('src/main.jsx', text);
}

for (const file of [
  'src/applicationBootstrap.jsx', 'src/data/designProfiles.js',
  'src/data/appVisibilityRegistry.js', 'src/utils/permissions.js',
  'src/components/GlobalCommandPalette.jsx', 'src/components/GlobalFlatNavigation.jsx',
  'src/components/ContentTransferHub.jsx', 'src/pages/Home.jsx', 'src/pages/WebApps.jsx',
]) {
  if (!exists(file)) continue;
  let text = removeTargetImports(read(file));
  text = text.split('\n').filter((line) => {
    if (!hasTarget(line)) return true;
    const compact = line.trim();
    return !(
      compact.startsWith('import ')
      || compact.startsWith('if (') || compact.startsWith('if(')
      || /^['"][^'"]+['"]\s*:/.test(compact)
      || /^[A-Za-z0-9_$-]+\s*:/.test(compact)
    );
  }).join('\n');
  write(file, removeQuotedSlugs(text).replace(/\n{3,}/g, '\n\n'));
}

if (exists('vite.config.js')) {
  let text = removeNamedFunction(read('vite.config.js'), 'randomGroupGeneratorPlugin');
  text = text.replace(/^.*randomGroupGeneratorPlugin\(\).*$\n?/gm, '').replace(/\n{3,}/g, '\n\n');
  write('vite.config.js', text);
}

for (const root of ['src/pages', 'src/styles', 'src/data']) {
  if (!exists(root)) continue;
  for (const name of fs.readdirSync(root)) {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (fileTokens.some((token) => normalized.includes(token))) {
      fs.rmSync(path.join(root, name), { recursive: true, force: true });
    }
  }
}

fs.mkdirSync('apps/classroom-screen', { recursive: true });
for (const name of fs.readdirSync('apps/classroom-screen')) {
  fs.rmSync(path.join('apps/classroom-screen', name), { recursive: true, force: true });
}
write('apps/classroom-screen/empty.js', 'export default null;\n');
write('apps/classroom-screen/vite.config.ts', `import { defineConfig } from 'vite';\nimport { fileURLToPath } from 'node:url';\nexport default defineConfig({ build: { write: false, lib: { entry: fileURLToPath(new URL('./empty.js', import.meta.url)), formats: ['es'], fileName: 'retired' } } });\n`);

console.log('Production catalog cleanup applied for all requested retired Brian applications.');
