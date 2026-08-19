export const TOOL_BEHAVIOR_EVENT = 'brian-v2-tool-behavior-ledger';
const STORAGE_KEY = 'brian-v2-tool-behavior-ledger-v1';

export const TOOL_BEHAVIOR_MANIFEST = {
  'classroom-screen': { label: 'Brian Classroom Stage', checks: [
    { id: 'workspace', label: 'Stage workflow', detail: 'Mở board, thao tác widget/scene chính và quay về shell không lỗi.' },
    { id: 'reload', label: 'Reload parity', detail: 'Reload runtime không làm mất trạng thái mà V1 vốn phải giữ.' },
    { id: 'fullscreen', label: 'Fullscreen', detail: 'Tool và shell ra/vào fullscreen ổn định.' },
  ]},
  'knowledge-train': { label: 'Knowledge Train', checks: [
    { id: 'edit-play', label: 'Edit → Play', detail: 'Chuyển editor/game, scoring và sound đúng như V1.' },
    { id: 'persistence', label: 'Persistence', detail: 'Draft/localStorage còn đúng sau reload.' },
    { id: 'import-export', label: 'Import / export JSON', detail: 'Round-trip dữ liệu không đổi cấu trúc.' },
  ]},
  'crossword-trial': { label: 'Crossword Trial', checks: [
    { id: 'teacher-student', label: 'Teacher / Student mode', detail: 'Mode, keyword, clue/answer flow và leaderboard đúng.' },
    { id: 'saved-state', label: 'Saved state', detail: 'Reload giữ đúng dữ liệu mà V1 cam kết giữ.' },
    { id: 'modal', label: 'Modal workflows', detail: 'Modal/confirmation không bị adapter che hoặc khóa focus.' },
  ]},
  'flying-words': { label: 'Flying Words', checks: [
    { id: 'setup-game', label: 'Setup → Game', detail: 'Start, timer, pause và answer dock hoạt động đúng.' },
    { id: 'persistence', label: 'Saved setup', detail: 'Reload giữ setup/draft theo hành vi V1.' },
    { id: 'import-export', label: 'Import / export', detail: 'Dữ liệu round-trip thành công.' },
  ]},
  'top-five-arena': { label: 'Top Five Arena', checks: [
    { id: 'play-round', label: 'Round / scoring workflow', detail: 'Start/pause, answer reveal, strikes, round navigation và scoring giữ đúng behavior V1.' },
    { id: 'persistence', label: 'Saved game / history', detail: 'Local game state và result history còn đúng sau reload.' },
    { id: 'import-export', label: 'Import / export JSON', detail: 'Game JSON round-trip không làm mất rounds, teams hoặc settings.' },
  ]},
  'textlab-activities': { label: 'Brian TextLab Activities', checks: [
    { id: 'authoring', label: 'Authoring workflow', detail: 'Editor lồng iframe vẫn resize/interaction bình thường.' },
    { id: 'library-bridge', label: 'Library / publish bridge', detail: 'Save Library, publish Resource và question-bank messaging đúng.' },
    { id: 'reload', label: 'Reload parity', detail: 'Reload không làm mất draft ngoài hành vi V1.' },
  ]},
  'exam-studio': { label: 'Exam Studio', checks: [
    { id: 'upload-recognition', label: 'Upload & recognition', detail: 'PDF/DOCX parser và recognition flow hoạt động.' },
    { id: 'four-step', label: 'Four-step workflow', detail: 'Chuyển bước, chỉnh câu và review không regression.' },
    { id: 'output', label: 'Output / export', detail: 'Luồng xuất kết quả còn đúng như V1.' },
  ]},
  'lesson-plan-ai': { label: 'Lesson Architect', checks: [
    { id: 'create-edit', label: 'Create / edit lesson', detail: 'Các bước tạo và chỉnh kế hoạch vẫn hoạt động.' },
    { id: 'saved-state', label: 'Saved draft', detail: 'Draft được khôi phục theo behavior V1.' },
    { id: 'output', label: 'Output workflow', detail: 'Preview/copy/export nếu có không bị shell can thiệp.' },
  ]},
  'thpt-practice-hub': { label: 'THPT Interactive Practice Hub', checks: [
    { id: 'upload-review', label: 'Upload / review', detail: 'Upload, review và permission flow hoạt động.' },
    { id: 'library-player', label: 'Library / HTML player', detail: 'Resource bridge và HTML player chạy đúng.' },
    { id: 'reload', label: 'Reload parity', detail: 'Reload giữ state theo hợp đồng V1.' },
  ]},
  'seating-chart-studio': { label: 'Seating Chart Studio', checks: [
    { id: 'roster-layout', label: 'Roster / layout', detail: 'Roster, drag/drop và điều kiện bố trí hoạt động.' },
    { id: 'student-view', label: 'Student View', detail: 'Student View và hidden constraints đúng như V1.' },
    { id: 'persistence', label: 'Persistence / import-export', detail: 'localStorage và round-trip dữ liệu không regression.' },
  ]},
  'reading-studio': { label: 'Reading Studio', checks: [
    { id: 'authoring', label: 'Authoring', detail: 'Tạo/chỉnh nội dung reading và accordion flow đúng.' },
    { id: 'preview', label: 'Preview / output', detail: 'Preview và output/copy hiện hữu hoạt động.' },
    { id: 'saved-state', label: 'Saved state', detail: 'Reload giữ draft theo behavior V1.' },
  ]},
  'word2graph': { label: 'WordGraph Studio', checks: [
    { id: 'create-layout', label: 'Create / layout', detail: 'Create flow, AI/manual content, drag nodes và auto layout hoạt động.' },
    { id: 'history-state', label: 'History / saved map', detail: 'Recent maps và layout state không regression sau reload.' },
    { id: 'export', label: 'SVG / PNG / HTML export', detail: 'Các đường xuất hiện hữu vẫn tạo file đúng sau adapter.' },
  ]},
  'vietnam-tax': { label: 'Vietnam Tax Studio', checks: [
    { id: 'calculation', label: 'Gross → Net calculation', detail: 'Inputs, deductions, insurance và tax comparison phản hồi đúng như V1.' },
    { id: 'responsive-table', label: 'Tables / charts', detail: 'Bảng chi tiết và biểu đồ không bị adapter làm sai overflow/layout.' },
    { id: 'print-export', label: 'Print / CSV', detail: 'Print report và CSV export hiện hữu vẫn hoạt động.' },
  ]},
  'textcare': { label: 'TextCare Fixer', checks: [
    { id: 'editor', label: 'Editor workflow', detail: 'Nhập/chỉnh văn bản, command/action chính và workbench hoạt động.' },
    { id: 'saved-state', label: 'Autosave / state', detail: 'Autosave hoặc state mà V1 cam kết giữ không regression sau reload.' },
    { id: 'output', label: 'Copy / export / dialog flow', detail: 'Output, copy/export và overlay hiện hữu không bị adapter che hoặc khóa.' },
  ]},
};

function readLedgerRaw() {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function persist(ledger) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger)); } catch { /* manual QA persistence is best-effort */ }
  window.dispatchEvent?.(new CustomEvent(TOOL_BEHAVIOR_EVENT));
}

export function readToolBehaviorLedger() { return readLedgerRaw(); }

export function setToolBehaviorCheck(slug, checkId, value) {
  const manifest = TOOL_BEHAVIOR_MANIFEST[slug];
  if (!manifest?.checks?.some((item) => item.id === checkId)) return readLedgerRaw();
  const ledger = readLedgerRaw();
  const current = ledger[slug] && typeof ledger[slug] === 'object' ? ledger[slug] : {};
  ledger[slug] = { ...current, [checkId]: Boolean(value), updatedAt: new Date().toISOString() };
  persist(ledger);
  return ledger;
}

export function resetToolBehaviorLedger() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* optional */ }
  window.dispatchEvent?.(new CustomEvent(TOOL_BEHAVIOR_EVENT, { detail: { cleared: true } }));
  return {};
}

export function summarizeToolBehavior(slugs = Object.keys(TOOL_BEHAVIOR_MANIFEST), ledger = readLedgerRaw()) {
  let required = 0;
  let passed = 0;
  const tools = slugs.map((slug) => {
    const manifest = TOOL_BEHAVIOR_MANIFEST[slug];
    const state = ledger?.[slug] || {};
    const checks = (manifest?.checks || []).map((item) => ({ ...item, pass: Boolean(state[item.id]) }));
    required += checks.length;
    passed += checks.filter((item) => item.pass).length;
    return { slug, label: manifest?.label || slug, checks, complete: checks.length > 0 && checks.every((item) => item.pass) };
  });
  return { required, passed, complete: required > 0 && required === passed, tools };
}
