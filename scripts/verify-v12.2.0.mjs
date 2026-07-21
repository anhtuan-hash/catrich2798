import fs from 'node:fs';
const files = [
  'src/pages/GrammarBuilder.jsx',
  'src/pages/WorksheetFactory.jsx',
  'src/pages/WritingStudio.jsx',
  'src/pages/PronunciationCoach.jsx',
  'src/ui-core/styles/ui-core.css',
];
for (const file of files) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const sources = Object.fromEntries(files.map((file) => [file, fs.readFileSync(file, 'utf8')]));
const assertions = [
  ['Grammar Builder workbench contract', sources[files[0]].includes('data-workbench="grammar-builder"') && sources[files[0]].includes('bui-workbench-header')],
  ['Worksheet Factory workbench contract', sources[files[1]].includes('data-workbench="worksheet-factory"') && sources[files[1]].includes('bui-workbench-metrics')],
  ['Writing Studio workbench contract', sources[files[2]].includes('data-workbench="writing-studio"') && sources[files[2]].includes('bui-workbench-workflow')],
  ['Pronunciation Coach workbench contract', sources[files[3]].includes('data-workbench="pronunciation-coach"') && sources[files[3]].includes('bui-workbench-canvas')],
  ['Shared workbench root styling', sources[files[4]].includes('.bui-workbench {')],
  ['Shared header styling', sources[files[4]].includes('.bui-workbench-header {')],
  ['Shared metrics styling', sources[files[4]].includes('.bui-workbench-metrics {')],
  ['Shared workflow styling', sources[files[4]].includes('.bui-workbench-workflow {')],
  ['Shared card token bridge', sources[files[4]].includes('.gb-card, .wf2-card, .ws-card, .pc-card')],
  ['Horizontal textarea safeguard', sources[files[4]].includes('writing-mode: horizontal-tb !important')],
  ['Responsive workbench canvas', sources[files[4]].includes('@media (max-width: 620px)')],
];
let passed = 0;
for (const [label, ok] of assertions) { if (!ok) throw new Error(`FAIL: ${label}`); console.log(`✓ ${label}`); passed++; }
console.log(`V12.2.0 unified workbench verification PASS (${passed}/${assertions.length})`);
