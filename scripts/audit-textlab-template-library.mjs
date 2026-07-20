import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTLAB_COPY_TEMPLATES, TEXTLAB_TEMPLATE_COUNT } from '../src/data/textLabTemplateLibrary.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagePath = path.join(root, 'src/pages/TextLabTemplateLibrary.jsx');
const page = fs.readFileSync(pagePath, 'utf8');
const failures = [];

if (TEXTLAB_TEMPLATE_COUNT !== 36) failures.push(`Expected 36 templates, found ${TEXTLAB_TEMPLATE_COUNT}.`);

const ids = TEXTLAB_COPY_TEMPLATES.map((item) => item.id);
if (new Set(ids).size !== ids.length) failures.push('Template IDs must be unique.');

for (const item of TEXTLAB_COPY_TEMPLATES) {
  if (!item.name || !item.nameVi || !item.category || !item.blank || !item.example) {
    failures.push(`Template ${item.id} is missing required copy-ready fields.`);
  }
}

const forbiddenImports = ['../utils/gemini.js', 'callAI', 'extractJson', 'aiProviders'];
for (const token of forbiddenImports) {
  if (page.includes(token)) failures.push(`No-AI page contains forbidden token: ${token}`);
}

if (!page.includes('navigator.clipboard.writeText')) failures.push('Clipboard copy implementation is missing.');
if (!page.includes('Không có AI')) failures.push('Explicit no-AI guidance is missing.');

if (failures.length) {
  console.error('TextLab Template Library audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`TextLab Template Library audit passed: ${TEXTLAB_TEMPLATE_COUNT} templates, unique IDs, copy fields, no AI integration.`);
