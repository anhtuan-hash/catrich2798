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

let historyModule = null;
try {
  historyModule = await import('../src/utils/ttcmTeacherHistory.js');
  check(typeof historyModule.buildTeacherHistory === 'function', 'exports buildTeacherHistory()');
} catch (error) {
  console.error('[FAIL] teacher-history utility can be imported');
  console.error(error?.message || error);
  failed += 1;
}

if (historyModule?.buildTeacherHistory) {
  const items = [
    { id: 'item-1', title: 'Nộp đề kiểm tra giữa kì', item_type: 'ttcm_task' },
    { id: 'item-2', title: 'Xác nhận kế hoạch tuần', item_type: 'ttcm_acknowledgement' },
  ];
  const responses = [
    {
      id: 'response-1', item_id: 'item-1', author_id: 'teacher-1', body: 'Em gửi bản đầu tiên.',
      comment_type: 'submission', created_at: '2026-09-01T08:00:00.000Z',
      attachments: [{ name: 'de-giua-ki.docx', path: 'p/de-v1.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1200 }],
    },
    {
      id: 'response-manager', item_id: 'item-1', author_id: 'manager-1', body: 'TTCM phản hồi.',
      comment_type: 'review', created_at: '2026-09-01T09:00:00.000Z', attachments: [],
    },
    {
      id: 'response-2', item_id: 'item-1', author_id: 'teacher-1', body: 'Em đã chỉnh sửa và nộp lại.',
      comment_type: 'submission', created_at: '2026-09-02T08:00:00.000Z',
      attachments: [{ name: 'de-giua-ki-v2.docx', path: 'p/de-v2.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1400 }],
    },
    {
      id: 'response-3', item_id: 'item-2', author_id: 'teacher-1', body: 'Đã xác nhận đã nhận thông tin.',
      comment_type: 'comment', created_at: '2026-09-03T08:00:00.000Z', attachments: [],
    },
    {
      id: 'response-other', item_id: 'item-1', author_id: 'teacher-2', body: 'Giáo viên khác.',
      comment_type: 'submission', created_at: '2026-09-04T08:00:00.000Z',
      attachments: [{ name: 'other.pdf', path: 'p/other.pdf' }],
    },
  ];

  const history = historyModule.buildTeacherHistory({ items, responses, teacherId: 'teacher-1' });
  check(history.timeline.length === 3, 'keeps only the selected teacher activity');
  check(history.timeline[0]?.id === 'response-3', 'sorts timeline newest first');
  check(history.files.length === 2, 'keeps every submitted file across multiple submissions');
  check(history.files.some((file) => file.name === 'de-giua-ki.docx'), 'preserves the first submitted file');
  check(history.files.some((file) => file.name === 'de-giua-ki-v2.docx'), 'preserves a later submitted version');
  check(history.files.every((file) => file.itemTitle === 'Nộp đề kiểm tra giữa kì'), 'links files back to their TTCM item');
  check(history.summary.activityCount === 3, 'summarizes activity count');
  check(history.summary.fileCount === 2, 'summarizes file count');
  check(history.summary.itemCount === 2, 'summarizes distinct TTCM contents');
  check(history.summary.latestAt === '2026-09-03T08:00:00.000Z', 'summarizes latest activity time');
  check(history.files[0]?.submissionIndex === 2 && history.files[1]?.submissionIndex === 1, 'numbers submission rounds chronologically per TTCM item');
}

const component = await readFile(new URL('../src/components/GlobalTtcmNavigationTab.jsx', import.meta.url), 'utf8');
check(component.includes("workspaceView === 'history'"), 'TTCM renders the teacher-history workspace');
check(component.includes("setWorkspaceView('history')"), 'TTCM exposes a teacher-history tab action');
check(component.includes('Lịch sử & File GV'), 'TTCM labels the new teacher-history tab');
check(component.includes('buildTeacherHistory'), 'TTCM derives teacher history through the tested helper');

console.log(`\nTeacher history contract: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
