import { getCurrentUser } from './utils/auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  loadHomeroomWorkspace,
  saveHomeroomWorkspace,
} from './utils/homeroomClassWorkspaceStore.js';
import { prepareWorkspaceCommit } from './utils/homeroomPhase3.js';
import {
  normalizeSchoolClassName,
  normalizeSchoolClassRegistry,
  schoolClassRegistryStorageKey,
} from './utils/schoolClassRegistry.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';

const PANEL_CLASS = 'bes-permanent-delete-mode';
const TOOLBAR_CLASS = 'bes-permanent-delete-toolbar';
const CHECKBOX_CLASS = 'bes-permanent-delete-checkbox';
const selectedIds = new Set();
let scheduled = false;
let busy = false;
let lastWorkspaceId = '';

function safeText(value, fallback = '') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
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
  return [...document.querySelectorAll('.hr-panel')].find((panel) => {
    const title = safeText(panel.querySelector(':scope > .hr-panel-head h2')?.textContent);
    return title === 'Danh sách lớp' || title === 'Danh sách lớp bộ môn';
  }) || null;
}

function currentFilter(panel) {
  const activeTab = panel?.querySelector('.bes-roster-filter-tabs button.is-active[data-roster-filter]');
  if (activeTab?.dataset.rosterFilter) return activeTab.dataset.rosterFilter;
  const filterSelect = [...(panel?.querySelectorAll('.hr-filter-row select') || [])].find((select) => (
    [...select.options].some((option) => option.value === 'deleted')
  ));
  return filterSelect?.value || 'active';
}

async function loadCurrentWorkspace() {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error('Chưa xác định được tài khoản đang đăng nhập.');
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
  const students = Array.isArray(workspace.students) ? workspace.students : [];
  return students.find((student) => row.dataset.studentId && student.id === row.dataset.studentId)
    || students.find((student) => code && normalizeCode(student.code) === code)
    || students.find((student) => name && fold(student.fullName) === name)
    || null;
}

function visibleDeletedRows(panel) {
  return [...panel.querySelectorAll('.hr-table tbody tr')].filter((row) => (
    !row.hidden && row.getAttribute('aria-hidden') !== 'true'
  ));
}

function purgeReferences(value, ids) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => {
        if (typeof item === 'string') return !ids.has(item);
        if (!item || typeof item !== 'object') return true;
        return !ids.has(item.studentId) && !ids.has(item.student_id);
      })
      .map((item) => purgeReferences(item, ids));
  }
  if (!value || typeof value !== 'object') return value;
  const output = {};
  Object.entries(value).forEach(([key, item]) => {
    if (ids.has(key)) return;
    if (item && typeof item === 'object' && (ids.has(item.studentId) || ids.has(item.student_id))) return;
    output[key] = purgeReferences(item, ids);
  });
  return output;
}

function purgeWorkingData(workspace, ids, user) {
  const now = new Date().toISOString();
  const cleaned = purgeReferences(workspace, ids);
  const next = {
    ...cleaned,
    students: (workspace.students || []).filter((student) => !ids.has(student.id)),
    backups: purgeReferences(workspace.backups || [], ids),
    studentDeletionAudit: (workspace.studentDeletionAudit || []).filter((item) => !ids.has(item.studentId)),
    studentPermanentDeletionAudit: [
      ...(workspace.studentPermanentDeletionAudit || []),
      {
        id: `student-permanent-delete-${Date.now()}`,
        count: ids.size,
        deletedAt: now,
        deletedBy: safeText(user?.email || user?.name || user?.id),
      },
    ],
    updatedAt: now,
  };
  return prepareWorkspaceCommit(
    workspace,
    next,
    user,
    `Xóa vĩnh viễn ${ids.size} học sinh khỏi dữ liệu đang dùng`,
  );
}

function sameStudent(left, right) {
  if (!left || !right) return false;
  const leftCode = normalizeCode(left.code);
  const rightCode = normalizeCode(right.code);
  if (leftCode && rightCode && leftCode === rightCode) return true;
  return fold(left.fullName) === fold(right.fullName)
    && (!left.birthDate || !right.birthDate || safeText(left.birthDate) === safeText(right.birthDate));
}

async function saveRegistryCloud(user, payload, now) {
  if (!isSupabaseConfigured || !supabase) return { ok: true };
  const role = safeText(user?.role).toLowerCase();
  if (!['admin', 'department_head', 'ttcm'].includes(role)) return { ok: true };

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await supabase.from('school_class_registries').upsert({
      owner_id: user.id,
      owner_email: user.email || '',
      payload,
      updated_at: now,
    }, { onConflict: 'owner_id' });
    if (!error) return { ok: true };
    lastError = error;
    if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 450));
  }
  return { ok: false, message: lastError?.message || 'Không thể đồng bộ danh mục lớp lên cloud.' };
}

async function purgeSchoolRegistry(user, workspace, removedStudents) {
  const key = schoolClassRegistryStorageKey(user);
  let registry;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { changed: false, cloudOk: true };
    registry = normalizeSchoolClassRegistry(JSON.parse(raw));
  } catch {
    return { changed: false, cloudOk: true };
  }

  const className = normalizeSchoolClassName(workspace.classProfile?.className);
  let changed = false;
  const now = new Date().toISOString();
  const next = {
    ...registry,
    updatedAt: now,
    classes: (registry.classes || []).map((item) => {
      if (normalizeSchoolClassName(item.className) !== className) return item;
      const students = (item.students || []).filter((student) => {
        const remove = removedStudents.some((target) => sameStudent(student, target));
        if (remove) changed = true;
        return !remove;
      });
      return {
        ...item,
        students,
        importedCount: students.filter((student) => student.active !== false && !isDeleted(student)).length,
      };
    }),
  };
  if (!changed) return { changed: false, cloudOk: true };

  localStorage.setItem(key, JSON.stringify(next));
  const cloudResult = await saveRegistryCloud(user, next, now);
  window.dispatchEvent(new CustomEvent('bes-school-class-registry-updated', {
    detail: { source: 'permanent-student-delete', className },
  }));
  return { changed: true, cloudOk: cloudResult.ok, message: cloudResult.message || '' };
}

function updateToolbar(panel, workspace) {
  const toolbar = panel.querySelector(`.${TOOLBAR_CLASS}`);
  if (!toolbar) return;
  const ids = visibleDeletedRows(panel).map((row) => row.dataset.permanentStudentId).filter(Boolean);
  const selectedCount = ids.filter((id) => selectedIds.has(id)).length;
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
  const selectAll = toolbar.querySelector('[data-permanent-select-all]');
  const count = toolbar.querySelector('[data-permanent-count]');
  const remove = toolbar.querySelector('[data-permanent-delete]');
  const clear = toolbar.querySelector('[data-permanent-clear]');
  const status = toolbar.querySelector('[data-permanent-status]');

  if (selectAll) {
    selectAll.checked = allSelected;
    selectAll.indeterminate = selectedCount > 0 && !allSelected;
    selectAll.disabled = busy || !ids.length;
  }
  if (count) count.textContent = String(selectedCount);
  if (remove) {
    remove.disabled = busy || !selectedCount;
    remove.textContent = busy ? 'Đang xóa…' : `Xóa vĩnh viễn${selectedCount ? ` (${selectedCount})` : ''}`;
  }
  if (clear) clear.disabled = busy || !selectedCount;
  if (status) status.textContent = busy ? 'Đang xóa dữ liệu và đồng bộ…' : '';

  visibleDeletedRows(panel).forEach((row) => {
    const id = row.dataset.permanentStudentId;
    const checkbox = row.querySelector(`.${CHECKBOX_CLASS}`);
    if (checkbox) checkbox.checked = selectedIds.has(id);
    row.classList.toggle('is-selected-student', selectedIds.has(id));
  });
  toolbar.__besWorkspace = workspace;
}

function confirmPermanentDeletion(students) {
  const preview = students.slice(0, 6).map((student) => student.fullName).join(', ');
  const remaining = Math.max(0, students.length - 6);
  const confirmed = window.confirm(
    `Xóa vĩnh viễn ${students.length} học sinh?\n\n`
      + preview + (remaining ? ` và ${remaining} học sinh khác` : '') + '.\n\n'
      + 'Hồ sơ, điểm, rèn luyện, điểm danh và dữ liệu liên quan sẽ bị loại khỏi hệ thống đang dùng. Thao tác này không thể khôi phục trong app.',
  );
  if (!confirmed) return false;

  const expected = `XOA ${students.length}`;
  const phrase = window.prompt(`Nhập “XÓA ${students.length}” để xác nhận:`, '');
  if (fold(phrase).toUpperCase() !== expected) {
    window.alert(`Xác nhận không đúng. Hãy nhập XÓA ${students.length}. Chưa có dữ liệu nào bị xóa.`);
    return false;
  }
  return true;
}

async function permanentlyDelete(panel, requestedIds = null) {
  if (busy) return;

  // Phải xác nhận trước bất kỳ await nào. Safari có thể chặn confirm/prompt
  // nếu hộp thoại được gọi sau một tác vụ bất đồng bộ.
  const toolbar = panel.querySelector(`.${TOOLBAR_CLASS}`);
  const cachedWorkspace = toolbar?.__besWorkspace;
  if (!cachedWorkspace) {
    window.alert('Chưa tải xong dữ liệu lớp. Vui lòng thử lại sau một giây.');
    return;
  }
  const requested = new Set(requestedIds || selectedIds);
  const cachedStudents = (cachedWorkspace.students || []).filter((student) => (
    requested.has(student.id) && isDeleted(student)
  ));
  if (!cachedStudents.length) {
    window.alert('Không có học sinh đã xóa nào được chọn.');
    return;
  }
  if (!confirmPermanentDeletion(cachedStudents)) return;

  busy = true;
  updateToolbar(panel, cachedWorkspace);
  try {
    const { user, workspace } = await loadCurrentWorkspace();
    const removedStudents = (workspace.students || []).filter((student) => (
      requested.has(student.id) && isDeleted(student)
    ));
    if (!removedStudents.length) throw new Error('Danh sách đã thay đổi. Không còn học sinh phù hợp để xóa.');

    const committed = purgeWorkingData(
      workspace,
      new Set(removedStudents.map((student) => student.id)),
      user,
    );
    const saved = await saveHomeroomWorkspace(committed, user);
    if (saved?.ok === false) throw new Error(saved.message || 'Không thể lưu dữ liệu sau khi xóa.');

    const registryResult = await purgeSchoolRegistry(user, workspace, removedStudents);
    selectedIds.clear();
    if (!registryResult.cloudOk) {
      window.alert(
        `Đã xóa ${removedStudents.length} học sinh trên lớp đang mở, nhưng chưa đồng bộ được danh mục cloud.\n\n${registryResult.message || 'Hãy kiểm tra kết nối mạng rồi thử lại.'}`,
      );
      return;
    }

    window.alert(`Đã xóa vĩnh viễn ${removedStudents.length} học sinh.`);
    window.location.reload();
  } catch (error) {
    console.error('[StudentPermanentDelete] Không thể xóa vĩnh viễn học sinh.', error);
    window.alert(error?.message || 'Không thể xóa vĩnh viễn học sinh.');
  } finally {
    busy = false;
    try {
      const { workspace } = await loadCurrentWorkspace();
      updateToolbar(panel, workspace);
    } catch { /* page may be reloading */ }
  }
}

function ensureToolbar(panel, workspace) {
  let toolbar = panel.querySelector(`.${TOOLBAR_CLASS}`);
  if (toolbar) return toolbar;
  toolbar = document.createElement('div');
  toolbar.className = TOOLBAR_CLASS;
  toolbar.innerHTML = `
    <label><input type="checkbox" data-permanent-select-all><span>Chọn tất cả đã xóa</span></label>
    <span>Đã chọn <b data-permanent-count>0</b> học sinh</span>
    <small data-permanent-status></small>
    <div><button type="button" class="secondary" data-permanent-clear>Bỏ chọn</button><button type="button" class="danger" data-permanent-delete>Xóa vĩnh viễn</button></div>`;
  const anchor = panel.querySelector('.bes-roster-filter-tabs') || panel.querySelector(':scope > .hr-panel-head');
  anchor?.insertAdjacentElement('afterend', toolbar);

  toolbar.querySelector('[data-permanent-select-all]')?.addEventListener('change', (event) => {
    const ids = visibleDeletedRows(panel).map((row) => row.dataset.permanentStudentId).filter(Boolean);
    if (event.target.checked) ids.forEach((id) => selectedIds.add(id));
    else ids.forEach((id) => selectedIds.delete(id));
    updateToolbar(panel, toolbar.__besWorkspace || workspace);
  });
  toolbar.querySelector('[data-permanent-clear]')?.addEventListener('click', () => {
    selectedIds.clear();
    updateToolbar(panel, toolbar.__besWorkspace || workspace);
  });
  toolbar.querySelector('[data-permanent-delete]')?.addEventListener('click', () => permanentlyDelete(panel));
  return toolbar;
}

function ensureRowControls(panel, workspace) {
  visibleDeletedRows(panel).forEach((row) => {
    const student = studentForRow(row, workspace);
    if (!student || !isDeleted(student)) return;
    row.dataset.permanentStudentId = student.id;
    const person = row.querySelector('.hr-person-cell');
    if (person && !person.querySelector(`.${CHECKBOX_CLASS}`)) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = CHECKBOX_CLASS;
      checkbox.setAttribute('aria-label', `Chọn xóa vĩnh viễn ${student.fullName}`);
      checkbox.addEventListener('click', (event) => event.stopPropagation());
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedIds.add(student.id);
        else selectedIds.delete(student.id);
        updateToolbar(panel, workspace);
      });
      person.prepend(checkbox);
    }

    const actions = row.querySelector('.hr-row-actions');
    if (actions && !actions.querySelector('[data-permanent-row-delete]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'danger';
      button.dataset.permanentRowDelete = 'true';
      button.textContent = 'Xóa vĩnh viễn';
      button.addEventListener('click', () => permanentlyDelete(panel, [student.id]));
      actions.appendChild(button);
    }
  });
}

function cleanup(panel) {
  panel.classList.remove(PANEL_CLASS);
  panel.querySelector(`.${TOOLBAR_CLASS}`)?.remove();
  panel.querySelectorAll(`.${CHECKBOX_CLASS}`).forEach((item) => item.remove());
  panel.querySelectorAll('[data-permanent-row-delete]').forEach((item) => item.remove());
  panel.querySelectorAll('[data-permanent-student-id]').forEach((row) => {
    delete row.dataset.permanentStudentId;
    row.classList.remove('is-selected-student');
  });
  selectedIds.clear();
}

function injectStyle() {
  if (document.getElementById('bes-permanent-delete-style')) return;
  const style = document.createElement('style');
  style.id = 'bes-permanent-delete-style';
  style.textContent = `
    .${PANEL_CLASS} > .hr-student-bulk-toolbar{display:none!important}
    .${PANEL_CLASS} .bes-student-row-checkbox{display:none!important}
    .${TOOLBAR_CLASS}{display:flex;align-items:center;gap:16px;margin:0 0 14px;padding:14px;border:1px solid rgba(217,48,37,.22);border-radius:16px;background:linear-gradient(135deg,#fce8e6,#fff)}
    .${TOOLBAR_CLASS}>label{display:flex;align-items:center;gap:9px;font-weight:800;cursor:pointer}
    .${TOOLBAR_CLASS}>span{color:#5f6368}. ${TOOLBAR_CLASS}>span b{color:#b3261e}
    .${TOOLBAR_CLASS}>small{color:#b3261e;font-weight:700}
    .${TOOLBAR_CLASS}>div{display:flex;gap:8px;margin-left:auto}
    .${TOOLBAR_CLASS} button{min-height:40px;padding:0 16px;border-radius:999px;font-weight:800}
    .${TOOLBAR_CLASS} button.danger,[data-permanent-row-delete]{border:1px solid #d93025!important;background:#fce8e6!important;color:#b3261e!important}
    .${CHECKBOX_CLASS},.${TOOLBAR_CLASS} input{width:19px!important;height:19px!important;min-width:19px!important;margin:0!important;accent-color:#d93025;cursor:pointer}
    @media(max-width:760px){.${TOOLBAR_CLASS}{align-items:stretch;flex-direction:column}.${TOOLBAR_CLASS}>div{width:100%;margin-left:0}.${TOOLBAR_CLASS}>div button{flex:1}}
  `;
  document.head.appendChild(style);
}

async function enhance() {
  if (!/homeroom|chu-nhiem|gvcn/i.test(window.location.hash || '')) return;
  const panel = rosterPanel();
  if (!panel) return;
  if (currentFilter(panel) !== 'deleted') {
    if (panel.classList.contains(PANEL_CLASS)) cleanup(panel);
    return;
  }

  let workspace;
  try {
    ({ workspace } = await loadCurrentWorkspace());
  } catch {
    return;
  }
  if (lastWorkspaceId && lastWorkspaceId !== workspace.id) selectedIds.clear();
  lastWorkspaceId = workspace.id;
  panel.classList.add(PANEL_CLASS);
  injectStyle();
  ensureRowControls(panel, workspace);
  const toolbar = ensureToolbar(panel, workspace);
  toolbar.__besWorkspace = workspace;
  updateToolbar(panel, workspace);
}

function scheduleEnhance() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    enhance().catch((error) => console.warn('[StudentPermanentDelete] Không thể dựng chế độ xóa vĩnh viễn.', error));
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
window.addEventListener('bes-student-roster-filtered', scheduleEnhance);
document.addEventListener('change', (event) => {
  if (event.target.closest('.bes-roster-filter-tabs, .hr-filter-row')) window.setTimeout(scheduleEnhance, 0);
}, true);
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-roster-filter]')) window.setTimeout(scheduleEnhance, 0);
}, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleEnhance, { once: true });
} else {
  scheduleEnhance();
}
