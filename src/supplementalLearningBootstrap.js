import './styles/SupplementalLearning.css';
import { ensureRuntimeReady, getRuntimeClient, getRuntimeState, subscribeRuntime } from './services/runtime/core.js';
import { canManageSupplementalLearning } from './supplementalAccess.js';
import {
  archiveSupplementalClass,
  loadSupplementalClasses,
  setSupplementalClassMemberStatus,
  upsertSupplementalClass,
  upsertSupplementalClassMember,
} from './attendance/supplementalLearningApi.js';

const INSTALL_KEY = '__besSupplementalLearningAdminInstalled';
const HOST_ID = 'bes-supplemental-learning-admin';
let runtime = null;
let client = null;
let classes = [];
let busy = false;
let message = '';
let observer = null;
let classQuery = '';
let selectedClassId = '';
let creatingClass = false;

const canManage = () => canManageSupplementalLearning(runtime || {});
const today = () => new Date().toISOString().slice(0, 10);
const fold = (value) => String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
function plusMonths(months = 10) { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10); }
function weekdayLabel(day) { return Number(day) === 7 ? 'CN' : `Thứ ${Number(day) + 1}`; }
function scheduleLabel(item = {}) {
  return `${(item.weekdays || []).map(weekdayLabel).join(', ') || 'Chưa có lịch'} · ${item.startTime && item.endTime ? `${item.startTime}–${item.endTime}` : 'Chưa có giờ'}`;
}
function teacherNames(item = {}) { return (item.teachers || []).map((t) => t.fullName || t.teacherName || '').filter(Boolean).join(', ') || 'Chưa phân công'; }
function setMessage(text = '', tone = 'ok') {
  message = text;
  const node = document.querySelector('.bes-supplemental-message');
  if (node) { node.textContent = text; node.dataset.tone = tone; }
}

async function reload({ keepSelection = true } = {}) {
  if (!client || !canManage()) return;
  try {
    classes = await loadSupplementalClasses(client, { includeArchived: true });
    if (keepSelection && selectedClassId && !classes.some((item) => item.id === selectedClassId)) selectedClassId = '';
    renderPanel();
  } catch (error) {
    setMessage(error?.message || 'Không thể tải dữ liệu Lớp học bổ sung.', 'error');
  }
}

function ensureLauncher() {
  const tabs = document.querySelector('.attendance-tabs');
  if (!tabs || !canManage()) {
    document.querySelector('.bes-supplemental-nav-tab')?.remove();
    document.getElementById(HOST_ID)?.remove();
    return;
  }
  if (tabs.querySelector('.bes-supplemental-nav-tab')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bes-supplemental-nav-tab';
  button.dataset.besKeepSearch = 'true';
  button.innerHTML = '<span aria-hidden="true">＋</span><span>Học bổ sung</span>';
  button.addEventListener('click', openPanel);
  const report = [...tabs.querySelectorAll('button')].find((item) => /báo cáo|report/i.test(item.textContent || ''));
  if (report) report.insertAdjacentElement('beforebegin', button); else tabs.append(button);
}

function openPanel() {
  if (!canManage()) return;
  let host = document.getElementById(HOST_ID);
  if (!host) { host = document.createElement('div'); host.id = HOST_ID; document.body.append(host); }
  renderPanel();
  void reload();
}
function closePanel() { document.getElementById(HOST_ID)?.remove(); selectedClassId = ''; creatingClass = false; }

function emptyClass() {
  return { id: '', className: '', subject: '', gradeLevel: '', room: '', startDate: today(), endDate: plusMonths(), weekdays: [2], startTime: '16:40', endTime: '17:15', note: '', active: true, teachers: [], members: [] };
}
function weekdayChecks(selected = [2]) {
  const values = new Set((selected || []).map(Number));
  return [1,2,3,4,5,6,7].map((day) => `<label class="bes-supplemental-day"><input type="checkbox" name="weekday" value="${day}" ${values.has(day) ? 'checked' : ''}><span>${weekdayLabel(day)}</span></label>`).join('');
}
function teacherRow(teacher = {}, index = 0) {
  return `<div class="bes-supplemental-teacher-row" data-teacher-row><label>Họ và tên<input name="teacherName" value="${esc(teacher.fullName || teacher.teacherName || '')}" placeholder="Họ tên giáo viên"></label><label>Email<input name="teacherEmail" type="email" value="${esc(teacher.email || teacher.teacherEmail || '')}" placeholder="Không bắt buộc"></label><button type="button" class="is-danger-quiet" data-remove-teacher aria-label="Xóa giáo viên ${index + 1}">Xóa</button></div>`;
}
function classSearchText(item) {
  return fold([item.className, item.subject, item.gradeLevel, item.room, teacherNames(item), ...(item.members || []).map((m) => `${m.fullName} ${m.studentCode} ${m.schoolClassName}`)].join(' '));
}

function classCards() {
  const q = fold(classQuery);
  const rows = classes.filter((item) => !item.archivedAt && (!q || classSearchText(item).includes(q)));
  if (!rows.length) return '<div class="bes-supplemental-empty-state"><strong>Chưa có lớp học bổ sung phù hợp.</strong><span>Chọn “Tạo lớp học bổ sung” để bắt đầu.</span></div>';
  return `<div class="bes-supplemental-class-grid">${rows.map((item) => {
    const next = item.nextSession || null;
    return `<article class="bes-supplemental-class-card"><header><div><span class="bes-supplemental-source-badge">LỚP HỌC BỔ SUNG</span><h3>${esc(item.className || item.groupName)}</h3><p>${esc(item.subject)} · Khối ${esc(item.gradeLevel || '—')}</p></div><span class="bes-supplemental-status ${item.active === false ? 'is-paused' : ''}">${item.active === false ? 'Tạm dừng' : 'Đang hoạt động'}</span></header><div class="bes-supplemental-class-meta"><span><b>Phòng</b>${esc(item.room || 'Chưa xếp')}</span><span><b>Lịch học</b>${esc(scheduleLabel(item))}</span><span><b>Giáo viên</b>${esc(teacherNames(item))}</span><span><b>Học sinh</b>${Number(item.activeStudentCount || 0)} đang học</span></div>${next ? `<p class="bes-supplemental-next-session"><b>Buổi kế tiếp:</b> ${esc(next.date)} · ${esc(next.startTime)}–${esc(next.endTime)}</p>` : '<p class="bes-supplemental-next-session is-muted">Chưa có buổi sắp tới.</p>'}<footer><button type="button" class="is-primary" data-action="manage-class" data-id="${esc(item.id)}">Quản lý</button><button type="button" data-action="attendance" data-id="${esc(item.id)}" data-session="${esc(next?.id || '')}" ${next ? '' : 'disabled'}>Điểm danh</button><button type="button" data-action="history" data-id="${esc(item.id)}">Lịch sử</button><button type="button" class="is-danger-quiet" data-action="archive-class" data-id="${esc(item.id)}">Xóa lớp</button></footer></article>`;
  }).join('')}</div>`;
}
function archivedClasses() {
  const rows = classes.filter((item) => item.archivedAt);
  if (!rows.length) return '';
  return `<details class="bes-supplemental-archive"><summary>Lớp đã lưu trữ (${rows.length})</summary><div>${rows.map((item) => `<article><span><b>${esc(item.className || item.groupName)}</b><small>${esc(item.subject)} · ${esc(item.archivedAt || '')}</small></span><button type="button" data-action="history" data-id="${esc(item.id)}">Xem lịch sử</button></article>`).join('')}</div></details>`;
}
function memberRows(item) {
  if (!(item.members || []).length) return '<p class="bes-supplemental-empty">Chưa có học sinh trong lớp.</p>';
  return `<div class="bes-supplemental-member-list">${item.members.map((member) => {
    const active = member.status === 'active';
    return `<article class="bes-supplemental-member-row"><div><strong>${esc(member.fullName)}</strong><small>${esc(member.studentCode || 'Không mã')} · ${esc(member.schoolClassName || 'Chưa lớp chính khóa')}</small></div><span class="bes-supplemental-member-status ${active ? 'is-active' : 'is-stopped'}">${active ? 'Đang học' : 'Ngừng học'}</span><div class="bes-supplemental-member-actions">${active ? `<details><summary>Sửa</summary><form data-form="edit-member" data-student="${esc(member.studentId)}"><input name="fullName" value="${esc(member.fullName)}" required><input name="studentCode" value="${esc(member.studentCode || '')}" placeholder="Mã học sinh"><input name="schoolClassName" value="${esc(member.schoolClassName || '')}" placeholder="Lớp chính khóa"><button type="submit">Lưu</button></form></details>` : ''}<button type="button" data-action="member-status" data-student="${esc(member.studentId)}" data-active="${active ? 'false' : 'true'}">${active ? 'Chuyển sang Ngừng học' : 'Kích hoạt lại'}</button></div></article>`;
  }).join('')}</div>`;
}
function classEditor(item) {
  const isNew = !item.id;
  const teachers = item.teachers?.length ? item.teachers : [{}];
  return `<div class="bes-supplemental-class-editor"><div class="bes-supplemental-editor-heading"><button type="button" data-action="back-to-classes">← Danh sách lớp</button><div><span>${isNew ? 'TẠO MỚI' : 'QUẢN LÝ LỚP'}</span><h3>${isNew ? 'Tạo lớp học bổ sung' : esc(item.className || item.groupName)}</h3></div></div><form class="bes-supplemental-class-form" data-form="class"><section class="bes-supplemental-editor-card"><header><div><h4>Thông tin lớp</h4><p>Nhập trực tiếp thông tin dùng cho lịch học và điểm danh.</p></div></header><div class="bes-supplemental-form-grid"><label>Tên lớp<input name="className" value="${esc(item.className || item.groupName || '')}" required></label><label>Môn học<input name="subject" value="${esc(item.subject || '')}" required></label><label>Khối<input name="gradeLevel" value="${esc(item.gradeLevel || '')}" placeholder="10, 11 hoặc 12" required></label><label>Phòng học<input name="room" value="${esc(item.room || '')}" placeholder="Không bắt buộc"></label><label>Từ ngày<input name="startDate" type="date" value="${esc(item.startDate || today())}" required></label><label>Đến ngày<input name="endDate" type="date" value="${esc(item.endDate || plusMonths())}" required></label><label>Giờ bắt đầu<input name="startTime" type="time" value="${esc(item.startTime || '16:40')}" required></label><label>Giờ kết thúc<input name="endTime" type="time" value="${esc(item.endTime || '17:15')}" required></label></div><fieldset class="bes-supplemental-weekdays"><legend>Ngày học trong tuần</legend>${weekdayChecks(item.weekdays || [2])}</fieldset><label>Ghi chú<textarea name="note" rows="3" placeholder="Không bắt buộc">${esc(item.note || '')}</textarea></label><label class="bes-supplemental-switch"><input type="checkbox" name="active" ${item.active !== false ? 'checked' : ''}><span>Lớp đang hoạt động</span></label></section><section class="bes-supplemental-editor-card"><header><div><h4>Giáo viên phụ trách</h4><p>Thông tin phụ trách không tự cấp quyền truy cập Học bổ sung.</p></div><button type="button" data-add-teacher>+ Thêm giáo viên</button></header><div class="bes-supplemental-teacher-list" data-teacher-list>${teachers.map(teacherRow).join('')}</div></section><div class="bes-supplemental-savebar"><button type="button" data-action="back-to-classes">Hủy</button><button class="is-primary" type="submit" ${busy ? 'disabled' : ''}>${isNew ? 'Tạo lớp học bổ sung' : 'Lưu thay đổi'}</button></div></form>${isNew ? '<section class="bes-supplemental-editor-card is-disabled"><h4>Học sinh</h4><p>Hãy lưu lớp trước khi thêm học sinh.</p></section>' : `<section class="bes-supplemental-editor-card bes-supplemental-students-card"><header><div><h4>Học sinh</h4><p>Quản lý danh sách riêng của lớp và trạng thái đang học/ngừng học.</p></div><span>${Number(item.activeStudentCount || 0)} đang học</span></header><form class="bes-supplemental-add-member" data-form="add-member"><label>Họ và tên<input name="fullName" required placeholder="Họ tên học sinh"></label><label>Mã học sinh<input name="studentCode" placeholder="Không bắt buộc"></label><label>Lớp chính khóa<input name="schoolClassName" placeholder="VD: 12.6"></label><button class="is-primary" type="submit" ${busy ? 'disabled' : ''}>+ Thêm học sinh</button></form>${memberRows(item)}</section>`}</div>`;
}

function renderPanel() {
  const host = document.getElementById(HOST_ID);
  if (!host || !canManage()) return;
  const selected = creatingClass ? emptyClass() : classes.find((item) => item.id === selectedClassId) || null;
  host.innerHTML = `<section class="bes-supplemental-dialog bes-supplemental-admin-workspace"><header class="bes-supplemental-header"><div><span class="bes-supplemental-source-badge">ĐIỂM DANH</span><h2>Lớp học bổ sung</h2><p>Tạo lớp, quản lý giáo viên và học sinh thủ công, sau đó điểm danh như các lớp khác.</p></div><button type="button" data-action="close" aria-label="Đóng">×</button></header><div class="bes-supplemental-message" data-tone="ok">${esc(message)}</div><main class="bes-supplemental-main">${selected ? classEditor(selected) : `<section class="bes-supplemental-class-home"><div class="bes-supplemental-class-toolbar"><label>Tìm lớp<input type="search" data-class-search value="${esc(classQuery)}" placeholder="Tên lớp, môn, giáo viên, học sinh"></label><button class="is-primary" type="button" data-action="create-class">+ Tạo lớp học bổ sung</button></div>${classCards()}${archivedClasses()}</section>`}</main></section>`;
  bindPanel(host, selected);
}

function readTeachers(form) {
  return [...form.querySelectorAll('[data-teacher-row]')].map((row) => ({ fullName: row.querySelector('[name="teacherName"]')?.value?.trim() || '', email: row.querySelector('[name="teacherEmail"]')?.value?.trim() || '' })).filter((t) => t.fullName);
}
function classPayload(form, item) {
  const values = new FormData(form);
  return { id: item?.id || null, className: String(values.get('className') || '').trim(), subject: String(values.get('subject') || '').trim(), gradeLevel: String(values.get('gradeLevel') || '').trim(), room: String(values.get('room') || '').trim(), startDate: String(values.get('startDate') || ''), endDate: String(values.get('endDate') || ''), startTime: String(values.get('startTime') || ''), endTime: String(values.get('endTime') || ''), weekdays: [...form.querySelectorAll('input[name="weekday"]:checked')].map((input) => Number(input.value)), note: String(values.get('note') || '').trim(), active: form.querySelector('[name="active"]')?.checked === true, teachers: readTeachers(form) };
}
async function runMutation(task, success, { keepSelection = true } = {}) {
  if (busy || !canManage()) return;
  busy = true;
  renderPanel();
  try { await task(); message = success; await reload({ keepSelection }); }
  catch (error) { setMessage(error?.message || 'Không thể lưu thay đổi.', 'error'); }
  finally { busy = false; renderPanel(); }
}
async function saveClass(form, item) {
  const payload = classPayload(form, item);
  if (!payload.weekdays.length) return setMessage('Hãy chọn ít nhất một ngày học trong tuần.', 'error');
  await runMutation(async () => {
    const saved = await upsertSupplementalClass(client, payload);
    selectedClassId = saved?.id || item?.id || '';
    creatingClass = false;
  }, item?.id ? 'Đã lưu thay đổi lớp.' : 'Đã tạo lớp học bổ sung.');
}
async function saveMember(form, classId, studentId = null) {
  const values = new FormData(form);
  await runMutation(() => upsertSupplementalClassMember(client, { groupId: classId, studentId, fullName: String(values.get('fullName') || '').trim(), studentCode: String(values.get('studentCode') || '').trim(), schoolClassName: String(values.get('schoolClassName') || '').trim(), effectiveFrom: today() }), studentId ? 'Đã cập nhật thông tin học sinh.' : 'Đã thêm học sinh vào lớp.');
}
async function changeMemberStatus(classId, studentId, active) {
  await runMutation(() => setSupplementalClassMemberStatus(client, { groupId: classId, studentId, active, effectiveDate: today() }), active ? 'Đã kích hoạt lại học sinh.' : 'Đã chuyển học sinh sang Ngừng học.');
}
async function archiveClass(classId) {
  const item = classes.find((row) => row.id === classId);
  if (!item || !window.confirm(`Xóa lớp “${item.className || item.groupName}” khỏi danh sách hoạt động? Lịch sử điểm danh sẽ được giữ nguyên.`)) return;
  await runMutation(async () => { await archiveSupplementalClass(client, classId, 'Lớp đã được lưu trữ'); selectedClassId = ''; }, 'Đã lưu trữ lớp và giữ nguyên toàn bộ lịch sử.', { keepSelection: false });
}
function openAttendance(item, sessionId) {
  if (!sessionId) return window.alert('Lớp chưa có buổi sắp tới để điểm danh.');
  closePanel();
  window.dispatchEvent(new CustomEvent('bes-supplemental-open-rollcall', { detail: { sessionId, classId: item.id } }));
}
function openHistory(item) {
  closePanel();
  [...document.querySelectorAll('.attendance-tabs button')].find((button) => /lịch sử|history/i.test(button.textContent || ''))?.click();
  window.dispatchEvent(new CustomEvent('bes-supplemental-open-history', { detail: { classId: item.id, className: item.className || item.groupName } }));
}
function bindTeacherRemove(form) {
  form?.querySelectorAll('[data-remove-teacher]').forEach((button) => {
    button.onclick = () => {
      const rows = form.querySelectorAll('[data-teacher-row]');
      if (rows.length <= 1) rows[0]?.querySelectorAll('input').forEach((input) => { input.value = ''; });
      else button.closest('[data-teacher-row]')?.remove();
    };
  });
}
function bindPanel(host, selected) {
  host.querySelector('[data-action="close"]')?.addEventListener('click', closePanel);
  host.querySelector('[data-class-search]')?.addEventListener('input', (event) => { classQuery = event.target.value || ''; renderPanel(); const next = document.querySelector('[data-class-search]'); next?.focus(); });
  host.querySelector('[data-action="create-class"]')?.addEventListener('click', () => { creatingClass = true; selectedClassId = ''; renderPanel(); });
  host.querySelectorAll('[data-action="back-to-classes"]').forEach((button) => button.addEventListener('click', () => { creatingClass = false; selectedClassId = ''; renderPanel(); }));
  host.querySelectorAll('[data-action="manage-class"]').forEach((button) => button.addEventListener('click', () => { selectedClassId = button.dataset.id || ''; creatingClass = false; renderPanel(); }));
  host.querySelectorAll('[data-action="archive-class"]').forEach((button) => button.addEventListener('click', () => void archiveClass(button.dataset.id)));
  host.querySelectorAll('[data-action="attendance"]').forEach((button) => button.addEventListener('click', () => { const item = classes.find((row) => row.id === button.dataset.id); if (item) openAttendance(item, button.dataset.session); }));
  host.querySelectorAll('[data-action="history"]').forEach((button) => button.addEventListener('click', () => { const item = classes.find((row) => row.id === button.dataset.id); if (item) openHistory(item); }));
  const classForm = host.querySelector('[data-form="class"]');
  classForm?.addEventListener('submit', (event) => { event.preventDefault(); void saveClass(classForm, selected || emptyClass()); });
  classForm?.querySelector('[data-add-teacher]')?.addEventListener('click', () => { const list = classForm.querySelector('[data-teacher-list]'); list?.insertAdjacentHTML('beforeend', teacherRow({}, list.querySelectorAll('[data-teacher-row]').length)); bindTeacherRemove(classForm); });
  bindTeacherRemove(classForm);
  if (selected?.id) {
    host.querySelector('[data-form="add-member"]')?.addEventListener('submit', (event) => { event.preventDefault(); void saveMember(event.currentTarget, selected.id); });
    host.querySelectorAll('[data-form="edit-member"]').forEach((form) => form.addEventListener('submit', (event) => { event.preventDefault(); void saveMember(form, selected.id, form.dataset.student); }));
    host.querySelectorAll('[data-action="member-status"]').forEach((button) => button.addEventListener('click', () => void changeMemberStatus(selected.id, button.dataset.student, button.dataset.active === 'true')));
  }
}
function startObserver() {
  if (observer) return;
  observer = new MutationObserver(ensureLauncher);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ensureLauncher();
}
async function install() {
  if (window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;
  try { await ensureRuntimeReady(); } catch { /* runtime can recover */ }
  runtime = getRuntimeState(); client = getRuntimeClient(); startObserver();
  subscribeRuntime((next) => { runtime = next || getRuntimeState(); client = getRuntimeClient(); ensureLauncher(); if (!canManage()) closePanel(); });
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') install();
