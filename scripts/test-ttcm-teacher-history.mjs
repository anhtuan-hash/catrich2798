import { readFile } from 'node:fs/promises';

// Final verification contract for the refined TTCM teacher-history workspace.
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
      id: 'response-note', item_id: 'item-1', author_id: 'teacher-1', body: 'Em đã nhận góp ý và đang chỉnh sửa.',
      comment_type: 'submission', created_at: '2026-09-01T10:00:00.000Z', attachments: [],
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
  check(history.timeline.length === 4, 'keeps only the selected teacher activity');
  check(history.timeline[0]?.id === 'response-3', 'sorts timeline newest first');
  check(history.files.length === 2, 'keeps every submitted file across multiple submissions');
  check(history.files.some((file) => file.name === 'de-giua-ki.docx'), 'preserves the first submitted file');
  check(history.files.some((file) => file.name === 'de-giua-ki-v2.docx'), 'preserves a later submitted version');
  check(history.files.every((file) => file.itemTitle === 'Nộp đề kiểm tra giữa kì'), 'links files back to their TTCM item');
  check(history.summary.activityCount === 4, 'summarizes activity count');
  check(history.summary.fileCount === 2, 'summarizes file count');
  check(history.summary.itemCount === 2, 'summarizes distinct TTCM contents');
  check(history.summary.latestAt === '2026-09-03T08:00:00.000Z', 'summarizes latest activity time');
  check(history.files[0]?.submissionIndex === 2 && history.files[1]?.submissionIndex === 1, 'numbers file submission rounds independently from text-only responses');
  check(history.timeline.find((entry) => entry.id === 'response-2')?.responseIndex === 3, 'numbers response rounds independently from file submissions');
  check(history.files[0]?.statusId === 'resubmitted' && history.files[0]?.statusLabel === 'Đã nộp lại', 'marks later file submissions as resubmitted');
  check(history.files[1]?.statusId === 'submitted' && history.files[1]?.statusLabel === 'Đã nộp', 'marks first file submission as submitted');
  check(history.timeline.find((entry) => entry.id === 'response-3')?.statusId === 'acknowledged', 'marks acknowledgement activity with its own status');
  check(history.files.every((file) => file.schoolYear === '2026-2027'), 'assigns a school year to submitted files');
  check(history.timeline.every((entry) => entry.schoolYear === '2026-2027'), 'assigns a school year to timeline activity');
}

const component = await readFile(new URL('../src/components/GlobalTtcmNavigationTab.jsx', import.meta.url), 'utf8');
const historyCss = await readFile(new URL('../src/components/GlobalTtcmTeacherHistory.css', import.meta.url), 'utf8');
check(component.includes("workspaceView === 'history'"), 'TTCM renders the teacher-history workspace');
check(component.includes("setWorkspaceView('history')"), 'TTCM exposes a teacher-history tab action');
check(component.includes('Lịch sử & File GV'), 'TTCM labels the new teacher-history tab');
check(component.includes('buildTeacherHistory'), 'TTCM derives teacher history through the tested helper');
check(component.includes('Năm học'), 'teacher history exposes a school-year filter');
check(component.includes('Trạng thái'), 'file history exposes a status column');
check(component.includes('historyFileFilter'), 'teacher history exposes quick file filters');
check(component.includes('Xem đầy đủ'), 'long timeline messages can be expanded');
check(historyCss.includes('.ttcm-history-status.is-resubmitted'), 'resubmission status has a dedicated color style');
check(historyCss.includes('.ttcm-history-file-badge.is-pdf'), 'PDF files have a dedicated color style');
check(historyCss.includes('.ttcm-history-file-badge.is-doc'), 'Word files have a dedicated color style');
check(historyCss.includes('.ttcm-history-file-badge.is-archive'), 'archive files have a dedicated color style');

console.log(`\nTeacher history contract: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
