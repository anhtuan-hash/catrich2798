import { normalizeHomeroomWorkspace } from './homeroomStore.js';

function nowIso() { return new Date().toISOString(); }
function safeText(value, fallback = '') { const text = String(value ?? '').trim(); return text || fallback; }
function uid(prefix = 'item') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function makeWorkspaceId(className = 'class', schoolYear = '') {
  const base = `${className}-${schoolYear}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'class';
  return `${base}-${Date.now().toString(36).slice(-5)}`;
}

function snapshotPayload(workspace) {
  const normalized = normalizeHomeroomWorkspace(workspace);
  const { auditLogs, backups, ...rest } = normalized;
  return rest;
}

function collectionCounts(workspace) {
  const w = normalizeHomeroomWorkspace(workspace);
  return {
    students: w.students.length,
    attendanceSessions: Object.keys(w.attendance || {}).length,
    schedule: w.schedule.length,
    learningRecords: w.learningRecords.length,
    incidents: w.incidents.length,
    supportPlans: w.supportPlans.length,
    announcements: w.announcements.length,
    records: w.records.length,
    conductRecords: w.conductRecords.length,
    conductCustomRules: w.conductCustomRules.length,
  };
}

function summarizeChanges(before, after) {
  const a = collectionCounts(before);
  const b = collectionCounts(after);
  const changes = Object.keys(a).filter((key) => a[key] !== b[key]).map((key) => `${key}: ${a[key]} → ${b[key]}`);
  const beforeName = safeText(before?.classProfile?.className);
  const afterName = safeText(after?.classProfile?.className);
  if (beforeName !== afterName) changes.unshift(`className: ${beforeName || '—'} → ${afterName || '—'}`);
  return changes.length ? changes.join(' · ') : 'Cập nhật nội dung lớp';
}

export function prepareWorkspaceCommit(previous, next, actor, action = 'Cập nhật dữ liệu') {
  const before = normalizeHomeroomWorkspace(previous, actor);
  const after = normalizeHomeroomWorkspace(next, actor);
  const createdAt = nowIso();
  const auditEntry = {
    id: uid('audit'),
    action: safeText(action, 'Cập nhật dữ liệu'),
    summary: summarizeChanges(before, after),
    actorId: safeText(actor?.id || actor?.authId),
    actorName: safeText(actor?.name || actor?.email, 'Người dùng'),
    actorEmail: safeText(actor?.email),
    source: 'web-app',
    createdAt,
  };
  const auditLogs = [auditEntry, ...(after.auditLogs || [])].slice(0, 300);

  const lastBackupAt = Date.parse(after.backups?.[0]?.createdAt || 0) || 0;
  const shouldBackup = !lastBackupAt || Date.now() - lastBackupAt > 6 * 60 * 60 * 1000;
  let backups = after.backups || [];
  if (shouldBackup) {
    backups = [{
      id: uid('backup'),
      label: `Tự động · ${new Date(createdAt).toLocaleString('vi-VN')}`,
      kind: 'automatic',
      createdAt,
      createdBy: safeText(actor?.email || actor?.name),
      snapshot: snapshotPayload(after),
    }, ...backups].slice(0, 30);
  }
  return { ...after, auditLogs, backups, updatedAt: createdAt };
}

export function createManualBackup(workspace, actor, label = '') {
  const current = normalizeHomeroomWorkspace(workspace, actor);
  const createdAt = nowIso();
  const item = {
    id: uid('backup'),
    label: safeText(label, `Sao lưu thủ công · ${new Date(createdAt).toLocaleString('vi-VN')}`),
    kind: 'manual',
    createdAt,
    createdBy: safeText(actor?.email || actor?.name),
    snapshot: snapshotPayload(current),
  };
  return { ...current, backups: [item, ...(current.backups || [])].slice(0, 30), updatedAt: createdAt };
}

export function restoreWorkspaceBackup(workspace, backupId, actor) {
  const current = normalizeHomeroomWorkspace(workspace, actor);
  const backup = (current.backups || []).find((item) => item.id === backupId);
  if (!backup?.snapshot) throw new Error('Không tìm thấy bản sao lưu.');
  const restored = normalizeHomeroomWorkspace({
    ...backup.snapshot,
    id: current.id,
    backups: current.backups,
    auditLogs: current.auditLogs,
    updatedAt: nowIso(),
  }, actor);
  return prepareWorkspaceCommit(current, restored, actor, `Khôi phục bản sao lưu: ${backup.label}`);
}

export function removeBackup(workspace, backupId) {
  const current = normalizeHomeroomWorkspace(workspace);
  return { ...current, backups: current.backups.filter((item) => item.id !== backupId), updatedAt: nowIso() };
}

export function addIncident(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const item = {
    id: safeText(input.id, uid('incident')),
    studentId: safeText(input.studentId),
    date: safeText(input.date, new Date().toISOString().slice(0, 10)),
    category: safeText(input.category, 'Nề nếp'),
    severity: safeText(input.severity, 'low'),
    title: safeText(input.title),
    description: safeText(input.description),
    discoveredBy: safeText(input.discoveredBy),
    peopleInvolved: safeText(input.peopleInvolved),
    actionTaken: safeText(input.actionTaken),
    followUpDate: safeText(input.followUpDate),
    outcome: safeText(input.outcome),
    status: safeText(input.status, 'open'),
    evidenceName: safeText(input.evidenceName),
    createdAt: input.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  if (!item.studentId || !item.title) throw new Error('Cần chọn học sinh và nhập tiêu đề sự việc.');
  return { ...current, incidents: [item, ...current.incidents.filter((entry) => entry.id !== item.id)], updatedAt: nowIso() };
}

export function addSupportPlan(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const item = {
    id: safeText(input.id, uid('support')),
    studentId: safeText(input.studentId),
    title: safeText(input.title),
    goal: safeText(input.goal),
    actions: safeText(input.actions),
    collaborators: safeText(input.collaborators),
    startDate: safeText(input.startDate, new Date().toISOString().slice(0, 10)),
    reviewDate: safeText(input.reviewDate),
    successCriteria: safeText(input.successCriteria),
    progress: safeText(input.progress),
    status: safeText(input.status, 'active'),
    createdAt: input.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  if (!item.studentId || !item.title || !item.goal) throw new Error('Kế hoạch hỗ trợ cần học sinh, tiêu đề và mục tiêu.');
  return { ...current, supportPlans: [item, ...current.supportPlans.filter((entry) => entry.id !== item.id)], updatedAt: nowIso() };
}

export function updateIncidentStatus(workspace, id, patch = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  return { ...current, incidents: current.incidents.map((item) => item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item), updatedAt: nowIso() };
}

export function updateSupportPlan(workspace, id, patch = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  return { ...current, supportPlans: current.supportPlans.map((item) => item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item), updatedAt: nowIso() };
}

export function attendanceSessionKey(date, session = 'day', period = '') {
  return `${safeText(date)}::${safeText(session, 'day')}::${safeText(period)}`;
}

export function parseAttendanceSessionKey(key) {
  const [date = '', session = 'day', period = ''] = String(key || '').split('::');
  return { date, session, period };
}

export function createCorrectionRequest(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const item = {
    id: uid('correction'),
    sessionKey: safeText(input.sessionKey),
    reason: safeText(input.reason),
    requestedBy: safeText(input.requestedBy),
    requestedAt: nowIso(),
    status: 'pending',
  };
  if (!item.sessionKey || !item.reason) throw new Error('Thiếu phiên điểm danh hoặc lý do chỉnh sửa.');
  return { ...current, correctionRequests: [item, ...current.correctionRequests], updatedAt: nowIso() };
}

export function searchWorkspace(workspace, query) {
  const q = safeText(query).toLowerCase();
  if (!q) return [];
  const w = normalizeHomeroomWorkspace(workspace);
  const results = [];
  const push = (type, id, title, subtitle, text, tab) => {
    const haystack = `${title} ${subtitle} ${text}`.toLowerCase();
    if (haystack.includes(q)) results.push({ type, id, title, subtitle, text, tab });
  };
  w.students.forEach((item) => push('Học sinh', item.id, item.fullName, item.code, `${item.parentName} ${item.parentPhone} ${item.notes}`, 'students'));
  w.schedule.forEach((item) => push('Lịch', item.id, item.title, `${item.date} ${item.startTime}`, `${item.category} ${item.location} ${item.note}`, 'schedule'));
  w.parentContacts.forEach((item) => push('Phụ huynh', item.id, item.subject || 'Trao đổi phụ huynh', item.date, `${item.message} ${item.outcome}`, 'parents'));
  w.incidents.forEach((item) => push('Sự việc', item.id, item.title, `${item.date} ${item.category}`, `${item.description} ${item.actionTaken} ${item.outcome}`, 'support'));
  w.supportPlans.forEach((item) => push('Kế hoạch hỗ trợ', item.id, item.title, item.status, `${item.goal} ${item.actions} ${item.progress}`, 'support'));
  w.announcements.forEach((item) => push('Thông báo', item.id, item.title, item.dueDate, item.message, 'announcements'));
  w.records.forEach((item) => push('Hồ sơ', item.id, item.title, `${item.type} ${item.period}`, item.content, 'records'));
  w.conductRecords.forEach((item) => {
    const student = w.students.find((entry) => entry.id === item.studentId);
    push('Rèn luyện', item.id, item.title, `${item.date} · ${student?.fullName || ''} · -${item.deduction} điểm`, `${item.category} ${item.note} ${item.evidence}`, 'conduct');
  });
  w.conductCustomRules.forEach((item) => push('Nội quy bổ sung', item.id, item.title, `${item.category} · -${item.personalDeduction} điểm`, `${item.description} ${item.reference}`, 'conduct'));
  w.subjectFeedback.forEach((item) => push('Nhận xét bộ môn', item.id, item.subject, item.teacherName, `${item.comment} ${item.action}`, 'feedback'));
  return results.slice(0, 100);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

export function buildRecordDocumentHtml(workspace, record, options = {}) {
  const w = normalizeHomeroomWorkspace(workspace);
  const title = safeText(record?.title, 'Hồ sơ chủ nhiệm');
  const school = safeText(options.schoolName || w.classProfile.schoolName, 'TRƯỜNG THPT');
  const content = escapeHtml(record?.content || '').replace(/\n/g, '<br>');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
  @page{size:A4;margin:20mm}body{font-family:"Times New Roman",serif;color:#111;font-size:14pt;line-height:1.5}.head{display:grid;grid-template-columns:1fr 1.25fr;text-align:center}.head b{display:block}.line{width:130px;border-top:1px solid #111;margin:5px auto 0}h1{text-align:center;font-size:16pt;margin:34px 0 6px;text-transform:uppercase}.meta{text-align:center;margin-bottom:24px}.content{text-align:justify}.sign{margin-top:44px;display:grid;grid-template-columns:1fr 1fr;text-align:center}.sign b{display:block}.footer{margin-top:28px;font-size:11pt;color:#555}
  </style></head><body><div class="head"><div><b>${escapeHtml(school)}</b><b>LỚP ${escapeHtml(w.classProfile.className || '—')}</b><div class="line"></div></div><div><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><b>Độc lập – Tự do – Hạnh phúc</b><div class="line"></div></div></div><h1>${escapeHtml(title)}</h1><div class="meta">${escapeHtml(record?.type || '')}${record?.period ? ` · ${escapeHtml(record.period)}` : ''}</div><div class="content">${content}</div><div class="sign"><div><b>NGƯỜI LẬP</b><br><br><br>${escapeHtml(w.classProfile.adviserName || '')}</div><div><b>XÁC NHẬN</b><br><br><br></div></div><div class="footer">Tạo từ Brian English Studio · ${new Date().toLocaleString('vi-VN')}</div></body></html>`;
}

export function downloadWordDocument(workspace, record, options = {}) {
  const html = buildRecordDocumentHtml(workspace, record, options);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeText(record?.title, 'ho-so-gvcn').replace(/[^a-zA-Z0-9À-ỹ _-]/g, '').replace(/\s+/g, '-')}.doc`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function printRecordAsPdf(workspace, record, options = {}) {
  const html = buildRecordDocumentHtml(workspace, record, options);
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
  if (!popup) throw new Error('Trình duyệt đang chặn cửa sổ in.');
  popup.document.open(); popup.document.write(html); popup.document.close();
  popup.addEventListener('load', () => setTimeout(() => popup.print(), 300));
}

export function buildClassSummary(workspace) {
  const w = normalizeHomeroomWorkspace(workspace);
  const activeStudents = w.students.filter((student) => student.active !== false).length;
  const archivedStudents = w.students.length - activeStudents;
  const openIncidents = w.incidents.filter((item) => item.status !== 'closed').length;
  const dueReminders = w.reminders.filter((item) => !item.done && item.dueDate && item.dueDate <= new Date().toISOString().slice(0, 10)).length;
  return { activeStudents, archivedStudents, openIncidents, dueReminders, updatedAt: w.updatedAt };
}
