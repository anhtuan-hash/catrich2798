import fs from 'node:fs';
import { WORKSHEET_ACTIVITY_TYPES, generateOfflineWorksheet, auditWorksheet } from '../src/utils/worksheetFactory.js';
const required = [
  ['src/pages/WorksheetFactory.jsx', ['PROJECT_SCHEMA', 'BUILD_MODES', 'SOURCE_FACETS', 'AI_TASKS', 'DESTINATIONS', 'offlineSourceIntelligence', 'generateSections', 'detailedAudit', 'VersionModal', 'A4Preview', 'PublishCard', 'bes-worksheet-pack/2.0', 'batchZip', 'loadItemBankSource']],
  ['src/pages/WorksheetFactory.css', ['.wf2-product-bar', '.wf2-workflow', '.wf2-setup-grid', '.wf2-editor-layout', '.wf2-audit-panel', '.wf2-paper', '.wf2-batch-settings', '@media(max-width:1320px)', '@media(max-width:1060px)', '@media(max-width:760px)', '@media(max-width:560px)']],
  ['src/utils/worksheetFactory.js', ['WORKSHEET_ACTIVITY_TYPES', 'reading_comprehension', 'graphic_organiser', 'reflection_exit_ticket', 'worksheetToDocxBlob', 'worksheetMcqBankItems']],
];
let passed = 0;
for (const [file, tokens] of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  const source = fs.readFileSync(file, 'utf8');
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${file} missing ${token}`);
    passed += 1;
  }
}
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.version !== '11.6.0') throw new Error(`Expected 11.6.0, got ${pkg.version}`);
passed += 1;
if (WORKSHEET_ACTIVITY_TYPES.length < 20) throw new Error(`Expected >=20 activity types, got ${WORKSHEET_ACTIVITY_TYPES.length}`);
passed += 1;
const worksheet = generateOfflineWorksheet({
  sourceText: 'Protecting biodiversity keeps ecosystems resilient. Students should compare reliable sources and explain practical conservation choices.',
  title: 'Environment practice', topic: 'Environment', level: 'B2', activityTypes: ['multiple_choice','gap_fill','reading_comprehension','reflection_exit_ticket'], itemsPerActivity: 4, includeExplanations: true,
});
const audit = auditWorksheet(worksheet);
if (worksheet.activities.length !== 4 || audit.totalItems < 10 || audit.missingAnswers.length || audit.invalidOptions.length) throw new Error('Offline production contract failed');
passed += 3;
console.log(`V11.6.0 Worksheet Factory V2 checks: ${passed}/${passed} PASS`);
