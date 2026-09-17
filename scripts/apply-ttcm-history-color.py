from pathlib import Path

utility = '''function text(value) {
  return String(value ?? '').trim();
}

function timeValue(value) {
  const valueMs = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(valueMs) ? valueMs : 0;
}

function schoolYearFor(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 7 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function parseAttachments(value) {
  if (!value) return [];
  let parsed = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch { return []; }
  }
  if (!Array.isArray(parsed)) parsed = [parsed];
  return parsed.filter(Boolean).map((attachment, index) => {
    if (typeof attachment === 'string') {
      return { name: attachment.split('/').pop() || `Tệp ${index + 1}`, url: attachment };
    }
    return { ...attachment, name: text(attachment.name || attachment.file_name || attachment.filename) || `Tệp ${index + 1}` };
  });
}

function itemTypeLabel(item = {}) {
  const raw = text(item?.metadata?.ttcm_kind || item?.item_type).replace(/^ttcm_/, '');
  if (raw === 'task') return 'Yêu cầu thực hiện';
  if (raw === 'feedback') return 'Xin góp ý';
  if (raw === 'acknowledgement') return 'Yêu cầu xác nhận';
  if (raw === 'resource') return 'Tài liệu';
  if (raw === 'announcement') return 'Thông báo';
  return 'Nội dung TTCM';
}

function activityLabel(response = {}, attachmentCount = 0) {
  const kind = text(response.comment_type).toLowerCase();
  if (kind === 'submission') return attachmentCount ? 'Đã nộp phản hồi và tệp' : 'Đã gửi phản hồi';
  if (kind === 'review') return 'Đã gửi góp ý';
  if (kind === 'comment') return 'Đã xác nhận / phản hồi';
  return attachmentCount ? 'Đã gửi tệp' : 'Đã phản hồi';
}

function activityStatus(response = {}, attachmentCount = 0, fileSubmissionIndex = 0) {
  const kind = text(response.comment_type).toLowerCase();
  if (kind === 'submission' && attachmentCount) {
    return fileSubmissionIndex > 1
      ? { id: 'resubmitted', label: 'Đã nộp lại' }
      : { id: 'submitted', label: 'Đã nộp' };
  }
  if (kind === 'submission') return { id: 'responded', label: 'Đã phản hồi' };
  if (kind === 'review') return { id: 'feedback', label: 'Đã góp ý' };
  if (kind === 'comment') return { id: 'acknowledged', label: 'Đã xác nhận' };
  return attachmentCount ? { id: 'submitted', label: 'Đã gửi tệp' } : { id: 'responded', label: 'Đã phản hồi' };
}

export function buildTeacherHistory({ items = [], responses = [], teacherId = '' } = {}) {
  const targetId = text(teacherId);
  const itemsById = new Map((items || []).filter(Boolean).map((item) => [text(item.id), item]));
  const selected = (responses || [])
    .filter((response) => targetId && text(response?.author_id || response?.user_id) === targetId)
    .slice()
    .sort((a, b) => timeValue(a?.created_at) - timeValue(b?.created_at));

  const responseRoundByItem = new Map();
  const fileRoundByItem = new Map();
  const chronological = selected.map((response) => {
    const itemId = text(response?.item_id);
    const item = itemsById.get(itemId) || {};
    const attachments = parseAttachments(response?.attachments);
    const responseIndex = (responseRoundByItem.get(itemId) || 0) + 1;
    responseRoundByItem.set(itemId, responseIndex);
    let fileSubmissionIndex = 0;
    if (attachments.length) {
      fileSubmissionIndex = (fileRoundByItem.get(itemId) || 0) + 1;
      fileRoundByItem.set(itemId, fileSubmissionIndex);
    }
    const status = activityStatus(response, attachments.length, fileSubmissionIndex);
    return {
      id: text(response?.id) || `${itemId}:${response?.created_at || responseIndex}`,
      itemId,
      itemTitle: text(item?.title) || 'Nội dung TTCM',
      itemType: itemTypeLabel(item),
      body: text(response?.body || response?.content),
      commentType: text(response?.comment_type),
      createdAt: response?.created_at || '',
      schoolYear: schoolYearFor(response?.created_at),
      attachments,
      attachmentCount: attachments.length,
      responseIndex,
      fileSubmissionIndex,
      submissionIndex: responseIndex,
      statusId: status.id,
      statusLabel: status.label,
      label: activityLabel(response, attachments.length),
    };
  });

  const timeline = chronological.slice().sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt));
  const files = chronological
    .flatMap((entry) => entry.attachments.map((attachment, attachmentIndex) => ({
      ...attachment,
      id: `${entry.id}:file:${attachmentIndex}`,
      responseId: entry.id,
      itemId: entry.itemId,
      itemTitle: entry.itemTitle,
      itemType: entry.itemType,
      submittedAt: entry.createdAt,
      schoolYear: entry.schoolYear,
      responseIndex: entry.responseIndex,
      submissionIndex: entry.fileSubmissionIndex,
      statusId: entry.statusId,
      statusLabel: entry.statusLabel,
    })))
    .sort((a, b) => timeValue(b.submittedAt) - timeValue(a.submittedAt));

  const itemCount = new Set(chronological.map((entry) => entry.itemId).filter(Boolean)).size;
  const latestAt = timeline[0]?.createdAt || '';

  return {
    timeline,
    files,
    summary: {
      activityCount: chronological.length,
      fileCount: files.length,
      itemCount,
      latestAt,
    },
  };
}
'''
Path('src/utils/ttcmTeacherHistory.js').write_text(utility, encoding='utf-8')

css = '''.ttcm-history-view {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  overflow: auto;
  background: #f8fafc;
}

.ttcm-history-toolbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, .05);
}
.ttcm-history-toolbar-copy { min-width: 220px; }
.ttcm-history-toolbar-copy strong { display: block; color: #0f172a; font-size: 17px; }
.ttcm-history-toolbar-copy span { display: block; margin-top: 4px; color: #64748b; font-size: 13px; }
.ttcm-history-controls { display: flex; align-items: end; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.ttcm-history-field { display: grid; gap: 5px; min-width: 220px; }
.ttcm-history-field.is-year { min-width: 150px; }
.ttcm-history-field > span { color: #475569; font-size: 11px; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; }
.ttcm-history-field select,
.ttcm-history-search {
  height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 0 12px;
  background: #fff;
  color: #0f172a;
  outline: none;
}
.ttcm-history-field select:focus,
.ttcm-history-search:focus { border-color: #60a5fa; box-shadow: 0 0 0 3px rgba(96, 165, 250, .16); }

.ttcm-history-teacher {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 260px;
  padding: 8px 10px;
  border: 1px solid #bfdbfe;
  border-radius: 14px;
  background: #eff6ff;
}
.ttcm-history-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  background: #2563eb;
  color: #fff;
  font-weight: 900;
  letter-spacing: .02em;
}
.ttcm-history-teacher div { min-width: 0; }
.ttcm-history-teacher b { display: block; overflow: hidden; color: #0f172a; text-overflow: ellipsis; white-space: nowrap; }
.ttcm-history-teacher small { display: block; margin-top: 2px; overflow: hidden; color: #64748b; text-overflow: ellipsis; white-space: nowrap; }

.ttcm-history-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.ttcm-history-stat {
  position: relative;
  min-width: 0;
  padding: 14px 16px 14px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(15, 23, 42, .04);
  overflow: hidden;
}
.ttcm-history-stat::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 4px; background: var(--stat-accent, #2563eb); }
.ttcm-history-stat.is-activity { --stat-accent: #2563eb; --stat-soft: #eff6ff; --stat-ink: #1d4ed8; }
.ttcm-history-stat.is-content { --stat-accent: #7c3aed; --stat-soft: #f5f3ff; --stat-ink: #6d28d9; }
.ttcm-history-stat.is-files { --stat-accent: #059669; --stat-soft: #ecfdf5; --stat-ink: #047857; }
.ttcm-history-stat.is-latest { --stat-accent: #ea580c; --stat-soft: #fff7ed; --stat-ink: #c2410c; }
.ttcm-history-stat-head { display: flex; align-items: center; gap: 8px; }
.ttcm-history-stat-icon { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 9px; background: var(--stat-soft); color: var(--stat-ink); }
.ttcm-history-stat span { color: #475569; font-size: 12px; font-weight: 800; }
.ttcm-history-stat strong { display: block; margin-top: 7px; color: #0f172a; font-size: 23px; line-height: 1.1; }
.ttcm-history-stat small { display: block; margin-top: 5px; overflow: hidden; color: #64748b; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }

.ttcm-history-grid { min-height: 480px; display: grid; grid-template-columns: minmax(320px, .9fr) minmax(520px, 1.4fr); gap: 14px; }
.ttcm-history-panel { min-width: 0; border: 1px solid #e2e8f0; border-radius: 18px; background: #fff; overflow: hidden; box-shadow: 0 8px 24px rgba(15, 23, 42, .045); }
.ttcm-history-panel > header { min-height: 62px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; }
.ttcm-history-panel > header strong { display: block; color: #0f172a; font-size: 15px; }
.ttcm-history-panel > header small { display: block; margin-top: 2px; color: #64748b; font-size: 11px; }
.ttcm-history-search { width: min(280px, 42vw); }

.ttcm-history-filter-chips { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; padding: 10px 14px; border-bottom: 1px solid #eef2f7; background: #fbfdff; }
.ttcm-history-filter-chip { min-height: 30px; padding: 0 10px; border: 1px solid #dbe3ee; border-radius: 999px; background: #fff; color: #526176; font-size: 10px; font-weight: 900; cursor: pointer; }
.ttcm-history-filter-chip:hover { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
.ttcm-history-filter-chip.is-selected { border-color: #93c5fd; background: #dbeafe; color: #1d4ed8; }
.ttcm-history-filter-chip.is-resubmitted.is-selected { border-color: #c4b5fd; background: #ede9fe; color: #6d28d9; }
.ttcm-history-filter-chip.is-pdf.is-selected { border-color: #fecaca; background: #fef2f2; color: #dc2626; }
.ttcm-history-filter-chip.is-word.is-selected { border-color: #bfdbfe; background: #eff6ff; color: #2563eb; }
.ttcm-history-filter-chip.is-sheet.is-selected { border-color: #bbf7d0; background: #f0fdf4; color: #15803d; }
.ttcm-history-filter-chip.is-archive.is-selected { border-color: #ddd6fe; background: #f5f3ff; color: #7c3aed; }

.ttcm-history-timeline { padding: 10px 14px 16px 20px; }
.ttcm-history-event { --event-accent: #2563eb; --event-ring: #dbeafe; position: relative; display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 12px; padding: 10px 0 14px; }
.ttcm-history-event.is-resubmitted { --event-accent: #7c3aed; --event-ring: #ede9fe; }
.ttcm-history-event.is-acknowledged { --event-accent: #059669; --event-ring: #d1fae5; }
.ttcm-history-event.is-feedback { --event-accent: #db2777; --event-ring: #fce7f3; }
.ttcm-history-event.is-responded { --event-accent: #0891b2; --event-ring: #cffafe; }
.ttcm-history-event::before { content: ''; position: absolute; left: 8px; top: 26px; bottom: -8px; width: 2px; background: #e2e8f0; }
.ttcm-history-event:last-child::before { display: none; }
.ttcm-history-event-dot { z-index: 1; width: 18px; height: 18px; margin-top: 2px; border: 4px solid var(--event-ring); border-radius: 50%; background: var(--event-accent); }
.ttcm-history-event-card { min-width: 0; }
.ttcm-history-event-card header { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.ttcm-history-event-card b { color: #0f172a; font-size: 13px; }
.ttcm-history-event-card time { flex: 0 0 auto; color: #64748b; font-size: 11px; }
.ttcm-history-event-card h4 { margin: 4px 0 0; color: #334155; font-size: 13px; }
.ttcm-history-event-card p { margin: 5px 0 0; color: #526176; font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
.ttcm-history-event-card p.is-clamped { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.ttcm-history-expand { margin: 4px 0 0; padding: 0; border: 0; background: transparent; color: #2563eb; font-size: 11px; font-weight: 800; cursor: pointer; }
.ttcm-history-event-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.ttcm-history-chip,
.ttcm-history-status { display: inline-flex; align-items: center; min-height: 23px; padding: 0 8px; border-radius: 999px; font-size: 10px; font-weight: 900; }
.ttcm-history-chip { background: #f1f5f9; color: #475569; }
.ttcm-history-chip.is-task { background: #fff7ed; color: #c2410c; }
.ttcm-history-chip.is-feedback { background: #f5f3ff; color: #7c3aed; }
.ttcm-history-chip.is-acknowledgement { background: #ecfdf5; color: #047857; }
.ttcm-history-chip.is-resource { background: #eef2ff; color: #4338ca; }
.ttcm-history-chip.is-announcement { background: #eff6ff; color: #1d4ed8; }
.ttcm-history-chip.is-file { background: #ecfdf5; color: #047857; }
.ttcm-history-status.is-submitted { background: #eff6ff; color: #1d4ed8; }
.ttcm-history-status.is-resubmitted { background: #f5f3ff; color: #6d28d9; }
.ttcm-history-status.is-acknowledged { background: #ecfdf5; color: #047857; }
.ttcm-history-status.is-feedback { background: #fdf2f8; color: #be185d; }
.ttcm-history-status.is-responded { background: #ecfeff; color: #0e7490; }

.ttcm-history-files { overflow-x: auto; }
.ttcm-history-table { width: 100%; border-collapse: collapse; min-width: 820px; }
.ttcm-history-table th { padding: 10px 12px; background: #f8fafc; color: #526176; font-size: 10px; font-weight: 900; letter-spacing: .035em; text-align: left; text-transform: uppercase; }
.ttcm-history-table td { padding: 11px 12px; border-top: 1px solid #f1f5f9; color: #334155; font-size: 12px; vertical-align: middle; }
.ttcm-history-table tbody tr:hover { background: #fbfdff; }
.ttcm-history-file-name { display: flex; align-items: center; gap: 9px; min-width: 220px; }
.ttcm-history-file-badge { width: 40px; height: 35px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 10px; background: #f1f5f9; color: #475569; font-size: 9px; font-weight: 900; }
.ttcm-history-file-badge.is-pdf { background: #fef2f2; color: #dc2626; }
.ttcm-history-file-badge.is-doc { background: #eff6ff; color: #2563eb; }
.ttcm-history-file-badge.is-sheet { background: #f0fdf4; color: #15803d; }
.ttcm-history-file-badge.is-slides { background: #fff7ed; color: #c2410c; }
.ttcm-history-file-badge.is-archive { background: #f5f3ff; color: #7c3aed; }
.ttcm-history-file-name div { min-width: 0; }
.ttcm-history-file-name b { display: block; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ttcm-history-file-name small { display: block; margin-top: 2px; color: #64748b; }
.ttcm-history-round { display: inline-flex; padding: 4px 8px; border-radius: 999px; background: #fff7ed; color: #c2410c; font-size: 10px; font-weight: 900; }
.ttcm-history-round.is-later { background: #f5f3ff; color: #6d28d9; }
.ttcm-history-actions { display: flex; gap: 5px; }
.ttcm-history-actions button { width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid #e2e8f0; border-radius: 9px; background: #fff; color: #475569; cursor: pointer; }
.ttcm-history-actions button:hover { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
.ttcm-history-empty { display: grid; place-items: center; gap: 5px; min-height: 190px; padding: 28px; color: #94a3b8; text-align: center; }
.ttcm-history-empty strong { color: #475569; }
.ttcm-history-empty span { max-width: 360px; font-size: 12px; line-height: 1.5; }

@media (max-width: 1180px) {
  .ttcm-history-grid { grid-template-columns: 1fr; }
  .ttcm-history-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 720px) {
  .ttcm-history-view { padding: 10px; gap: 10px; }
  .ttcm-history-toolbar { align-items: stretch; flex-direction: column; }
  .ttcm-history-controls { justify-content: stretch; }
  .ttcm-history-field, .ttcm-history-field.is-year, .ttcm-history-teacher { width: 100%; min-width: 0; }
  .ttcm-history-stats { grid-template-columns: 1fr 1fr; gap: 8px; }
  .ttcm-history-stat { padding: 12px 12px 12px 16px; }
  .ttcm-history-stat strong { font-size: 19px; }
  .ttcm-history-panel > header { align-items: stretch; flex-direction: column; }
  .ttcm-history-search { width: 100%; }
  .ttcm-history-grid { min-height: 0; }
  .ttcm-history-filter-chips { overflow-x: auto; flex-wrap: nowrap; }
  .ttcm-history-filter-chip { flex: 0 0 auto; }
}
'''
Path('src/components/GlobalTtcmTeacherHistory.css').write_text(css, encoding='utf-8')

component_path = Path('src/components/GlobalTtcmNavigationTab.jsx')
component = component_path.read_text(encoding='utf-8')

def replace_once(old, new, label):
    global component
    count = component.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    component = component.replace(old, new, 1)

replace_once(
"""const CONTENT_TYPES = [
  { id: 'announcement', label: 'Thông báo', helper: 'Thông tin chỉ cần đọc', glyph: 'campaign', action: false },
  { id: 'resource', label: 'Gửi tài liệu', helper: 'Tệp dùng chung của tổ', glyph: 'folder', action: false },
  { id: 'feedback', label: 'Xin góp ý', helper: 'Giáo viên phản hồi ngay tại TTCM', glyph: 'edit', action: true },
  { id: 'acknowledgement', label: 'Yêu cầu xác nhận', helper: 'Cần xác nhận đã nhận', glyph: 'check', action: true },
  { id: 'task', label: 'Yêu cầu thực hiện', helper: 'Theo dõi và phản hồi ngay tại TTCM', glyph: 'task', action: true },
];
""",
"""const CONTENT_TYPES = [
  { id: 'announcement', label: 'Thông báo', helper: 'Thông tin chỉ cần đọc', glyph: 'campaign', action: false },
  { id: 'resource', label: 'Gửi tài liệu', helper: 'Tệp dùng chung của tổ', glyph: 'folder', action: false },
  { id: 'feedback', label: 'Xin góp ý', helper: 'Giáo viên phản hồi ngay tại TTCM', glyph: 'edit', action: true },
  { id: 'acknowledgement', label: 'Yêu cầu xác nhận', helper: 'Cần xác nhận đã nhận', glyph: 'check', action: true },
  { id: 'task', label: 'Yêu cầu thực hiện', helper: 'Theo dõi và phản hồi ngay tại TTCM', glyph: 'task', action: true },
];

const HISTORY_FILE_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'first', label: 'Lần đầu' },
  { id: 'resubmitted', label: 'Nộp lại' },
  { id: 'pdf', label: 'PDF' },
  { id: 'word', label: 'Word' },
  { id: 'sheet', label: 'Excel' },
  { id: 'archive', label: 'ZIP/RAR' },
];
""",
'history filters constant')

replace_once(
"""function formatFullDate(value) {
  const date = new Date(value); if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}
""",
"""function formatFullDate(value) {
  const date = new Date(value); if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}
function formatHistoryDate(value) {
  const date = new Date(value); if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}
function formatHistoryTime(value) {
  const date = new Date(value); if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date);
}
function historyRelativeLabel(value) {
  const date = new Date(value); if (Number.isNaN(date.getTime())) return '';
  const diffDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (diffDays === 0) return 'hôm nay';
  if (diffDays === 1) return '1 ngày trước';
  if (diffDays < 31) return `${diffDays} ngày trước`;
  return '';
}
function historySchoolYearLabel(value) { return String(value || '').replace('-', '–'); }
function historyItemTypeClass(label) {
  if (label === 'Yêu cầu thực hiện') return 'task';
  if (label === 'Xin góp ý') return 'feedback';
  if (label === 'Yêu cầu xác nhận') return 'acknowledgement';
  if (label === 'Tài liệu') return 'resource';
  if (label === 'Thông báo') return 'announcement';
  return 'content';
}
function historyFileClass(ext) {
  const value = String(ext || '').toLowerCase();
  if (value === 'pdf') return 'pdf';
  if (['doc', 'docx', 'odt', 'rtf'].includes(value)) return 'doc';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(value)) return 'sheet';
  if (['ppt', 'pptx', 'odp'].includes(value)) return 'slides';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(value)) return 'archive';
  return 'file';
}
function historyBodyNeedsExpansion(value) {
  const body = String(value || '');
  return body.length > 170 || body.split(/\\r?\\n/).length > 3;
}
""",
'history formatting helpers')

replace_once(
"""  const [historyTeacherId, setHistoryTeacherId] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [readIds, setReadIds] = useState(() => readReadIds(currentUser));
""",
"""  const [historyTeacherId, setHistoryTeacherId] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historySchoolYear, setHistorySchoolYear] = useState('');
  const [historyFileFilter, setHistoryFileFilter] = useState('all');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState(() => new Set());
  const [readIds, setReadIds] = useState(() => readReadIds(currentUser));
""",
'history state')

old_derived = """  const historyTeacher = useMemo(() => departmentTeachers.find((person) => String(person.id) === String(historyTeacherId)) || null, [departmentTeachers, historyTeacherId]);
  const teacherHistory = useMemo(() => buildTeacherHistory({ items, responses, teacherId: historyTeacherId }), [historyTeacherId, items, responses]);
  const historyNeedle = historyQuery.trim().toLowerCase();
  const visibleHistoryTimeline = useMemo(() => {
    if (!historyNeedle) return teacherHistory.timeline;
    return teacherHistory.timeline.filter((entry) => `${entry.label} ${entry.itemTitle} ${entry.itemType} ${entry.body}`.toLowerCase().includes(historyNeedle));
  }, [historyNeedle, teacherHistory.timeline]);
  const visibleHistoryFiles = useMemo(() => {
    if (!historyNeedle) return teacherHistory.files;
    return teacherHistory.files.filter((file) => `${file.name || ''} ${file.itemTitle || ''} ${file.itemType || ''}`.toLowerCase().includes(historyNeedle));
  }, [historyNeedle, teacherHistory.files]);
"""
new_derived = """  const historyTeacher = useMemo(() => departmentTeachers.find((person) => String(person.id) === String(historyTeacherId)) || null, [departmentTeachers, historyTeacherId]);
  const teacherHistory = useMemo(() => buildTeacherHistory({ items, responses, teacherId: historyTeacherId }), [historyTeacherId, items, responses]);
  const historyAcademicYears = useMemo(() => [...new Set(teacherHistory.timeline.map((entry) => entry.schoolYear).filter(Boolean))].sort().reverse(), [teacherHistory.timeline]);
  useEffect(() => {
    if (!manager) return;
    if (!historyAcademicYears.length) { if (historySchoolYear) setHistorySchoolYear(''); return; }
    if (!historySchoolYear || (historySchoolYear !== 'all' && !historyAcademicYears.includes(historySchoolYear))) setHistorySchoolYear(historyAcademicYears[0]);
  }, [historyAcademicYears, historySchoolYear, manager]);
  const yearHistoryTimeline = useMemo(() => historySchoolYear && historySchoolYear !== 'all' ? teacherHistory.timeline.filter((entry) => entry.schoolYear === historySchoolYear) : teacherHistory.timeline, [historySchoolYear, teacherHistory.timeline]);
  const yearHistoryFiles = useMemo(() => historySchoolYear && historySchoolYear !== 'all' ? teacherHistory.files.filter((file) => file.schoolYear === historySchoolYear) : teacherHistory.files, [historySchoolYear, teacherHistory.files]);
  const historySummary = useMemo(() => ({
    activityCount: yearHistoryTimeline.length,
    fileCount: yearHistoryFiles.length,
    itemCount: new Set(yearHistoryTimeline.map((entry) => entry.itemId).filter(Boolean)).size,
    latestAt: yearHistoryTimeline[0]?.createdAt || '',
  }), [yearHistoryFiles.length, yearHistoryTimeline]);
  const historyNeedle = historyQuery.trim().toLowerCase();
  const visibleHistoryTimeline = useMemo(() => {
    if (!historyNeedle) return yearHistoryTimeline;
    return yearHistoryTimeline.filter((entry) => `${entry.label} ${entry.statusLabel} ${entry.itemTitle} ${entry.itemType} ${entry.body}`.toLowerCase().includes(historyNeedle));
  }, [historyNeedle, yearHistoryTimeline]);
  const visibleHistoryFiles = useMemo(() => yearHistoryFiles.filter((file) => {
    if (historyNeedle && !`${file.name || ''} ${file.itemTitle || ''} ${file.itemType || ''} ${file.statusLabel || ''}`.toLowerCase().includes(historyNeedle)) return false;
    const ext = getWorkHubAttachmentExtension(file);
    if (historyFileFilter === 'first') return file.statusId === 'submitted';
    if (historyFileFilter === 'resubmitted') return file.statusId === 'resubmitted';
    if (historyFileFilter === 'pdf') return ext === 'pdf';
    if (historyFileFilter === 'word') return ['doc', 'docx', 'odt', 'rtf'].includes(ext);
    if (historyFileFilter === 'sheet') return ['xls', 'xlsx', 'csv', 'ods'].includes(ext);
    if (historyFileFilter === 'archive') return ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
    return true;
  }), [historyFileFilter, historyNeedle, yearHistoryFiles]);
  function toggleHistoryExpanded(entryId) {
    setExpandedHistoryIds((current) => { const next = new Set(current); if (next.has(entryId)) next.delete(entryId); else next.add(entryId); return next; });
  }
"""
replace_once(old_derived, new_derived, 'history derivations')

start_marker = "          : workspaceView === 'history' && manager ? (\n"
end_marker = "          : <main className=\"ttcm-m3-personnel-view\" role=\"tabpanel\" aria-label=\"Nhân sự tổ chuyên môn\"><PersonnelLookup currentUser={currentUser} language={language} /></main>}"
start = component.find(start_marker)
end = component.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit(f'history workspace markers missing: start={start}, end={end}')

history_block = '''          : workspaceView === 'history' && manager ? (
            <main className="ttcm-history-view" role="tabpanel" aria-label="Lịch sử và file giáo viên">
              <section className="ttcm-history-toolbar">
                <div className="ttcm-history-toolbar-copy"><strong>Hồ sơ hoạt động giáo viên</strong><span>Theo dõi toàn bộ phản hồi, xác nhận và tệp giáo viên đã gửi cho TTCM.</span></div>
                <div className="ttcm-history-controls">
                  <label className="ttcm-history-field"><span>Giáo viên</span><select value={historyTeacherId} onChange={(event) => { setHistoryTeacherId(event.target.value); setHistoryQuery(''); setHistorySchoolYear(''); setHistoryFileFilter('all'); setExpandedHistoryIds(new Set()); }}><option value="">Chọn giáo viên</option>{departmentTeachers.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
                  <label className="ttcm-history-field is-year"><span>Năm học</span><select value={historySchoolYear} onChange={(event) => setHistorySchoolYear(event.target.value)} disabled={!historyAcademicYears.length}><option value="all">Tất cả năm học</option>{historyAcademicYears.map((year) => <option key={year} value={year}>{historySchoolYearLabel(year)}</option>)}</select></label>
                  {historyTeacher ? <div className="ttcm-history-teacher"><span className="ttcm-history-avatar">{String(historyTeacher.name || 'GV').trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase()}</span><div><b>{historyTeacher.name}</b><small>{historyTeacher.email || 'Giáo viên tổ chuyên môn'}</small></div></div> : null}
                </div>
              </section>

              <section className="ttcm-history-stats" aria-label="Tổng quan hoạt động">
                <article className="ttcm-history-stat is-activity"><div className="ttcm-history-stat-head"><span className="ttcm-history-stat-icon"><Icon name="history" size={16} /></span><span>Lượt hoạt động</span></div><strong>{historySummary.activityCount}</strong><small>Phản hồi / xác nhận đã ghi nhận</small></article>
                <article className="ttcm-history-stat is-content"><div className="ttcm-history-stat-head"><span className="ttcm-history-stat-icon"><Icon name="task" size={16} /></span><span>Nội dung đã tham gia</span></div><strong>{historySummary.itemCount}</strong><small>Yêu cầu TTCM có tương tác</small></article>
                <article className="ttcm-history-stat is-files"><div className="ttcm-history-stat-head"><span className="ttcm-history-stat-icon"><Icon name="folder" size={16} /></span><span>File đã nộp</span></div><strong>{historySummary.fileCount}</strong><small>Giữ đủ các lần nộp, không ghi đè lịch sử</small></article>
                <article className="ttcm-history-stat is-latest"><div className="ttcm-history-stat-head"><span className="ttcm-history-stat-icon"><Icon name="calendar" size={16} /></span><span>Hoạt động gần nhất</span></div><strong>{historySummary.latestAt ? formatHistoryDate(historySummary.latestAt) : '—'}</strong><small>{historySummary.latestAt ? [formatHistoryTime(historySummary.latestAt), historyRelativeLabel(historySummary.latestAt)].filter(Boolean).join(' · ') : 'Chưa có dữ liệu'}</small></article>
              </section>

              <section className="ttcm-history-grid">
                <article className="ttcm-history-panel">
                  <header><div><strong>Lịch sử hoạt động</strong><small>{visibleHistoryTimeline.length} sự kiện{historySchoolYear && historySchoolYear !== 'all' ? ` · ${historySchoolYearLabel(historySchoolYear)}` : ''}</small></div></header>
                  {historyTeacherId && visibleHistoryTimeline.length ? <div className="ttcm-history-timeline">{visibleHistoryTimeline.map((entry) => { const expanded = expandedHistoryIds.has(entry.id); const expandable = historyBodyNeedsExpansion(entry.body); return <div className={`ttcm-history-event is-${entry.statusId || 'responded'}`} key={entry.id}><span className="ttcm-history-event-dot" /><div className="ttcm-history-event-card"><header><b>{entry.label}</b><time>{formatDate(entry.createdAt)}</time></header><h4>{entry.itemTitle}</h4>{entry.body ? <><p className={!expanded && expandable ? 'is-clamped' : undefined}>{entry.body}</p>{expandable ? <button type="button" className="ttcm-history-expand" onClick={() => toggleHistoryExpanded(entry.id)}>{expanded ? 'Thu gọn' : 'Xem đầy đủ'}</button> : null}</> : null}<div className="ttcm-history-event-meta"><span className={`ttcm-history-chip is-${historyItemTypeClass(entry.itemType)}`}>{entry.itemType}</span><span className="ttcm-history-chip">Phản hồi #{entry.responseIndex}</span><span className={`ttcm-history-status is-${entry.statusId || 'responded'}`}>{entry.statusLabel || 'Đã phản hồi'}</span>{entry.attachmentCount ? <><span className="ttcm-history-chip is-file">Lần nộp file #{entry.fileSubmissionIndex}</span><span className="ttcm-history-chip is-file">{entry.attachmentCount} file</span></> : null}</div></div></div>; })}</div> : <div className="ttcm-history-empty"><Icon name="history" size={30} /><strong>{historyTeacherId ? 'Chưa có hoạt động phù hợp' : 'Chọn giáo viên để xem lịch sử'}</strong><span>{historyTeacherId ? 'Các phản hồi, xác nhận và lần nộp tệp mới sẽ tự động xuất hiện tại đây.' : 'TTCM có thể chọn từng giáo viên trong tổ để xem hồ sơ hoạt động.'}</span></div>}
                </article>

                <article className="ttcm-history-panel">
                  <header><div><strong>Danh sách file đã nộp</strong><small>{visibleHistoryFiles.length}/{historySummary.fileCount} file{historySchoolYear && historySchoolYear !== 'all' ? ` · ${historySchoolYearLabel(historySchoolYear)}` : ''}</small></div><input className="ttcm-history-search" type="search" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Tìm tên file hoặc nội dung TTCM…" aria-label="Tìm file giáo viên đã nộp" /></header>
                  <div className="ttcm-history-filter-chips" aria-label="Bộ lọc file nhanh">{HISTORY_FILE_FILTERS.map((filterOption) => <button type="button" key={filterOption.id} className={`ttcm-history-filter-chip is-${filterOption.id} ${historyFileFilter === filterOption.id ? 'is-selected' : ''}`} aria-pressed={historyFileFilter === filterOption.id} onClick={() => setHistoryFileFilter(filterOption.id)}>{filterOption.label}</button>)}</div>
                  {historyTeacherId && visibleHistoryFiles.length ? <div className="ttcm-history-files"><table className="ttcm-history-table"><thead><tr><th>File</th><th>Nội dung TTCM</th><th>Ngày nộp</th><th>Lần nộp</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{visibleHistoryFiles.map((file) => { const ext = getWorkHubAttachmentExtension(file); const relatedItem = items.find((item) => String(item.id) === String(file.itemId)) || { id: file.itemId, title: file.itemTitle }; return <tr key={file.id}><td><div className="ttcm-history-file-name"><span className={`ttcm-history-file-badge is-${historyFileClass(ext)}`}>{ext ? ext.slice(0, 4).toUpperCase() : 'FILE'}</span><div><b title={file.name}>{file.name || 'Tệp đính kèm'}</b><small>{[ext ? ext.toUpperCase() : '', formatFileSize(file.size)].filter(Boolean).join(' · ') || 'Tệp TTCM'}</small></div></div></td><td><b>{file.itemTitle}</b><br /><small>{file.itemType}</small></td><td>{formatFullDate(file.submittedAt) || '—'}</td><td><span className={`ttcm-history-round ${file.submissionIndex > 1 ? 'is-later' : ''}`}>Lần {file.submissionIndex}</span></td><td><span className={`ttcm-history-status is-${file.statusId || 'submitted'}`}>{file.statusLabel || 'Đã nộp'}</span></td><td><div className="ttcm-history-actions"><button type="button" onClick={() => previewAttachment(relatedItem, file)} title="Xem trước" aria-label={`Xem ${file.name || 'tệp'}`}><Icon name="eye" size={17} /></button><button type="button" onClick={() => downloadAttachment(relatedItem, file)} title="Tải về" aria-label={`Tải ${file.name || 'tệp'}`}><Icon name="download" size={17} /></button></div></td></tr>; })}</tbody></table></div> : <div className="ttcm-history-empty"><Icon name="folder" size={30} /><strong>{historyTeacherId ? ((historyQuery || historyFileFilter !== 'all') ? 'Không tìm thấy file phù hợp' : 'Giáo viên chưa nộp file') : 'Chưa chọn giáo viên'}</strong><span>Toàn bộ tệp đính kèm trong các lần phản hồi TTCM sẽ được tập hợp ở đây và vẫn giữ riêng từng lần nộp.</span></div>}
                </article>
              </section>
            </main>
          )
'''
component = component[:start] + history_block + component[end:]
component_path.write_text(component, encoding='utf-8')
