import { getCurrentUser } from './utils/auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  loadHomeroomWorkspace,
  saveHomeroomWorkspace,
} from './utils/homeroomClassWorkspaceStore.js';
import { createManualBackup, prepareWorkspaceCommit } from './utils/homeroomPhase3.js';
import './components/homeroom/StudentBulkDelete.css';

const TOOLBAR_CLASS = 'hr-student-bulk-toolbar';
const CHECKBOX_CLASS = 'bes-student-row-checkbox';
const selectedIds = new Set();
let lastFilter = '';
let lastWorkspaceId = '';
let scheduled = false;
let busy = false;

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function fold(value) {
  return safeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeCode(value) {
  return fold(value).replace(/\s+/g, '').replace(/^cp0*(\d+)$/, 'cp$1');
}

function isDeleted(student) {
  return student?.lifecycleStatus === 'deleted' || Boolean(student?.deletedAt);
}

function rosterPanel() {
  return [...document.querySelectorAll('.hr-panel')].find((panel) => (
    safeText(panel.querySelector(':scope > .hr-panel-head h2')?.textContent) === 'Danh sách lớp'
  )) || null;
}

function currentFilter(panel) {
  return panel?.querySelector('.hr-filter-row select')?.value || 'active';
}

async function loadCurrentWorkspace() {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error('Chưa xác định được tài khoản giáo viên đang đăng nhập.');
  const workspaceId = getCurrentHomeroomWorkspaceId(user);
  if (!workspaceId) throw new Error('Chưa xác định được lớp đang mở.');
  const result = await loadHomeroomWorkspace(user, workspaceId);
  if (!result.workspace) throw new Error('Không tải được dữ liệu lớp đang mở.');
  return { user, workspace: result.workspace };
}

function studentForRow(row, workspace) {
  const person = row.querySelector('.hr-person-cell');
  if (!person) return null;
  const name = fold(person.querySelector('b')?.textContent);
  const detail = safeText(person.querySelector('small')?.textContent);
  const code = normalizeCode(detail.split('·')[0]);
  const students = Array.isArray(workspace?.students) ? workspace.students : [];
  return students.find((student) => code && normalizeCode(student.code) === code)
    || students.find((student) => name && fold(student.fullName) === name)
    || null;
}

function isScore(value) {
  return value !== '' && value != null && Number.isFinite(Number(String(value).replace(',', '.')));
}

function countGradebookScores(workspace, studentId) {
  let count = 0;
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    Object.entries(value).forEach(([key, item]) => {
      if (key === studentId) {
        if (item && typeof item === 'object') {
          Object.values(item).forEach((cell) => { if (isScore(cell)) count += 1; });
        } else if (isScore(item)) count += 1;
        return;
      }
      visit(item);
    });
  };
  visit(workspace.learningGradebook);
  return count;
}

function linkedData(workspace, studentId) {
  return {
    gradebookScores: countGradebookScores(workspace, studentId),
    learningRecords: (workspace.learningRecords || []).filter((item) => item.studentId === studentId).length,
    conductRecords: (workspace.conductRecords || []).filter((item) => item.studentId === studentId).length,
    attendanceSessions: Object.values(workspace.attendance || {}).filter((rows) => Boolean(rows?.[studentId])).length,
  };
}

function refreshToolbar(panel, workspace) {
  const toolbar = panel.querySelector(`.${TOOLBAR_CLASS}`);
  if (!toolbar) return;
  const rows = [...panel.querySelectorAll('.hr-table tbody tr')];
  const visibleIds = rows.map((row) => row.dataset.studentId).filter(Boolean);
  const selectableIds = visibleIds.filter((id) => {
    const student = (workspace.students || []).find((item) => item.id === id);
    return student && !isDeleted(student);
  });
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const selectedCount = [...selectedIds].filter((id) => (
    (workspace.students || []).some((student) => student.id === id && !isDeleted(student))
  )).length;

  const selectAll = toolbar.querySelector('[data-select-all]');
  const count = toolbar.querySelector('[data-selected-count]');
  const clear = toolbar.querySelector('[data-clear-selection]');
  const remove = toolbar.querySelector('[data-bulk-delete]');
  if (selectAll) {
    selectAll.checked = allSelected;
    selectAll.disabled = !selectableIds.length || busy;
  }
  if (count) count.textContent = String(selectedCount);
  if (clear) clear.disabled = !selectedCount || busy;
  if (remove) {
    remove.disabled = !selectedCount || busy;
    remove.textContent = busy ? 'Đang xóa…' : `Xóa nhanh${selectedCount ? ` (${selectedCount})` : ''}`;
  }

  rows.forEach((row) => {
    const id = row.dataset.studentId;
    const checkbox = row.querySelector(`.${CHECKBOX_CLASS}`);
    if (checkbox) checkbox.checked = selectedIds.has(id);
    row.classList.toggle('is-selected-student', selectedIds.has(id));
  });
}

function clearSelection(panel, workspace) {
  selectedIds.clear();
  refreshToolbar(panel, workspace);
}

async function deleteSelected(panel) {
  if (busy || !selectedIds.size) return;
  busy = true;
  try {
    const { user, workspace } = await loadCurrentWorkspace();
    const students = (workspace.students || []).filter((student) => selectedIds.has(student.id) && !isDeleted(student));
    if (!students.length) {
      clearSelection(panel, workspace);
      return;
    }

    const totals = students.reduce((acc, student) => {
      const linked = linkedData(workspace, student.id);
      acc.gradebookScores += linked.gradebookScores;
      acc.conductRecords += linked.conductRecords;
      acc.attendanceSessions += linked.attendanceSessions;
      return acc;
    }, { gradebookScores: 0, conductRecords: 0, attendanceSessions: 0 });
    const preview = students.slice(0, 6).map((student) => student.fullName).join(', ');
    const remaining = Math.max(0, students.length - 6);
    const confirmed = window.confirm(
      `Xóa nhanh ${students.length} học sinh khỏi danh sách lớp?\n\n`
      + preview + (remaining ? ` và ${remaining} học sinh khác` : '') + '.\n\n'
      + `Hệ thống vẫn giữ ${totals.gradebookScores} ô điểm, ${totals.conductRecords} ghi nhận rèn luyện và ${totals.attendanceSessions} phiên điểm danh để có thể khôi phục.`,
    );
    if (!confirmed) return;

    const now = new Date().toISOString();
    const ids = new Set(students.map((student) => student.id));
    const backedUp = createManualBackup(workspace, user, `Trước khi xóa nhanh ${students.length} học sinh`);
    const next = {
      ...backedUp,
      students: (backedUp.students || []).map((student) => ids.has(student.id) ? {
        ...student,
        active: false,
        lifecycleStatus: 'deleted',
        deletedAt: now,
        deletedReason: 'Xóa nhanh khỏi danh sách lớp',
        updatedAt: now,
      } : student),
      studentDeletionAudit: [
        ...(backedUp.studentDeletionAudit || []),
        ...students.map((student, index) => ({
          id: `student-bulk-delete-${Date.now()}-${index}`,
          studentId: student.id,
          studentCode: student.code || '',
          studentName: student.fullName,
          deletedAt: now,
          linkedData: linkedData(workspace, student.id),
          mode: 'bulk',
        })),
      ],
    };
    const committed = prepareWorkspaceCommit(
      backedUp,
      next,
      user,
      `Xóa nhanh ${students.length} học sinh khỏi danh sách lớp`,
    );
    const result = await saveHomeroomWorkspace(committed, user);
    if (result?.ok === false) throw new Error(result.message || 'Không thể lưu thay đổi.');

    selectedIds.clear();
    window.alert(`Đã chuyển ${students.length} học sinh vào mục Đã xóa. Điểm, rèn luyện và điểm danh vẫn được giữ nguyên.`);
    window.location.reload();
  } catch (error) {
    console.error('[StudentBulkDelete] Không thể xóa nhanh học sinh.', error);
    window.alert(error?.message || 'Không thể xóa nhanh học sinh.');
  } finally {
    busy = false;
    try {
      const { workspace } = await loadCurrentWorkspace();
      refreshToolbar(panel, workspace);
    } catch { /* page may be reloading */ }
  }
}

function createToolbar(panel, workspace) {
  let toolbar = panel.querySelector(`.${TOOLBAR_CLASS}`);
  if (toolbar) return toolbar;

  toolbar = document.createElement('div');
  toolbar.className = TOOLBAR_CLASS;
  toolbar.innerHTML = `
    <label class="hr-student-select-all"><input type="checkbox" data-select-all><span>Chọn tất cả đang hiển thị</span></label>
    <span class="hr-student-selected-count">Đã chọn <b data-selected-count>0</b> học sinh</span>
    <div class="hr-student-bulk-buttons"><button type="button" class="secondary" data-clear-selection>Bỏ chọn</button><button type="button" class="danger" data-bulk-delete>Xóa nhanh</button></div>`;

  const anchor = panel.querySelector('.bes-roster-filter-tabs') || panel.querySelector(':scope > .hr-panel-head');
  anchor?.insertAdjacentElement('afterend', toolbar);

  toolbar.querySelector('[data-select-all]')?.addEventListener('change', (event) => {
    const rows = [...panel.querySelectorAll('.hr-table tbody tr')];
    rows.forEach((row) => {
      const id = row.dataset.studentId;
      const student = (workspace.students || []).find((item) => item.id === id);
      if (!id || !student || isDeleted(student)) return;
      if (event.target.checked) selectedIds.add(id);
      else selectedIds.delete(id);
    });
    refreshToolbar(panel, workspace);
  });
  toolbar.querySelector('[data-clear-selection]')?.addEventListener('click', () => clearSelection(panel, workspace));
  toolbar.querySelector('[data-bulk-delete]')?.addEventListener('click', () => deleteSelected(panel));
  return toolbar;
}

function attachRowCheckboxes(panel, workspace) {
  const rows = [...panel.querySelectorAll('.hr-table tbody tr')];
  rows.forEach((row) => {
    const student = studentForRow(row, workspace);
    if (!student) return;
    row.dataset.studentId = student.id;
    const person = row.querySelector('.hr-person-cell');
    if (!person || person.querySelector(`.${CHECKBOX_CLASS}`)) return;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = CHECKBOX_CLASS;
    checkbox.setAttribute('aria-label', `Chọn ${student.fullName}`);
    checkbox.disabled = isDeleted(student);
    checkbox.checked = selectedIds.has(student.id);
    checkbox.addEventListener('click', (event) => event.stopPropagation());
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedIds.add(student.id);
      else selectedIds.delete(student.id);
      refreshToolbar(panel, workspace);
    });
    person.prepend(checkbox);
  });
}

async function enhanceRoster() {
  if (!/homeroom|chu-nhiem|gvcn/i.test(window.location.hash || '')) return;
  const panel = rosterPanel();
  if (!panel) return;

  let workspace;
  try {
    ({ workspace } = await loadCurrentWorkspace());
  } catch {
    return;
  }

  const filter = currentFilter(panel);
  if (lastWorkspaceId && lastWorkspaceId !== workspace.id) selectedIds.clear();
  if (lastFilter && lastFilter !== filter) selectedIds.clear();
  lastWorkspaceId = workspace.id;
  lastFilter = filter;

  createToolbar(panel, workspace);
  attachRowCheckboxes(panel, workspace);
  refreshToolbar(panel, workspace);
}

function scheduleEnhance() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    enhanceRoster();
  });
}

const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => [...mutation.addedNodes].some((node) => node.nodeType === 1))) {
    scheduleEnhance();
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener('hashchange', scheduleEnhance);
window.addEventListener('bes-homeroom-store-updated', scheduleEnhance);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleEnhance, { once: true });
} else {
  scheduleEnhance();
}
