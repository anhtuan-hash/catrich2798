import './styles/SupplementalLearning.css';
import { ensureRuntimeReady, getRuntimeClient, getRuntimeState, subscribeRuntime } from './services/runtime/core.js';
import { normalizeSystemRole, SYSTEM_ROLES } from './utils/roles.js';
import {
  cancelSupplementalSession,
  linkSupplementalStudent,
  loadSupplementalAdminData,
  setSupplementalMembership,
  upsertSupplementalGroup,
  upsertSupplementalSession,
  upsertSupplementalStudent,
} from './attendance/supplementalLearningApi.js';

const INSTALL_KEY = '__besSupplementalLearningAdminInstalled';
const HOST_ID = 'bes-supplemental-learning-admin';

let runtime = null;
let client = null;
let data = { officialStudents: [], students: [], groups: [], memberships: [], sessions: [], participants: [] };
let loading = false;
let message = '';
let observer = null;
let adminQuery = '';

function isAdmin() {
  return normalizeSystemRole(runtime?.role || runtime?.profile?.role, SYSTEM_ROLES.GUEST) === SYSTEM_ROLES.ADMIN;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function fold(value) {
  return String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function snake(row = {}, key) {
  return row[key] ?? row[key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)];
}

function selectedValues(root, selector) {
  return [...root.querySelectorAll(selector)].filter((node) => node.checked).map((node) => node.value);
}

function studentLabel(student) {
  const name = snake(student, 'fullName') || '';
  const schoolClass = snake(student, 'schoolClassName') || '';
  const code = snake(student, 'studentCode') || '';
  return [name, schoolClass, code].filter(Boolean).join(' · ');
}

function studentSearchText(student) {
  return fold([
    snake(student, 'fullName'),
    snake(student, 'schoolClassName'),
    snake(student, 'studentCode'),
    snake(student, 'sourceType'),
    snake(student, 'linkedOfficialKey'),
  ].join(' '));
}

function officialSearchText(student) {
  return fold([student.fullName, student.schoolClassName, student.studentCode, student.officialKey].join(' '));
}

function refreshMessage(text, tone = 'ok') {
  message = text;
  const node = document.querySelector('.bes-supplemental-message');
  if (node) {
    node.replaceChildren(document.createTextNode(text));
    node.setAttribute('data-tone', tone);
  }
}

async function reload() {
  if (!client || !isAdmin() || loading) return;
  loading = true;
  try {
    data = { ...data, ...(await loadSupplementalAdminData(client)) };
    renderPanel();
  } catch (error) {
    refreshMessage(error?.message || 'Không thể tải dữ liệu Học bổ sung.', 'error');
  } finally {
    loading = false;
  }
}

function ensureLauncher() {
  const tabs = document.querySelector('.attendance-tabs');
  if (!tabs || !isAdmin()) {
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
  if (report) report.insertAdjacentElement('beforebegin', button);
  else tabs.append(button);
}

function openPanel() {
  if (!isAdmin()) return;
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    document.body.append(host);
  }
  renderPanel();
  void reload();
}

function closePanel() {
  document.getElementById(HOST_ID)?.remove();
}

function officialOptions(selected = '') {
  return (data.officialStudents || []).map((student) => `
    <option value="${esc(student.officialKey)}" data-code="${esc(student.studentCode)}" data-name="${esc(student.fullName)}" data-class="${esc(student.schoolClassName)}" ${student.officialKey === selected ? 'selected' : ''}>
      ${esc(studentLabel(student))}
    </option>`).join('');
}

function pickerItems(name, existingSelected = []) {
  const selected = new Set((existingSelected || []).map(String));
  const supplemental = (data.students || []).filter((student) => student.active !== false).map((student) => `
    <label class="bes-supplemental-check" data-picker-item data-search-text="${esc(studentSearchText(student))}">
      <input type="checkbox" name="${esc(name)}" value="${esc(student.id)}" ${selected.has(String(student.id)) ? 'checked' : ''}>
      <span>${esc(studentLabel(student))}</span>
      <small>${snake(student, 'sourceType') === 'official' ? 'Chính thức' : 'Hồ sơ Học bổ sung'}</small>
    </label>`).join('');
  const official = (data.officialStudents || []).map((student) => `
    <label class="bes-supplemental-check" data-picker-item data-search-text="${esc(officialSearchText(student))}">
      <input type="checkbox" name="officialParticipantKey" value="${esc(student.officialKey)}" data-code="${esc(student.studentCode)}" data-name="${esc(student.fullName)}" data-class="${esc(student.schoolClassName)}">
      <span>${esc(studentLabel(student))}</span>
      <small>Học sinh chính thức</small>
    </label>`).join('');
  return `<div class="bes-supplemental-picker">
    <label class="bes-supplemental-picker-search">Tìm học sinh<input type="search" data-student-search placeholder="Tên, lớp hoặc mã học sinh"></label>
    <div class="bes-supplemental-checklist">${supplemental}${official || (!supplemental ? '<p>Chưa có dữ liệu học sinh.</p>' : '')}</div>
  </div>`;
}

function studentCards() {
  const rows = (data.students || []).map((student) => {
    const source = snake(student, 'sourceType');
    const linked = snake(student, 'linkedOfficialKey');
    const active = student.active !== false;
    return `<article class="bes-supplemental-row" data-admin-search-item data-search-text="${esc(studentSearchText(student))}">
      <div>
        <strong>${esc(snake(student, 'fullName'))}</strong>
        <small>${esc(snake(student, 'studentCode') || 'Không mã')} · ${esc(snake(student, 'schoolClassName') || 'Chưa lớp')}</small>
      </div>
      <span class="bes-supplemental-chip">${source === 'official' ? 'Chính thức' : linked ? 'Thủ công · đã liên kết' : 'Thủ công'} · ${active ? 'Đang dùng' : 'Đã dừng'}</span>
      ${source === 'manual' && !linked ? `<span class="bes-supplemental-inline-link"><select data-link-official aria-label="Chọn học sinh chính thức để liên kết"><option value="">Chọn học sinh chính thức…</option>${officialOptions()}</select><button type="button" data-action="link" data-id="${esc(student.id)}">Liên kết với học sinh chính thức</button></span>` : ''}
      <button type="button" data-action="toggle-student" data-id="${esc(student.id)}" data-active="${active ? 'true' : 'false'}">${active ? 'Ngừng sử dụng' : 'Kích hoạt lại'}</button>
    </article>`;
  }).join('') || '<p class="bes-supplemental-empty">Chưa có hồ sơ học sinh Học bổ sung.</p>';

  return `<section class="bes-supplemental-section" data-section="students">
    <header><div><h3>Học sinh</h3><p>Hồ sơ dùng lại cho mọi nhóm và buổi phát sinh.</p></div></header>
    <div class="bes-supplemental-two-col">
      <form class="bes-supplemental-card" data-form="official-student">
        <h4>Thêm từ học sinh chính thức</h4>
        <label>Học sinh<select name="officialKey" required><option value="">Chọn học sinh</option>${officialOptions()}</select></label>
        <button class="is-primary" type="submit">Thêm học sinh chính thức</button>
      </form>
      <form class="bes-supplemental-card" data-form="manual-student">
        <h4>Thêm học sinh thủ công</h4>
        <label>Họ và tên<input name="fullName" required></label>
        <label>Mã học sinh<input name="studentCode"></label>
        <label>Lớp hiện tại<input name="schoolClassName" placeholder="VD: 12.6"></label>
        <button class="is-primary" type="submit">Thêm học sinh thủ công</button>
      </form>
    </div>
    <div class="bes-supplemental-list">${rows}</div>
  </section>`;
}

function weekdayChecks(selected = [2]) {
  const current = new Set((selected || []).map(Number));
  return [1, 2, 3, 4, 5, 6, 7].map((day) => `
    <label><input type="checkbox" name="weekday" value="${day}" ${current.has(day) ? 'checked' : ''}>${day === 7 ? 'CN' : `Thứ ${day + 1}`}</label>`).join('');
}

function groupEditForm(group) {
  const weekdays = group.weekdays || [];
  return `<details class="bes-supplemental-edit"><summary>Sửa nhóm</summary>
    <form class="bes-supplemental-edit-form" data-form="edit-group" data-group="${esc(group.id)}">
      <div class="bes-supplemental-form-grid">
        <label>Tên nhóm<input name="groupName" value="${esc(snake(group, 'groupName'))}" required></label>
        <label>Môn học<input name="subject" value="${esc(group.subject)}" required></label>
        <label>Khối<input name="gradeLevel" value="${esc(snake(group, 'gradeLevel') || '')}"></label>
        <label>Giáo viên<input name="teacherName" value="${esc(snake(group, 'teacherName') || '')}"></label>
        <label>Email giáo viên<input name="teacherEmail" type="email" value="${esc(snake(group, 'teacherEmail') || '')}"></label>
        <label>Phòng<input name="room" value="${esc(group.room || '')}"></label>
        <label>Từ ngày<input name="startDate" type="date" value="${esc(snake(group, 'startDate'))}" required></label>
        <label>Đến ngày<input name="endDate" type="date" value="${esc(snake(group, 'endDate'))}" required></label>
        <label>Giờ bắt đầu<input name="startTime" type="time" value="${esc(String(snake(group, 'startTime') || '').slice(0, 5))}" required></label>
        <label>Giờ kết thúc<input name="endTime" type="time" value="${esc(String(snake(group, 'endTime') || '').slice(0, 5))}" required></label>
      </div>
      <fieldset><legend>Thứ học trong tuần</legend>${weekdayChecks(weekdays)}</fieldset>
      <div class="bes-supplemental-edit-actions"><button class="is-primary" type="submit">Lưu thay đổi nhóm</button></div>
    </form>
  </details>`;
}

function groupCards() {
  const activeStudents = (data.students || []).filter((student) => student.active !== false);
  const byGroup = new Map();
  (data.memberships || []).forEach((membership) => {
    const key = snake(membership, 'groupId');
    const list = byGroup.get(key) || [];
    list.push(membership);
    byGroup.set(key, list);
  });
  const sessionsByGroup = new Map();
  (data.sessions || []).forEach((session) => {
    const key = snake(session, 'groupId');
    if (!key) return;
    const list = sessionsByGroup.get(key) || [];
    list.push(session);
    sessionsByGroup.set(key, list);
  });

  const groups = (data.groups || []).map((group) => {
    const members = byGroup.get(group.id) || [];
    const groupSessions = (sessionsByGroup.get(group.id) || []).slice(0, 8);
    const memberRows = members.map((membership) => {
      const student = (data.students || []).find((item) => item.id === snake(membership, 'studentId'));
      const until = snake(membership, 'effectiveUntil');
      return `<li>
        <span>${esc(student ? studentLabel(student) : 'Học sinh')}</span>
        <small>${esc(snake(membership, 'effectiveFrom'))}${until ? ` → ${esc(until)}` : ' → đang học'}</small>
        ${until ? '' : `<button type="button" data-action="stop-membership" data-id="${esc(membership.id)}" data-group="${esc(group.id)}" data-student="${esc(snake(membership, 'studentId'))}" data-from="${esc(snake(membership, 'effectiveFrom'))}">Ngừng tham gia</button>`}
      </li>`;
    }).join('') || '<li class="is-empty">Chưa có học sinh</li>';
    const studentOptions = activeStudents.map((student) => `<option value="${esc(student.id)}">${esc(studentLabel(student))}</option>`).join('');
    const sessionRows = groupSessions.map((session) => `<li><span>${esc(snake(session, 'attendanceDate'))} · ${esc(session.title || session.subject)}</span><small>${esc(session.status)} · ${esc(String(snake(session, 'startTime') || '').slice(0, 5))}–${esc(String(snake(session, 'endTime') || '').slice(0, 5))}</small></li>`).join('') || '<li class="is-empty">Chưa có buổi trong lịch</li>';
    const searchText = fold([snake(group, 'groupName'), group.subject, group.room, snake(group, 'teacherName'), snake(group, 'startDate'), snake(group, 'endDate'), group.active === false ? 'đã dừng' : 'đang hoạt động', ...members.map((m) => studentLabel((data.students || []).find((s) => s.id === snake(m, 'studentId')) || {}))].join(' '));

    return `<article class="bes-supplemental-group" data-admin-search-item data-search-text="${esc(searchText)}">
      <header>
        <div><strong>${esc(snake(group, 'groupName'))}</strong><small>${esc(group.subject)} · ${esc(group.room || 'Chưa phòng')} · ${esc(String(snake(group, 'startTime') || '').slice(0, 5))}–${esc(String(snake(group, 'endTime') || '').slice(0, 5))}</small></div>
        <span>${group.active === false ? 'Đã dừng' : 'Đang hoạt động'}</span>
      </header>
      <div class="bes-supplemental-group-actions">
        <button type="button" data-action="toggle-group" data-id="${esc(group.id)}" data-active="${group.active === false ? 'false' : 'true'}">${group.active === false ? 'Kích hoạt nhóm' : 'Dừng nhóm'}</button>
      </div>
      ${groupEditForm(group)}
      <details><summary>Thành viên (${members.length})</summary><ul>${memberRows}</ul>
        <form data-form="add-membership" data-group="${esc(group.id)}">
          <select name="studentId"><option value="">Hồ sơ Học bổ sung…</option>${studentOptions}</select>
          <select name="officialParticipantKey"><option value="">Hoặc học sinh chính thức…</option>${officialOptions()}</select>
          <input type="date" name="effectiveFrom" value="${today()}" required>
          <button type="submit">Thêm vào nhóm</button>
        </form>
      </details>
      <details><summary>Các buổi gần đây / sắp tới</summary><ul>${sessionRows}</ul></details>
    </article>`;
  }).join('') || '<p class="bes-supplemental-empty">Chưa có nhóm dài ngày.</p>';

  return `<section class="bes-supplemental-section" data-section="groups">
    <header><div><h3>Nhóm dài ngày</h3><p>Lịch được sinh tự động theo thứ và khoảng ngày; thay đổi chỉ áp dụng cho các buổi chưa khóa danh sách.</p></div></header>
    <form class="bes-supplemental-card bes-supplemental-group-form" data-form="group">
      <h4>Tạo nhóm học bổ sung</h4>
      <div class="bes-supplemental-form-grid">
        <label>Tên nhóm<input name="groupName" required></label>
        <label>Môn học<input name="subject" required></label>
        <label>Khối<input name="gradeLevel" placeholder="10 / 11 / 12"></label>
        <label>Giáo viên<input name="teacherName"></label>
        <label>Email giáo viên<input name="teacherEmail" type="email"></label>
        <label>Phòng<input name="room"></label>
        <label>Từ ngày<input name="startDate" type="date" value="${today()}" required></label>
        <label>Đến ngày<input name="endDate" type="date" value="${today()}" required></label>
        <label>Giờ bắt đầu<input name="startTime" type="time" value="16:45" required></label>
        <label>Giờ kết thúc<input name="endTime" type="time" value="18:00" required></label>
      </div>
      <fieldset><legend>Thứ học trong tuần</legend>${weekdayChecks([1])}</fieldset>
      <h5>Danh sách ban đầu</h5>
      ${pickerItems('initialStudentId')}
      <button class="is-primary" type="submit">Tạo nhóm học bổ sung</button>
    </form>
    <div class="bes-supplemental-list">${groups}</div>
  </section>`;
}

function sessionEditForm(session) {
  if ((session.kind || '') !== 'adhoc' || session.status !== 'scheduled' || snake(session, 'rosterFrozenAt')) return '';
  const existing = (data.participants || []).filter((participant) => snake(participant, 'sessionId') === session.id).map((participant) => snake(participant, 'studentId'));
  return `<details class="bes-supplemental-edit"><summary>Sửa buổi</summary>
    <form class="bes-supplemental-edit-form" data-form="edit-session" data-session="${esc(session.id)}">
      <div class="bes-supplemental-form-grid">
        <label>Tiêu đề<input name="title" value="${esc(session.title || '')}"></label>
        <label>Môn học<input name="subject" value="${esc(session.subject)}" required></label>
        <label>Ngày<input name="attendanceDate" type="date" value="${esc(snake(session, 'attendanceDate'))}" required></label>
        <label>Giáo viên<input name="teacherName" value="${esc(snake(session, 'teacherName') || '')}"></label>
        <label>Email giáo viên<input name="teacherEmail" type="email" value="${esc(snake(session, 'teacherEmail') || '')}"></label>
        <label>Phòng<input name="room" value="${esc(session.room || '')}"></label>
        <label>Giờ bắt đầu<input name="startTime" type="time" value="${esc(String(snake(session, 'startTime') || '').slice(0, 5))}" required></label>
        <label>Giờ kết thúc<input name="endTime" type="time" value="${esc(String(snake(session, 'endTime') || '').slice(0, 5))}" required></label>
      </div>
      <label class="bes-supplemental-note-field">Ghi chú buổi học<textarea name="sessionNote" rows="2">${esc(snake(session, 'sessionNote') || '')}</textarea></label>
      ${pickerItems('participantId', existing)}
      <div class="bes-supplemental-edit-actions"><button class="is-primary" type="submit">Lưu thay đổi buổi</button></div>
    </form>
  </details>`;
}

function sessionCards() {
  const sessions = (data.sessions || []).map((session) => {
    const searchText = fold([session.title, session.subject, snake(session, 'attendanceDate'), snake(session, 'teacherName'), session.room, session.status, session.kind, snake(session, 'sessionNote')].join(' '));
    return `<article class="bes-supplemental-row bes-supplemental-session-row" data-admin-search-item data-search-text="${esc(searchText)}">
      <div><strong>${esc(session.title || session.subject)}</strong><small>${esc(snake(session, 'attendanceDate'))} · ${esc(session.subject)} · ${esc(snake(session, 'teacherName') || 'Chưa giáo viên')} · ${esc(session.room || 'Chưa phòng')}</small></div>
      <span class="bes-supplemental-chip">${session.kind === 'recurring' ? 'Nhóm dài ngày' : 'Phát sinh'} · ${esc(session.status)}</span>
      ${sessionEditForm(session)}
      ${session.status === 'scheduled' || session.status === 'in_progress' ? `<button type="button" data-action="cancel-session" data-id="${esc(session.id)}">Hủy buổi</button>` : ''}
    </article>`;
  }).join('') || '<p class="bes-supplemental-empty">Chưa có buổi Học bổ sung.</p>';

  return `<section class="bes-supplemental-section" data-section="sessions">
    <header><div><h3>Buổi phát sinh</h3><p>Tạo buổi độc lập hoặc quản lý các buổi được sinh từ nhóm dài ngày.</p></div></header>
    <form class="bes-supplemental-card" data-form="adhoc">
      <h4>Tạo buổi phát sinh</h4>
      <div class="bes-supplemental-form-grid">
        <label>Tiêu đề<input name="title" placeholder="VD: Bổ sung kiến thức Toán 12"></label>
        <label>Môn học<input name="subject" required></label>
        <label>Ngày<input name="attendanceDate" type="date" value="${today()}" required></label>
        <label>Giáo viên<input name="teacherName"></label>
        <label>Email giáo viên<input name="teacherEmail" type="email"></label>
        <label>Phòng<input name="room"></label>
        <label>Giờ bắt đầu<input name="startTime" type="time" value="16:45" required></label>
        <label>Giờ kết thúc<input name="endTime" type="time" value="18:00" required></label>
      </div>
      <label class="bes-supplemental-note-field">Ghi chú buổi học<textarea name="sessionNote" rows="2" placeholder="Nội dung cần lưu cùng buổi học"></textarea></label>
      ${pickerItems('participantId')}
      <button class="is-primary" type="submit">Tạo buổi phát sinh</button>
    </form>
    <div class="bes-supplemental-list">${sessions}</div>
  </section>`;
}

function applyAdminSearch(host = document.getElementById(HOST_ID)) {
  if (!host) return;
  const wanted = fold(adminQuery);
  host.querySelectorAll('[data-admin-search-item]').forEach((node) => {
    node.hidden = Boolean(wanted && !fold(node.dataset.searchText).includes(wanted));
  });
}

function filterPicker(input) {
  const picker = input.closest('.bes-supplemental-picker');
  const wanted = fold(input.value);
  picker?.querySelectorAll('[data-picker-item]').forEach((node) => {
    node.hidden = Boolean(wanted && !fold(node.dataset.searchText).includes(wanted));
  });
}

function renderPanel() {
  const host = document.getElementById(HOST_ID);
  if (!host || !isAdmin()) return;
  host.innerHTML = `<div class="bes-supplemental-backdrop" data-action="close"></div>
    <section class="bes-supplemental-dialog" role="dialog" aria-modal="true" aria-label="Quản lý Học bổ sung">
      <header class="bes-supplemental-dialog-head">
        <div><span class="bes-supplemental-kicker">ĐIỂM DANH · ADMIN</span><h2>Học bổ sung</h2><p>Quản lý học sinh, nhóm dài ngày và buổi phát sinh mà không thay đổi dữ liệu Phụ đạo/Bồi dưỡng hiện có.</p></div>
        <button type="button" data-action="close" aria-label="Đóng">×</button>
      </header>
      <nav class="bes-supplemental-local-tabs"><button type="button" data-scroll="students">Học sinh</button><button type="button" data-scroll="groups">Nhóm dài ngày</button><button type="button" data-scroll="sessions">Buổi phát sinh</button></nav>
      <div class="bes-supplemental-admin-search"><label>Tìm nhóm, học sinh, môn, giáo viên, ngày, trạng thái<input type="search" data-admin-search value="${esc(adminQuery)}" placeholder="Tìm nhóm, học sinh, môn, giáo viên, ngày, trạng thái"></label><small>Lọc ngay trên hồ sơ, nhóm và danh sách buổi đang hiển thị.</small></div>
      <div class="bes-supplemental-message" data-tone="ok">${esc(message || 'Mọi thay đổi quản trị đều được kiểm tra quyền Admin ở máy chủ.')}</div>
      <main>${studentCards()}${groupCards()}${sessionCards()}</main>
    </section>`;
  bindPanel(host);
  applyAdminSearch(host);
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function runAction(work, success) {
  if (loading) return;
  loading = true;
  try {
    await work();
    message = success;
    loading = false;
    await reload();
  } catch (error) {
    loading = false;
    refreshMessage(error?.message || 'Không thể lưu thay đổi.', 'error');
  }
}

function officialInputToRecord(input) {
  return {
    sourceType: 'official',
    officialKey: input.value,
    studentCode: input.dataset.code || '',
    fullName: input.dataset.name || '',
    schoolClassName: input.dataset.class || '',
    active: true,
  };
}

async function materializeOfficialSelections(form) {
  const inputs = [...form.querySelectorAll('input[name="officialParticipantKey"]:checked')];
  const select = form.querySelector('select[name="officialParticipantKey"]');
  if (select?.value) {
    const option = select.selectedOptions?.[0];
    inputs.push({
      value: select.value,
      dataset: { code: option?.dataset?.code || '', name: option?.dataset?.name || '', class: option?.dataset?.class || '' },
    });
  }
  const unique = new Map(inputs.filter((input) => input.value).map((input) => [input.value, input]));
  const rows = [];
  for (const input of unique.values()) rows.push(await upsertSupplementalStudent(client, officialInputToRecord(input)));
  return rows.map((row) => row?.id).filter(Boolean);
}

async function participantIdsFromForm(form, fieldName) {
  const existing = selectedValues(form, `input[name="${fieldName}"]:checked`);
  const official = await materializeOfficialSelections(form);
  return [...new Set([...existing, ...official].map(String))];
}

function groupPayload(group, overrides = {}) {
  return {
    id: group.id,
    groupName: snake(group, 'groupName'),
    subject: group.subject,
    gradeLevel: snake(group, 'gradeLevel') || '',
    teacherId: snake(group, 'teacherId') || null,
    teacherName: snake(group, 'teacherName') || '',
    teacherEmail: snake(group, 'teacherEmail') || '',
    room: group.room || '',
    startDate: snake(group, 'startDate'),
    endDate: snake(group, 'endDate'),
    weekdays: group.weekdays || [],
    startTime: String(snake(group, 'startTime') || '').slice(0, 5),
    endTime: String(snake(group, 'endTime') || '').slice(0, 5),
    active: group.active !== false,
    ...overrides,
  };
}

function studentPayload(student, active) {
  return {
    id: student.id,
    sourceType: snake(student, 'sourceType') || 'manual',
    officialKey: snake(student, 'officialKey') || null,
    studentCode: snake(student, 'studentCode') || '',
    fullName: snake(student, 'fullName') || '',
    schoolClassName: snake(student, 'schoolClassName') || '',
    active,
  };
}

function bindPanel(host) {
  host.querySelectorAll('[data-action="close"]').forEach((node) => node.addEventListener('click', closePanel));
  host.querySelectorAll('[data-scroll]').forEach((node) => node.addEventListener('click', () => host.querySelector(`[data-section="${node.dataset.scroll}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
  host.querySelector('[data-admin-search]')?.addEventListener('input', (event) => { adminQuery = event.target.value; applyAdminSearch(host); });
  host.querySelectorAll('[data-student-search]').forEach((input) => input.addEventListener('input', () => filterPicker(input)));

  host.querySelector('[data-form="official-student"]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const option = form.officialKey.selectedOptions[0];
    if (!option?.value) return;
    void runAction(() => upsertSupplementalStudent(client, {
      sourceType: 'official', officialKey: option.value, studentCode: option.dataset.code, fullName: option.dataset.name, schoolClassName: option.dataset.class,
    }), 'Đã thêm hoặc cập nhật học sinh chính thức.');
  });

  host.querySelector('[data-form="manual-student"]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = formObject(event.currentTarget);
    void runAction(() => upsertSupplementalStudent(client, { sourceType: 'manual', ...values }), 'Đã lưu học sinh thủ công.');
  });

  host.querySelector('[data-form="group"]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = formObject(form);
    const weekdays = selectedValues(form, 'input[name="weekday"]:checked').map(Number);
    void runAction(async () => {
      const participantIds = await participantIdsFromForm(form, 'initialStudentId');
      const group = await upsertSupplementalGroup(client, { ...values, weekdays });
      for (const studentId of participantIds) {
        await setSupplementalMembership(client, { groupId: group.id, studentId, effectiveFrom: values.startDate });
      }
    }, 'Đã tạo nhóm học bổ sung, sinh lịch và lưu danh sách ban đầu.');
  });

  host.querySelectorAll('[data-form="edit-group"]').forEach((form) => form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = formObject(form);
    const weekdays = selectedValues(form, 'input[name="weekday"]:checked').map(Number);
    const group = (data.groups || []).find((item) => item.id === form.dataset.group);
    if (!group) return;
    void runAction(() => upsertSupplementalGroup(client, { ...groupPayload(group), ...values, weekdays, id: group.id }), 'Đã cập nhật nhóm; các buổi chưa khóa đã được đồng bộ.');
  }));

  host.querySelectorAll('[data-action="toggle-group"]').forEach((button) => button.addEventListener('click', () => {
    const group = (data.groups || []).find((item) => item.id === button.dataset.id);
    if (!group) return;
    const active = button.dataset.active !== 'true';
    void runAction(() => upsertSupplementalGroup(client, groupPayload(group, { active })), active ? 'Đã kích hoạt lại nhóm.' : 'Đã dừng nhóm; lịch chưa khóa không còn mở để điểm danh.');
  }));

  host.querySelector('[data-form="adhoc"]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = formObject(form);
    void runAction(async () => {
      const participantIds = await participantIdsFromForm(form, 'participantId');
      await upsertSupplementalSession(client, { ...values, kind: 'adhoc', participantIds });
    }, 'Đã tạo buổi phát sinh.');
  });

  host.querySelectorAll('[data-form="edit-session"]').forEach((form) => form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = formObject(form);
    void runAction(async () => {
      const participantIds = await participantIdsFromForm(form, 'participantId');
      await upsertSupplementalSession(client, { ...values, id: form.dataset.session, kind: 'adhoc', participantIds });
    }, 'Đã cập nhật buổi phát sinh chưa khóa.');
  }));

  host.querySelectorAll('[data-form="add-membership"]').forEach((form) => form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = formObject(form);
    void runAction(async () => {
      let studentId = values.studentId || '';
      if (!studentId && values.officialParticipantKey) {
        const option = form.querySelector('select[name="officialParticipantKey"]')?.selectedOptions?.[0];
        const row = await upsertSupplementalStudent(client, {
          sourceType: 'official', officialKey: values.officialParticipantKey, studentCode: option?.dataset?.code || '', fullName: option?.dataset?.name || '', schoolClassName: option?.dataset?.class || '',
        });
        studentId = row?.id || '';
      }
      if (!studentId) throw new Error('Hãy chọn học sinh cần thêm vào nhóm.');
      await setSupplementalMembership(client, { groupId: form.dataset.group, studentId, effectiveFrom: values.effectiveFrom });
    }, 'Đã thêm học sinh vào nhóm.');
  }));

  host.querySelectorAll('[data-action="stop-membership"]').forEach((button) => button.addEventListener('click', () => {
    const end = window.prompt('Ngừng tham gia từ ngày nào?', today());
    if (!end) return;
    void runAction(() => setSupplementalMembership(client, {
      id: button.dataset.id,
      groupId: button.dataset.group,
      studentId: button.dataset.student,
      effectiveFrom: button.dataset.from,
      effectiveUntil: end,
      removalReason: 'Admin kết thúc tham gia nhóm',
    }), 'Đã ghi nhận ngày ngừng tham gia.');
  }));

  host.querySelectorAll('[data-action="cancel-session"]').forEach((button) => button.addEventListener('click', () => {
    const reason = window.prompt('Lý do hủy buổi Học bổ sung?', 'Không tổ chức buổi học');
    if (reason === null) return;
    void runAction(() => cancelSupplementalSession(client, button.dataset.id, reason), 'Đã hủy buổi Học bổ sung; buổi hủy không tính vắng.');
  }));

  host.querySelectorAll('[data-action="link"]').forEach((button) => button.addEventListener('click', () => {
    const select = button.closest('.bes-supplemental-row')?.querySelector('[data-link-official]');
    const officialKey = select?.value || '';
    if (!officialKey) {
      refreshMessage('Hãy chọn đúng học sinh chính thức trước khi liên kết.', 'error');
      return;
    }
    void runAction(() => linkSupplementalStudent(client, button.dataset.id, officialKey), 'Đã liên kết hồ sơ; lịch sử cũ vẫn giữ nguyên ảnh chụp tên/lớp.');
  }));

  host.querySelectorAll('[data-action="toggle-student"]').forEach((button) => button.addEventListener('click', () => {
    const student = (data.students || []).find((item) => item.id === button.dataset.id);
    if (!student) return;
    const active = button.dataset.active !== 'true';
    void runAction(() => upsertSupplementalStudent(client, studentPayload(student, active)), active ? 'Đã kích hoạt lại hồ sơ học sinh.' : 'Đã ngừng sử dụng hồ sơ; lịch sử cũ được giữ nguyên.');
  }));
}

function installObserver() {
  if (observer) return;
  observer = new MutationObserver(ensureLauncher);
  observer.observe(document.body, { childList: true, subtree: true });
  ensureLauncher();
}

async function install() {
  if (window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;
  try { await ensureRuntimeReady(); } catch { /* runtime can recover */ }
  runtime = getRuntimeState();
  client = getRuntimeClient();
  installObserver();
  subscribeRuntime((next) => {
    runtime = next || getRuntimeState();
    client = getRuntimeClient();
    ensureLauncher();
    if (!isAdmin()) closePanel();
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') void install();
