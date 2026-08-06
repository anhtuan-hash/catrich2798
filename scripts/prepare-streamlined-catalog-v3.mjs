import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);
const exists = (file) => fs.existsSync(file);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const appSlugs = [
  'classroom-screen', 'content-ecosystem', 'assessment-core',
  'automation-center', 'collaboration-hub', 'knowledge-train',
  'crossword-trial', 'flying-words', 'exam-studio', 'word2graph',
  'reading-studio', 'lesson-plan-ai', 'student-practice',
  'random-group-generator', 'word-orbit', 'activity-graph',
];
const routeSlugs = ['content-ecosystem', 'assessment-core', 'automation-center', 'collaboration-hub', 'practice'];
const toolComponents = [
  'WordGraphStudio', 'ReadingStudio', 'LessonArchitect', 'ExamStudioUploadPage',
  'StudentPractice', 'ActivityGraphStudio', 'ClassroomScreenHost',
  'FlyingWordsGame', 'CrosswordTrialGame', 'KnowledgeTrainGame', 'WordOrbitGame',
];
const routeComponents = ['StudentPractice', 'AssessmentCore', 'AutomationCenter', 'CollaborationHub', 'ContentEcosystem'];

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

function removeAppObjects(text) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 0; index < text.length; index += 1) {
      if (text[index] !== '{') continue;
      const end = matchingBrace(text, index);
      if (end < 0) break;
      const block = text.slice(index, end + 1);
      const isTarget = appSlugs.some((slug) => block.includes(`slug: '${slug}'`) || block.includes(`slug: "${slug}"`));
      if (!isTarget) { index = end; continue; }
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
  const open = text.indexOf('{', match.index + match[0].length);
  const close = open >= 0 ? matchingBrace(text, open) : -1;
  return close >= 0 ? text.slice(0, match.index) + text.slice(close + 1) : text;
}

function removeArrayValues(text, declaration, values) {
  const start = text.indexOf(declaration);
  if (start < 0) return text;
  const open = text.indexOf('[', start);
  const close = text.indexOf(']', open);
  if (open < 0 || close < 0) return text;
  let body = text.slice(open + 1, close);
  for (const value of values) {
    const token = escapeRegExp(value);
    body = body.replace(new RegExp(`\\s*['"]${token}['"]\\s*,?`, 'g'), '');
  }
  body = body.replace(/,\s*,/g, ',').replace(/^\s*,/, '').replace(/,\s*$/, '');
  return text.slice(0, open + 1) + body + text.slice(close);
}

if (exists('src/data/apps.js')) {
  write('src/data/apps.js', removeAppObjects(read('src/data/apps.js')).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
}

if (exists('src/pages/ToolPage.jsx')) {
  let text = read('src/pages/ToolPage.jsx');
  text = text.replace(/^import '\.\.\/data\/register(?:WordOrbit|ActivityGraph)\.js';\n/gm, '');
  for (const component of toolComponents) {
    text = text.replace(new RegExp(`^const ${component} = lazy\\(\\(\\) => import\\([^\\n]+\\)\\);\\n`, 'gm'), '');
  }
  text = text.replace(/^const specializedToolSlugs = new Set\(\['exam-studio'\]\);\n/gm, '');
  for (const slug of appSlugs) {
    text = text.replace(new RegExp(`^\\s*if \\(tool\\?\\.slug === ['"]${escapeRegExp(slug)}['"]\\)[^\\n]*\\n`, 'gm'), '');
  }
  text = text.replace(/^\s*if \(specializedToolSlugs\.has\(tool\?\.slug\)\)[^\n]*\n/gm, '');
  write('src/pages/ToolPage.jsx', text.replace(/\n{3,}/g, '\n\n'));
}

if (exists('src/main.jsx')) {
  let text = read('src/main.jsx');
  for (const component of routeComponents) {
    text = text.replace(new RegExp(`^const ${component} = lazy\\(\\(\\) => import\\([^\\n]+\\)\\);\\n`, 'gm'), '');
  }
  text = removeArrayValues(text, 'const ROUTES = new Set(', routeSlugs);
  for (const slug of routeSlugs) {
    text = text.replace(new RegExp(`^\\s*['"]${escapeRegExp(slug)}['"]\\s*:\\s*\\{[^\\n]*\\},?\\n`, 'gm'), '');
    text = text.replace(new RegExp(`(?:['"]${escapeRegExp(slug)}['"]|${escapeRegExp(slug)})\\s*:\\s*\\[[^\\]]*\\]\\s*,?`, 'g'), '');
    text = text.replace(new RegExp(`^.*currentRoute === ['"]${escapeRegExp(slug)}['"].*$\\n?`, 'gm'), '');
  }
  write('src/main.jsx', text.replace(/,\s*,/g, ',').replace(/\n{3,}/g, '\n\n'));
}

if (exists('src/applicationBootstrap.jsx')) {
  let text = read('src/applicationBootstrap.jsx');
  text = text.replace(/^import ['"][^'"]*register(?:WordOrbit|ActivityGraph)\.js['"];\n/gm, '');
  write('src/applicationBootstrap.jsx', text);
}

if (exists('vite.config.js')) {
  let text = removeNamedFunction(read('vite.config.js'), 'randomGroupGeneratorPlugin');
  text = text.replace(/^.*randomGroupGeneratorPlugin\(\).*$\n?/gm, '').replace(/\n{3,}/g, '\n\n');
  write('vite.config.js', text);
}

fs.mkdirSync('apps/classroom-screen', { recursive: true });
write('apps/classroom-screen/empty.js', 'export default null;\n');
write('apps/classroom-screen/vite.config.ts', `import { defineConfig } from 'vite';\nimport { fileURLToPath } from 'node:url';\nexport default defineConfig({ build: { write: false, lib: { entry: fileURLToPath(new URL('./empty.js', import.meta.url)), formats: ['es'], fileName: 'retired' } } });\n`);

console.log('Precise production cleanup applied for the 16 retired Brian applications.');
