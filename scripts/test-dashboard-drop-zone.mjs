import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const dashboard = read('src/pages/WorkDashboard.jsx');
const component = read('src/components/BrianDashboardDropZone.jsx');
const css = read('src/components/BrianDashboardDropZone.css');
const runtime = read('src/utils/dashboardDropZone.js');
const questionBank = read('src/pages/QuestionBank.jsx');
const textCare = read('src/pages/TextCareCompactStudio.jsx');
const resources = read('src/pages/ResourceLibraryBase.jsx');

assert.match(dashboard, /BrianDashboardDropZone/);
assert.match(dashboard, /<BrianDashboardDropZone language={language}/);

for (const token of [
  'BRIAN DROP ZONE',
  'Thả vào để xử lý',
  'Chọn file',
  'Dán văn bản',
  'question-bank',
  'textcare',
  'resource-library',
  'gradebook',
  'textlab',
  'lesson',
  'onDragEnter',
  'onDrop',
  'navigator.clipboard.readText',
]) {
  assert.ok(component.includes(token), `Dashboard Drop Zone missing: ${token}`);
}

for (const token of [
  'setDashboardDropPacket',
  'peekDashboardDropPacket',
  'consumeDashboardDropPacket',
  '__BRIAN_DASHBOARD_DROP_PACKET__',
  'bes-dashboard-drop-zone-packet',
]) {
  assert.ok(runtime.includes(token), `Dashboard Drop Zone runtime missing: ${token}`);
}

assert.match(css, /\.brian-dashboard-drop-zone/);
assert.match(css, /@media \(max-width: 700px\)/);
assert.match(css, /grid-template-columns:\s*1fr 1fr/);

assert.match(questionBank, /bes-dashboard-drop-question-text/);
assert.match(questionBank, /setActiveTab\('import'\)/);
assert.match(questionBank, /setPastePreview\(parseQuestionBankPaste/);

assert.match(textCare, /peekDashboardDropPacket/);
assert.match(textCare, /consumeDashboardDropPacket\('textcare'\)/);
assert.match(textCare, /processFile\(synthetic\)/);

assert.match(resources, /bes-resource-library-drop-on-load/);
assert.match(resources, /consumeDashboardDropPacket\('resource-library'\)/);
assert.match(resources, /setShowUpload\(true\)/);
assert.match(resources, /setFiles\(incomingFiles\)/);

assert.doesNotMatch(component, /GlobalQuickAccessRail|Action Dock|bqa-/i, 'Dashboard Drop Zone must remain independent from sidebar infrastructure.');

console.log('PASS: Brian Drop Zone is a standalone Dashboard feature with file/text/link classification, mobile file selection, and direct handoffs to Question Bank, TextCare and Resource Library.');
