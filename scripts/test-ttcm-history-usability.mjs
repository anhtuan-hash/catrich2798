import { readFile } from 'node:fs/promises';

let passed = 0;
let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed += 1;
  } else {
    console.error(`[FAIL] ${message}`);
    failed += 1;
  }
}

const component = await readFile(new URL('../src/components/GlobalTtcmNavigationTab.jsx', import.meta.url), 'utf8');
const historyCss = await readFile(new URL('../src/components/GlobalTtcmTeacherHistory.css', import.meta.url), 'utf8');
const personnelCss = await readFile(new URL('../src/components/GlobalTtcmPersonnel.css', import.meta.url), 'utf8');

check(component.includes('>Nhân sự</button>'), 'keeps the Personnel tab in TTCM navigation');
check(!personnelCss.includes('Requested removal: Nhân sự tab'), 'does not intentionally hide the Personnel tab');
check(!personnelCss.includes('.ttcm-m3-workspace-tabs > button:nth-child(3)'), 'does not hide the third TTCM workspace tab');
check(!/\.ttcm-m3-personnel-view\s*\{[^}]*display:\s*none\s*!important/.test(personnelCss), 'personnel workspace remains visible');

check(component.includes('Tệp đã nộp'), 'uses consistent Vietnamese wording for submitted files');
check(component.includes('Tìm tên tệp hoặc nội dung TTCM'), 'exposes the submitted-file search field with Vietnamese wording');
check(component.includes('ttcm-history-search-wrap'), 'keeps the file search field visibly grouped in the panel header');
check(component.includes('historyFileFilterCounts'), 'computes counts for quick file filters');
check(component.includes('filterOption.label} {historyFileFilterCounts[filterOption.id]'), 'shows counts inside quick file filters');

check(component.includes('ttcm-history-event-primary'), 'separates primary timeline badges from metadata');
check(component.includes('ttcm-history-meta-line'), 'condenses response/file round metadata into one line');
check(component.includes('openHistoryItem'), 'supports opening the originating TTCM content from history');
check(component.includes('ttcm-history-item-link'), 'renders originating TTCM titles as interactive links');

check(component.includes('ttcm-history-scroll-region'), 'marks history and file regions for independent scrolling');
check(historyCss.includes('.ttcm-history-scroll-region'), 'styles independent history/file scroll regions');
check(historyCss.includes('overflow: auto'), 'enables scrolling inside history/file panels');
check(historyCss.includes('.ttcm-history-item-link'), 'styles clickable originating TTCM content');
check(historyCss.includes('.ttcm-history-table tbody tr:hover'), 'keeps table-row hover feedback');

console.log(`\nTTCM history usability contract: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
