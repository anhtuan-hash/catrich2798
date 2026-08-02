import { getCurrentUser } from './utils/auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  loadHomeroomWorkspace,
  loadLocalHomeroomWorkspace,
  saveHomeroomWorkspace,
  saveLocalHomeroomWorkspace,
} from './utils/homeroomClassWorkspaceStore.js';
import {
  normalizeSchoolClassName,
  normalizeSchoolClassRegistry,
  schoolClassRegistryStorageKey,
} from './utils/schoolClassRegistry.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';

const PANEL_CLASS = 'bes-permanent-delete-mode';
const TOOLBAR_CLASS = 'bes-permanent-delete-toolbar';
const CHECKBOX_CLASS = 'bes-permanent-delete-checkbox';
const TOMBSTONE_PREFIX = 'bes-permanent-student-deletions-v1';
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

function userKey(user) {
  return safeText(user?.id || user?.authId || user?.email, 'guest').toLowerCase();
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

function buildCleanWorkspace(workspace, ids, user) {
  const now = new Date().toISOString();
  const cleaned = purgeReferences(workspace, ids);
  const auditEntry = {
    id: `student-permanent-delete-${Date.now()}`,
    action: `Xóa vĩnh viễn ${ids.size} học sinh`,
    summary: `students: ${(workspace.students || []).length} → ${(workspace.students || []).filter((student) => !ids.has(student.id)).length}`,
    actorId: safeText(user?.id || user?.authId),
    actorName: safeText(user?.name || user?.email, 'Người dùng'),
    actorEmail: safeText(user?.email),
    source: 'web-app',
    createdAt: now,
  };
  return {
    ...cleaned,
    students: (workspace.students || []).filter((student) => !ids.has(student.id)),
    backups: purgeReferences(workspace.backups || [], ids),
    studentDeletionAudit: (workspace.studentDeletionAudit || []).filter((item) => !ids.has(item.studentId)),
    studentPermanentDeletionAudit: [
      ...(workspace.studentPermanentDeletionAudit || []),
      {
        id: auditEntry.id,
        count: ids.size,
        deletedAt: now,
        deletedBy: safeText(user?.email || user?.name || user?.id),
      },
    ],
    auditLogs: [auditEntry, ...(cleaned.auditLogs || [])].slice(0, 300),
    updatedAt: now,
  };
}

function studentFingerprint(student) {
  return {
    id: safeText(student?.id),
    code: normalizeCode(student?.code),
    identity: `${fold(student?.fullName)}|${safeText(student?.birthDate)}`,
    fullName: safeText(student?.fullName),
    birthDate: safeText(student?.birthDate),
  };
}

function tombstoneKey(user, className) {
  return `${TOMBSTONE_PREFIX}:${userKey(user)}:${normalizeSchoolClassName(className) || safeText(className).toLowerCase()}`;
}

function persistTombstones(user, workspace, students) {
  const key = tombstoneKey(user, workspace.classProfile?.className);
  let existing = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    existing = Array.isArray(parsed) ? parsed : [];
  } catch {
    existing = [];
  }
  const byIdentity = new Map();
  [...existing, ...students.map(studentFingerprint)].forEach((item) => {
    const identity = safeText(item.id || item.code || item.identity);
    if (identity) byIdentity.set(identity, item);
  });
  localStorage.setItem(key, JSON.stringify([...byIdentity.values()]));
}

function sameStudent(left, right) {
  if (!left || !right) return false;
  const leftCode = normalizeCode(left.code);
  const rightCode = normalizeCode(right.code);
  if (leftCode && rightCode && leftCode === rightCode) return true;
  return fold(left.fullName) === fold(right.fullName)
    && (!left.birthDate || !right.birthDate || safeText(left.birthDate) === safeText(right.birthDate));
}

function prepareRegistryRemoval(user, workspace, removedStudents) {
  const key = schoolClassRegistryStorageKey(user);
  let registry;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { changed: false, key, payload: null };
    registry = normalizeSchoolClassRegistry(JSON.parse(raw));
  } catch {
    return { changed: false, key, payload: null };
  }

  const className = normalizeSchoolClassName(workspace.classProfile?.className);
  let changed = false;
  const now = new Date().toISOString();
  const payload = {
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
  return { changed, key, payload, now, className };
}

async function saveRegistryCloud(user, payload, now) {
  if (!isSupabaseConfigured || !supabase || !payload) return { ok: true };
  const role = safeText(user?.role).toLowerCase();
  if (!['admin', 'department_head', 'ttcm'].includes(role)) return { ok: true };

  const { error } = await supabase.from('school_class_registries').upsert({
    owner_id: user.id,
    owner_email: user.email || '',
    payload,
    updated_at: now,
  }, { onConflict: 'owner_id' });
  return error ? { ok: false, message: error.message || 'Không thể đồng bộ danh mục lớp.' } : { ok: true };
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
  if (status) status.textContent = busy ? 'Đang xóa dữ liệu trên thiết bị…' : '';

  visibleDeletedRows(panel).forEach((row) => {
    const id = row.dataset.permanentStudentId;
    const checkbox = row.querySelector(`.${CHECKBOX_CLASS}`);
    if (checkbox) checkbox.checked = selectedIds.has(id);
    row.classList.toggle('is-selected-student', selectedIds.has(id));
  });
  toolbar.__besWorkspace = workspace;
}

function closeModal(modal, result) {
  modal.__resolve?.(result);
  modal.remove();
}

function confirmPermanentDeletion(students) {
  const existing = document.getElementById('bes-permanent-delete-modal');
  if (existing) existing.remove();
  const expected = `XOA ${students.length}`;
  const modal = document.createElement('div');
  modal.id = 'bes-permanent-delete-modal';
  const preview = students.slice(0, 6).map((student) => student.fullName).join(', ');
  const remaining = Math.max(0, students.length - 6);
  modal.innerHTML = `
    <div class="bes-permanent-dialog" role="dialog" aria-modal="true" aria-labelledby="bes-permanent-title">
      <h3 id="bes-permanent-title">Xóa vĩnh viễn ${students.length} học sinh?</h3>
      <p>${preview}${remaining ? ` và ${remaining} học sinh khác` : ''}</p>
      <p class="warning">Hồ sơ, điểm, rèn luyện, điểm danh và dữ liệu liên quan sẽ bị loại khỏi app.</p>
      <label>Nhập <b>XÓA ${students.length}</b> để xác nhận<input type="text" autocomplete="off" spellcheck="false" data-confirm-input></label>
      <small data-confirm-hint>Chưa nhập đúng cụm xác nhận.</small>
      <div><button type="button" class="secondary" data-cancel>Hủy</button><button type="button" class="danger" data-confirm disabled>Xóa vĩnh viễn</button></div>
    </div>`;
  document.body.appendChild(modal);

  return new Promise((resolve) => {
    modal.__resolve = resolve;
    const input = modal.querySelector('[data-confirm-input]');
    const confirm = modal.querySelector('[data-confirm]');
    const hint = modal.querySelector('[data-confirm-hint]');
    const validate = () => {
      const valid = fold(input.value).toUpperCase() === expected;
      confirm.disabled = !valid;
      hint.textContent = valid ? 'Đã xác nhận. Có thể xóa.' : `Nhập đúng: XÓA ${students.length}`;
      hint.classList.toggle('is-valid', valid);
    };
    input.addEventListener('input', validate);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !confirm.disabled) closeModal(modal, true);
      if (event.key === 'Escape') closeModal(modal, false);
    });
    modal.querySelector('[data-cancel]')?.addEventListener('click', () => closeModal(modal, false));
    confirm.addEventListener('click', () => closeModal(modal, true));
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal, false);
    });
    window.setTimeout(() => input.focus(), 20);
  });
}

function showNotice(message, tone = 'success') {
  document.getElementById('bes-permanent-delete-notice')?.remove();
  const notice = document.createElement('div');
  notice.id = 'bes-permanent-delete-notice';
  notice.className = tone;
  notice.textContent = message;
  document.body.appendChild(notice);
  window.setTimeout(() => notice.remove(), 6000);
}

async function permanentlyDelete(panel, requestedIds = null) {
  if (busy) return;
  const toolbar = panel.querySelector(`.${TOOLBAR_CLASS}`);
  const cachedWorkspace = toolbar?.__besWorkspace;
  if (!cachedWorkspace) {
    showNotice('Chưa tải xong dữ liệu lớp. Thử lại sau một giây.', 'error');
    return;
  }

  const requested = new Set(requestedIds || selectedIds);
  const cachedStudents = (cachedWorkspace.students || []).filter((student) => (
    requested.has(student.id) && isDeleted(student)
  ));
  if (!cachedStudents.length) {
    showNotice('Không có học sinh đã xóa nào được chọn.', 'error');
    return;
  }
  if (!(await confirmPermanentDeletion(cachedStudents))) return;

  busy = true;
  updateToolbar(panel, cachedWorkspace);
  try {
    const { user, workspace } = await loadCurrentWorkspace();
    const removedStudents = (workspace.students || []).filter((student) => (
      requested.has(student.id) && isDeleted(student)
    ));
    if (!removedStudents.length) throw new Error('Danh sách đã thay đổi. Không còn học sinh phù hợp để xóa.');

    const ids = new Set(removedStudents.map((student) => student.id));
    const cleaned = buildCleanWorkspace(workspace, ids, user);
    const registry = prepareRegistryRemoval(user, workspace, removedStudents);

    persistTombstones(user, workspace, removedStudents);
    if (registry.changed && registry.payload) {
      localStorage.setItem(registry.key, JSON.stringify(registry.payload));
    }

    saveLocalHomeroomWorkspace(cleaned, user);
    const verified = loadLocalHomeroomWorkspace(user, cleaned.id);
    const leftovers = (verified?.students || []).filter((student) => ids.has(student.id));
    if (leftovers.length) throw new Error(`Không thể ghi dữ liệu mới trên thiết bị. Còn ${leftovers.length} hồ sơ chưa xóa.`);

    visibleDeletedRows(panel).forEach((row) => {
      if (ids.has(row.dataset.permanentStudentId)) row.remove();
    });
    selectedIds.clear();
    toolbar.__besWorkspace = verified || cleaned;
    updateToolbar(panel, verified || cleaned);
    showNotice(`Đã xóa ${removedStudents.length} học sinh trên thiết bị. Đang đồng bộ cloud…`);

    const workspaceCloud = await saveHomeroomWorkspace(verified || cleaned, user);
    const registryCloud = registry.changed
      ? await saveRegistryCloud(user, registry.payload, registry.now)
      : { ok: true };

    if (workspaceCloud?.ok === false || registryCloud.ok === false) {
      showNotice(
        `Đã xóa vĩnh viễn ${removedStudents.length} học sinh trên thiết bị. Cloud chưa đồng bộ hoàn tất; dữ liệu sẽ không tự xuất hiện lại trên máy này.`,
        'warning',
      );
    } else {
      showNotice(`Đã xóa vĩnh viễn ${removedStudents.length} học sinh.`);
    }

    window.setTimeout(() => window.location.reload(), 700);
  } catch (error) {
    console.error('[StudentPermanentDelete] Không thể xóa vĩnh viễn học sinh.', error);
    showNotice(error?.message || 'Không thể xóa vĩnh viễn học sinh.', 'error');
  } finally {
    busy = false;
    try {
      const user = await getCurrentUser();
      const workspaceId = getCurrentHomeroomWorkspaceId(user);
      const workspace = loadLocalHomeroomWorkspace(user, workspaceId);
      if (workspace) updateToolbar(panel, workspace);
    } catch { /* ignore */ }
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
    .${TOOLBAR_CLASS}>span{color:#5f6368}.${TOOLBAR_CLASS}>span b{color:#b3261e}
    .${TOOLBAR_CLASS}>small{color:#b3261e;font-weight:700}
    .${TOOLBAR_CLASS}>div{display:flex;gap:8px;margin-left:auto}
    .${TOOLBAR_CLASS} button{min-height:40px;padding:0 16px;border-radius:999px;font-weight:800}
    .${TOOLBAR_CLASS} button.danger,[data-permanent-row-delete]{border:1px solid #d93025!important;background:#fce8e6!important;color:#b3261e!important}
    .${CHECKBOX_CLASS},.${TOOLBAR_CLASS} input{width:19px!important;height:19px!important;min-width:19px!important;margin:0!important;accent-color:#d93025;cursor:pointer}
    #bes-permanent-delete-modal{position:fixed;inset:0;z-index:1000000;display:grid;place-items:center;padding:20px;background:rgba(32,33,36,.55);backdrop-filter:blur(4px)}
    .bes-permanent-dialog{width:min(520px,100%);padding:24px;border-radius:22px;background:#fff;box-shadow:0 24px 80px rgba(0,0,0,.3);color:#202124}
    .bes-permanent-dialog h3{margin:0 0 12px;font-size:22px}.bes-permanent-dialog p{margin:8px 0;line-height:1.5}.bes-permanent-dialog .warning{color:#b3261e;font-weight:700}
    .bes-permanent-dialog label{display:grid;gap:8px;margin-top:18px;font-weight:700}.bes-permanent-dialog input{width:100%;min-height:48px;padding:0 14px;border:2px solid #dadce0;border-radius:12px;font-size:18px;text-transform:uppercase}
    .bes-permanent-dialog input:focus{outline:none;border-color:#d93025;box-shadow:0 0 0 3px rgba(217,48,37,.12)}.bes-permanent-dialog small{display:block;margin-top:7px;color:#b3261e}.bes-permanent-dialog small.is-valid{color:#188038}
    .bes-permanent-dialog>div{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.bes-permanent-dialog button{min-height:42px;padding:0 18px;border-radius:999px;font-weight:800}.bes-permanent-dialog button.danger{border:1px solid #d93025;background:#d93025;color:#fff}.bes-permanent-dialog button:disabled{opacity:.45;cursor:not-allowed}
    #bes-permanent-delete-notice{position:fixed;right:22px;bottom:24px;z-index:1000001;max-width:min(520px,calc(100vw - 44px));padding:14px 18px;border-radius:14px;background:#188038;color:#fff;font-weight:800;box-shadow:0 12px 40px rgba(0,0,0,.24)}
    #bes-permanent-delete-notice.warning{background:#b06000}#bes-permanent-delete-notice.error{background:#b3261e}
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
