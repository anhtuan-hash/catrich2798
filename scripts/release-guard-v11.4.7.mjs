import fs from 'node:fs';
import path from 'node:path';

const required = [
  'src/config/version.js',
  'src/main.jsx',
  'src/pages/Home.jsx',
  'src/pages/ToolPage.jsx',
  'src/pages/GrammarBuilder.jsx',
  'src/pages/GrammarBuilder.css',
  'src/data/apps.js',
  'src/utils/gemini.js',
  'src/utils/aiProviders.js',
  'src/utils/contentTransfer.js',
  'src/utils/documentParsers.js',
  'src/utils/library.js',
  'scripts/check-v11.4.7.mjs',
  'scripts/sync-version-v11.4.7.mjs',
  'scripts/performance-budget-v11.4.7.mjs',
  'public/version.json',
  'public/release-manifest.json',
];

let failed = 0;
for (const file of required) {
  if (!fs.existsSync(file)) { console.error(`✗ missing ${file}`); failed += 1; }
  else console.log(`✓ ${file}`);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = JSON.parse(fs.readFileSync('public/version.json', 'utf8'));
const release = JSON.parse(fs.readFileSync('public/release-manifest.json', 'utf8'));
if (pkg.version !== '11.4.7' || version.version !== '11.4.7' || release.version !== '11.4.7' || version.runtimeCore !== '2.4.7') {
  console.error('✗ version registry mismatch'); failed += 1;
} else console.log('✓ version registry synchronized');

const grammar = fs.readFileSync('src/pages/GrammarBuilder.jsx', 'utf8');
for (const marker of [
  'GRAMMAR BUILDER · V2.0', 'WORKFLOW_STEPS', 'CARD 07 · CONTENT EDITOR', 'CARD 08 · QUALITY AUDIT',
  'Teacher Vault', 'bes-grammar-pack/1.0', 'sectionDraftPrompt', 'diagnosticPrompt', 'callAI({', 'TRANSFER_APPLY_EVENT',
]) {
  if (!grammar.includes(marker)) { console.error(`✗ missing Grammar Builder marker ${marker}`); failed += 1; }
  else console.log(`✓ Grammar Builder marker ${marker}`);
}

const apiEntries = fs.readdirSync('api').filter((name) => !name.startsWith('_') && /\.(?:js|mjs|ts|py|go)$/i.test(name));
if (apiEntries.length > 12) { console.error(`✗ Vercel function count ${apiEntries.length}`); failed += 1; }
else console.log(`✓ Vercel function count ${apiEntries.length}/12`);
if (fs.existsSync('api/lesson-ai.mjs')) { console.error('✗ obsolete api/lesson-ai.mjs'); failed += 1; }

const assetsDir = 'dist/assets';
if (!fs.existsSync(assetsDir)) {
  console.error('✗ dist/assets missing; run npm run build'); failed += 1;
} else {
  const files = fs.readdirSync(assetsDir);
  const grammarJs = files.filter((name) => /^GrammarBuilder-.*\.js$/i.test(name));
  const grammarCss = files.filter((name) => /^GrammarBuilder-.*\.css$/i.test(name));
  if (!grammarJs.length) { console.error('✗ GrammarBuilder production JS chunk missing'); failed += 1; }
  else console.log(`✓ GrammarBuilder production JS chunk ${grammarJs[0]}`);
  if (!grammarCss.length) { console.error('✗ GrammarBuilder production CSS chunk missing'); failed += 1; }
  else console.log(`✓ GrammarBuilder production CSS chunk ${grammarCss[0]}`);
  const built = files.filter((name) => /\.js$/i.test(name)).map((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8')).join('\n');
  for (const marker of ['Grammar Builder', 'TEACHER VAULT', 'QUALITY AUDIT REPORT', 'bes-grammar-pack/1.0']) {
    if (!built.includes(marker)) { console.error(`✗ production marker missing: ${marker}`); failed += 1; }
    else console.log(`✓ production marker ${marker}`);
  }
}

if (failed) process.exit(1);
console.log('V11.4.7 release guard passed.');
