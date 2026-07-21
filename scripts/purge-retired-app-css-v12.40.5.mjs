import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const roots = ['src'];
const directCssFiles = ['src/pages/PronunciationCoach.css'];
const retiredSelectorPatterns = [
  /\[data-(?:tool|route)=["'](?:exam-studio|reading-studio|speaking-studio|practice|writing-studio|pronunciation-coach|worksheet-factory|smart-id)["']\]/i,
  /\.exam-(?!preview-panel\b|output\b)/i,
  /\.(?:reading|speaking|smartid|pc|wf2|wf3)-/i,
  /\.practice-(?:v39|page|player|progress|question-card|results|topline|options)/i,
];
const retiredCommentPattern = /(?:Exam Studio|Reading Studio|Speaking Studio|Learner Sprint|Worksheet Factory|SmartID Identity|Writing Studio|Pronunciation Coach)/i;
const retiredAnimationPattern = /^(?:speaking|pc|wf|smartid|reading|practice|writing|exam)/i;

function collectCssFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectCssFiles(fullPath);
    return entry.name.endsWith('.css') ? [fullPath] : [];
  });
}

function splitSelectorList(selector) {
  const selectors = [];
  let current = '';
  let quote = '';
  let depth = 0;
  let escaped = false;
  for (const character of selector) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      current += character;
      escaped = true;
      continue;
    }
    if (quote) {
      current += character;
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      current += character;
      quote = character;
      continue;
    }
    if (character === '(' || character === '[') depth += 1;
    if (character === ')' || character === ']') depth -= 1;
    if (character === ',' && depth === 0) {
      if (current.trim()) selectors.push(current.trim());
      current = '';
      continue;
    }
    current += character;
  }
  if (current.trim()) selectors.push(current.trim());
  return selectors;
}

const cssFiles = [...new Set([...roots.flatMap(collectCssFiles), ...directCssFiles.filter(fs.existsSync)])];
let removedSelectors = 0;
let removedRules = 0;

for (const filePath of cssFiles) {
  const root = postcss.parse(fs.readFileSync(filePath, 'utf8'), { from: filePath });
  root.walkRules((rule) => {
    const selectors = splitSelectorList(rule.selector);
    const kept = selectors.filter((selector) => !retiredSelectorPatterns.some((pattern) => pattern.test(selector)));
    removedSelectors += selectors.length - kept.length;
    if (!kept.length) {
      removedRules += 1;
      rule.remove();
    } else if (kept.length !== selectors.length) {
      rule.selector = kept.join(',\n');
    }
  });
  root.walkAtRules('keyframes', (rule) => {
    if (retiredAnimationPattern.test(rule.params)) rule.remove();
  });
  root.walkAtRules('-webkit-keyframes', (rule) => {
    if (retiredAnimationPattern.test(rule.params)) rule.remove();
  });
  root.walkComments((comment) => {
    if (retiredCommentPattern.test(comment.text)) comment.remove();
  });
  fs.writeFileSync(filePath, root.toString());
}

console.log(`Removed ${removedSelectors} retired selectors and ${removedRules} empty CSS rules.`);
