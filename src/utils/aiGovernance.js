const KEY = 'bes-ai-governance-v1';

export const DEFAULT_AI_GOVERNANCE = {
  schemaVersion: 1,
  requireConfirmation: true,
  allowCrossAppTransfer: true,
  allowAutoOpenTarget: true,
  allowDestructiveActions: false,
  maxActionsPerPlan: 4,
  dailySoftLimit: 120,
  preferredMode: 'balanced',
  updatedAt: 0,
};

export function getAiGovernance() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
    return { ...DEFAULT_AI_GOVERNANCE, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...DEFAULT_AI_GOVERNANCE };
  }
}

export function saveAiGovernance(next) {
  const value = { ...DEFAULT_AI_GOVERNANCE, ...next, schemaVersion: 1, updatedAt: Date.now() };
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* optional */ }
  window.dispatchEvent(new CustomEvent('bes-ai-governance-changed', { detail: value }));
  return value;
}

export function buildSafeActionPlan({ text = '', route = '', toolSlug = '', language = 'vi' }) {
  const source = String(text || '').trim();
  const normalized = source.toLowerCase();
  const vi = language === 'vi';
  const actions = [];
  const add = (action) => { if (!actions.some((item) => item.id === action.id)) actions.push(action); };

  if (/worksheet|phiếu học tập|bài tập|câu hỏi/.test(normalized)) add({ id: 'worksheet', kind: 'transfer', target: 'worksheet-factory', title: vi ? 'Mở trong Worksheet Factory' : 'Open in Worksheet Factory', description: vi ? 'Chuyển nội dung sang vùng nguồn để tiếp tục biên tập.' : 'Transfer the content into the source editor.' });
  if (/exam|đề thi|đề kiểm tra|trắc nghiệm|multiple choice|mcq/.test(normalized)) add({ id: 'exam', kind: 'transfer', target: 'exam-studio', title: vi ? 'Gửi sang Exam Studio' : 'Send to Exam Studio', description: vi ? 'Dùng nội dung làm nguồn tạo đề hoặc ngân hàng câu hỏi.' : 'Use this content as an exam or question-bank source.' });
  if (/wordgraph|từ vựng|collocation|word family|vocabulary/.test(normalized)) add({ id: 'wordgraph', kind: 'transfer', target: 'wordgraph', title: vi ? 'Tạo WordGraph' : 'Create WordGraph', description: vi ? 'Chuyển nội dung sang WordGraph để phát triển mạng từ.' : 'Transfer the content to WordGraph.' });
  if (/lesson|giáo án|bài dạy|tiết dạy/.test(normalized)) add({ id: 'lesson', kind: 'transfer', target: 'lesson-architect', title: vi ? 'Gửi sang Lesson Architect' : 'Send to Lesson Architect', description: vi ? 'Dùng nội dung làm đầu vào thiết kế bài dạy.' : 'Use the content as lesson-design input.' });
  if (/lưu|thư viện|save|library/.test(normalized)) add({ id: 'library', kind: 'transfer', target: 'library', title: vi ? 'Lưu vào Thư viện' : 'Save to Library', description: vi ? 'Tạo một mục nội dung để xem lại sau.' : 'Create a reusable library item.' });

  add({ id: 'apply', kind: 'apply', title: vi ? 'Dùng trong ứng dụng hiện tại' : 'Use in current app', description: vi ? 'Đưa nội dung vào ô nhập phù hợp trên trang đang mở.' : 'Insert the content into a suitable field on the current page.' });
  add({ id: 'copy', kind: 'copy', title: vi ? 'Sao chép nội dung' : 'Copy content', description: vi ? 'Sao chép an toàn, không thay đổi dữ liệu ứng dụng.' : 'Copy safely without changing app data.' });

  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    source,
    route,
    toolSlug,
    createdAt: Date.now(),
    actions: actions.slice(0, getAiGovernance().maxActionsPerPlan || 4),
  };
}
