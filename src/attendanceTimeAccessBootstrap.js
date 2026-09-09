import './styles/AttendanceTimeAccessControl.css';
import {
  ensureRuntimeReady,
  getRuntimeClient,
  getRuntimeState,
  subscribeRuntime,
} from './services/runtime/core.js';
import { hasAttendanceTabAccess } from './utils/permissions.js';
import { normalizeSystemRole, SYSTEM_ROLES } from './utils/roles.js';
import {
  attendanceAccessReasonVi,
  attendanceWindowLabel,
  evaluateAttendanceTimeAccess,
  isAssignedAttendanceTeacher,
  parseClockTime,
} from './utils/attendanceTimeAccess.js';

const INSTALL_KEY = '__besAttendanceTimeAccessControlInstalled';
const CLASS_SELECT = 'id,class_name,subject,class_type,teacher_id,teacher_name,teacher_email,active';
const TEACHER_SELECT = 'class_id,teacher_id,teacher_name,teacher_email,position';

let client = null;
let runtimeSnapshot = null;
let settings = {
  enforce_teacher_time_window: false,
  teacher_start_time: '16:40:00',
  teacher_end_time: '17:15:00',
  can_administer: false,
  bypass_time_window: false,
  server_now: '',
};
let classes = [];
let classTeachers = [];
let serverClockOffsetMs = 0;
let metadataLoadedForUser = '';
let refreshPromise = null;
let renderQueued = false;
let observer = null;
let timer = 0;
let serverDecision = { key: '', data: null, pending: false };
let accessNotice = '';

function lower(value) {
  return String(value || '').trim().toLowerCase();
}

function isAdmin() {
  return normalizeSystemRole(runtimeSnapshot?.role || runtimeSnapshot?.profile?.role, SYSTEM_ROLES.GUEST) === SYSTEM_ROLES.ADMIN;
}

function currentProfile() {
  return runtimeSnapshot?.profile || null;
}

function hasReportPermission() {
  return Boolean(isAdmin() || settings.bypass_time_window || hasAttendanceTabAccess(currentProfile(), 'report'));
}

function hasQuickPermission() {
  return Boolean(isAdmin() || hasAttendanceTabAccess(currentProfile(), 'quick'));
}

function nowFromServerClock() {
  return new Date(Date.now() + serverClockOffsetMs);
}

function inputClockValue(value, fallback = '') {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
}

function configuredWindowLabel() {
  return attendanceWindowLabel(settings.teacher_start_time, settings.teacher_end_time);
}

function teachersForClass(classId) {
  return classTeachers.filter((teacher) => String(teacher.class_id) === String(classId));
}

function matchingTeacherNames(classRow, profile) {
  if (!classRow || !profile) return [];
  const profileId = String(profile.id || '').trim();
  const profileEmail = lower(profile.email);
  const profileName = lower(profile.full_name || profile.name);
  const matched = [];

  const addIfMatch = (row) => {
    const teacherId = String(row?.teacher_id || '').trim();
    const teacherEmail = lower(row?.teacher_email);
    const teacherName = lower(row?.teacher_name);
    const identityMatch = Boolean(
      (profileId && teacherId && teacherId === profileId)
      || (profileEmail && teacherEmail && teacherEmail === profileEmail)
      || (profileName && teacherName && teacherName === profileName)
    );
    if (identityMatch && String(row?.teacher_name || '').trim()) matched.push(String(row.teacher_name).trim());
  };

  teachersForClass(classRow.id).forEach(addIfMatch);
  addIfMatch(classRow);
  String(classRow.teacher_name || '').split(',').map((name) => name.trim()).filter(Boolean).forEach((name) => {
    if (profileName && lower(name) === profileName) matched.push(name);
  });
  return [...new Set(matched)];
}

function classByName(name) {
  const normalized = lower(name);
  if (!normalized) return null;
  return classes.find((row) => lower(row.class_name) === normalized && row.active !== false) || null;
}

function selectedTeacherValue() {
  return String(document.querySelector('.attendance-session-controls label.is-teacher select')?.value || '').trim();
}

function selectedClassRow() {
  return classByName(document.querySelector('.attendance-rollcall-head h2')?.textContent || '');
}

function evaluateClass(classRow, selectedTeacher = '') {
  const profile = currentProfile();
  const assigned = isAssignedAttendanceTeacher({
    profile,
    classRow,
    classTeachers: teachersForClass(classRow?.id),
  });
  let result = evaluateAttendanceTimeAccess({
    restrictionEnabled: Boolean(settings.enforce_teacher_time_window),
    isAdmin: isAdmin(),
    hasReportPermission: hasReportPermission(),
    hasQuickPermission: hasQuickPermission(),
    isAssigned: assigned,
    startTime: settings.teacher_start_time,
    endTime: settings.teacher_end_time,
    now: nowFromServerClock(),
  });

  if (
    result.allowed
    && settings.enforce_teacher_time_window
    && !result.bypass
    && selectedTeacher
  ) {
    const ownTeacherNames = matchingTeacherNames(classRow, profile).map(lower);
    if (!ownTeacherNames.includes(lower(selectedTeacher))) {
      result = {
        allowed: false,
        reason: 'teacher_identity_mismatch',
        windowLabel: configuredWindowLabel(),
      };
    }
  }
  return result;
}

function reasonText(result) {
  if (result?.reason === 'teacher_identity_mismatch') {
    return 'Hãy chọn đúng tên giáo viên gắn với tài khoản của bạn; không thể điểm danh thay giáo viên khác.';
  }
  if (result?.reason === 'class_not_found') return 'Không tìm thấy lớp đang hoạt động.';
  if (result?.reason === 'profile_not_approved') return 'Tài khoản chưa được duyệt để thao tác điểm danh.';
  if (result?.reason === 'not_authenticated') return 'Bạn cần đăng nhập để thao tác điểm danh.';
  return attendanceAccessReasonVi(result);
}

function setClassButtonDecoration(button, classRow, result) {
  if (!button || !classRow) return;
  if (button.dataset.besAttendanceClassId !== String(classRow.id)) button.dataset.besAttendanceClassId = String(classRow.id);
  const locked = Boolean(settings.enforce_teacher_time_window && !result.allowed && !result.bypass);
  button.classList.toggle('bes-attendance-class-locked', locked);
  if (locked) {
    if (!button.hasAttribute('data-bes-original-title')) button.dataset.besOriginalTitle = button.getAttribute('title') || '';
    const title = reasonText(result);
    if (button.getAttribute('title') !== title) button.setAttribute('title', title);
    button.setAttribute('aria-description', title);
  } else if (button.hasAttribute('data-bes-original-title')) {
    const original = button.dataset.besOriginalTitle || '';
    if (original) button.setAttribute('title', original);
    else button.removeAttribute('title');
    button.removeAttribute('data-bes-original-title');
    button.removeAttribute('aria-description');
  }
}

function setTimeLocked(node, locked) {
  if (!node || !('disabled' in node)) return;
  if (locked) {
    if (!node.hasAttribute('data-bes-time-lock')) {
      node.dataset.besTimeLock = 'true';
      node.dataset.besOriginalDisabled = node.disabled ? 'true' : 'false';
    }
    if (!node.disabled) node.disabled = true;
    return;
  }
  if (!node.hasAttribute('data-bes-time-lock')) return;
  const wasDisabled = node.dataset.besOriginalDisabled === 'true';
  if (node.disabled !== wasDisabled) node.disabled = wasDisabled;
  node.removeAttribute('data-bes-time-lock');
  node.removeAttribute('data-bes-original-disabled');
}

function applyTeacherOptionGuard(classRow, lockedByAccess) {
  const select = document.querySelector('.attendance-session-controls label.is-teacher select');
  if (!select) return;
  const shouldRestrict = Boolean(settings.enforce_teacher_time_window && !hasReportPermission() && !isAdmin());
  const ownNames = matchingTeacherNames(classRow, currentProfile()).map(lower);
  Array.from(select.options || []).forEach((option) => {
    if (!option.value) return;
    const shouldLock = shouldRestrict && !ownNames.includes(lower(option.value));
    if (shouldLock) {
      if (!option.hasAttribute('data-bes-teacher-option-lock')) {
        option.dataset.besTeacherOptionLock = 'true';
        option.dataset.besOriginalDisabled = option.disabled ? 'true' : 'false';
      }
      if (!option.disabled) option.disabled = true;
    } else if (option.hasAttribute('data-bes-teacher-option-lock')) {
      option.disabled = option.dataset.besOriginalDisabled === 'true';
      option.removeAttribute('data-bes-teacher-option-lock');
      option.removeAttribute('data-bes-original-disabled');
    }
  });
  if (lockedByAccess) select.setAttribute('aria-invalid', 'true');
  else select.removeAttribute('aria-invalid');
}

function lockRollcallControls(locked) {
  const rollcall = document.querySelector('.attendance-rollcall');
  if (!rollcall) return;
  const selector = [
    '.attendance-session-controls select',
    '.attendance-session-controls button',
    '.attendance-session-controls input:not([type="date"])',
    '.attendance-roster input',
    '.att-m3-absence-detail button',
    '.att-m3-absence-detail input',
    '.att-m3-proof-card button',
    '.attendance-confirm-bar input',
    '.att-m3-session-actions button',
    '.att-m3-cancel-surface input',
    '.att-m3-cancel-surface button',
  ].join(',');
  rollcall.querySelectorAll(selector).forEach((node) => setTimeLocked(node, locked));
  rollcall.classList.toggle('bes-attendance-write-locked', locked);
}

function ensureStatusBanner(result, classRow) {
  const controls = document.querySelector('.attendance-session-controls');
  const rollcall = document.querySelector('.attendance-rollcall');
  if (!controls || !rollcall || !classRow) {
    document.querySelector('.bes-attendance-access-status')?.remove();
    return;
  }
  let banner = rollcall.querySelector('.bes-attendance-access-status');
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'bes-attendance-access-status';
    controls.parentNode?.insertBefore(banner, controls);
  }

  let tone = 'is-info';
  let title = 'Giới hạn giờ đang tắt';
  let message = 'Cách thao tác điểm danh của PR #704 đang được giữ nguyên.';

  if (accessNotice) {
    tone = 'is-info';
    title = 'Cập nhật quyền điểm danh';
    message = accessNotice;
  } else if (settings.enforce_teacher_time_window && result?.bypass) {
    tone = 'is-bypass';
    title = isAdmin() ? 'Admin — không giới hạn giờ' : 'Quyền Báo cáo — không giới hạn giờ';
    message = `Khung giờ giáo viên: ${configuredWindowLabel()}. Tài khoản này được phép thao tác ngoài khung giờ.`;
  } else if (settings.enforce_teacher_time_window && result?.allowed) {
    tone = 'is-allowed';
    title = 'Đang trong khung giờ được phép';
    message = `${configuredWindowLabel()} · Bạn có thể thao tác điểm danh lớp được phân công.`;
  } else if (settings.enforce_teacher_time_window) {
    tone = 'is-blocked';
    title = 'Đang khóa thao tác điểm danh';
    message = reasonText(result);
  }

  const className = `bes-attendance-access-status ${tone}`;
  if (banner.className !== className) banner.className = className;
  const html = `<span aria-hidden="true">${tone === 'is-blocked' ? '🔒' : tone === 'is-allowed' ? '✓' : tone === 'is-bypass' ? '🛡' : '⏱'}</span><div><strong>${title}</strong><small>${message}</small></div>`;
  if (banner.innerHTML !== html) banner.innerHTML = html;
}

async function saveAdminSettings(panel) {
  if (!client || !settings.can_administer || !panel) return;
  const enabledInput = panel.querySelector('.bes-attendance-time-enabled');
  const startInput = panel.querySelector('.bes-attendance-time-start');
  const endInput = panel.querySelector('.bes-attendance-time-end');
  const saveButton = panel.querySelector('.bes-attendance-time-save');
  const status = panel.querySelector('.bes-attendance-time-admin-status');
  const start = String(startInput?.value || '').trim();
  const end = String(endInput?.value || '').trim();

  if (parseClockTime(start) === null || parseClockTime(end) === null || parseClockTime(start) === parseClockTime(end)) {
    if (status) {
      status.textContent = 'Giờ bắt đầu và kết thúc phải hợp lệ và khác nhau.';
      status.className = 'bes-attendance-time-admin-status is-error';
    }
    return;
  }

  if (saveButton) saveButton.disabled = true;
  accessNotice = '';
  try {
    const { data, error } = await client.rpc('bes_admin_set_attendance_time_restriction', {
      p_enabled: Boolean(enabledInput?.checked),
      p_start_time: start,
      p_end_time: end,
    });
    if (error) throw error;
    settings = { ...settings, ...(data || {}) };
    if (data?.server_now) serverClockOffsetMs = new Date(data.server_now).getTime() - Date.now();
    serverDecision = { key: '', data: null, pending: false };
    accessNotice = settings.enforce_teacher_time_window
      ? `Đã bật giới hạn ${configuredWindowLabel()} cho giáo viên được phân công.`
      : `Đã tắt giới hạn giờ. Khung ${configuredWindowLabel()} vẫn được lưu để dùng khi bật lại.`;
    if (status) {
      status.textContent = 'Đã lưu cài đặt.';
      status.className = 'bes-attendance-time-admin-status is-success';
    }
  } catch (error) {
    if (status) {
      status.textContent = error?.message || 'Không thể lưu cài đặt.';
      status.className = 'bes-attendance-time-admin-status is-error';
    }
  } finally {
    if (saveButton) saveButton.disabled = false;
    queueRender();
  }
}

function ensureAdminSettingsPanel() {
  const tabs = document.querySelector('.attendance-tabs');
  if (!tabs) return;
  let panel = document.querySelector('.bes-attendance-time-settings');
  if (!settings.can_administer) {
    panel?.remove();
    return;
  }

  if (!panel) {
    panel = document.createElement('section');
    panel.className = 'bes-attendance-time-settings';
    panel.innerHTML = `
      <div class="bes-attendance-time-heading">
        <span aria-hidden="true">⏱</span>
        <div><strong>Thời gian điểm danh của giáo viên</strong><small>Chỉ giáo viên được phân công bị giới hạn. Admin và người có quyền Báo cáo luôn được thao tác.</small></div>
      </div>
      <label class="bes-attendance-time-toggle">
        <span><b>Bật giới hạn thời gian</b><small>Ngoài khung giờ, giáo viên chỉ được xem.</small></span>
        <span class="bes-attendance-switch"><input class="bes-attendance-time-enabled" type="checkbox" aria-label="Bật giới hạn thời gian điểm danh"><i></i></span>
      </label>
      <label class="bes-attendance-time-field"><span>Bắt đầu</span><input class="bes-attendance-time-start" type="time" step="60" aria-label="Giờ bắt đầu điểm danh"></label>
      <span class="bes-attendance-time-arrow" aria-hidden="true">→</span>
      <label class="bes-attendance-time-field"><span>Kết thúc</span><input class="bes-attendance-time-end" type="time" step="60" aria-label="Giờ kết thúc điểm danh"></label>
      <button class="bes-attendance-time-save" type="button">Lưu cài đặt</button>
      <em class="bes-attendance-time-admin-status" aria-live="polite"></em>
    `;
    tabs.insertAdjacentElement('afterend', panel);
    panel.querySelector('.bes-attendance-time-save')?.addEventListener('click', () => saveAdminSettings(panel));
    panel.querySelectorAll('input').forEach((input) => input.addEventListener('change', () => {
      const status = panel.querySelector('.bes-attendance-time-admin-status');
      if (status) {
        status.textContent = 'Có thay đổi chưa lưu.';
        status.className = 'bes-attendance-time-admin-status is-dirty';
      }
    }));
  }

  const enabledInput = panel.querySelector('.bes-attendance-time-enabled');
  const startInput = panel.querySelector('.bes-attendance-time-start');
  const endInput = panel.querySelector('.bes-attendance-time-end');
  if (enabledInput && enabledInput.checked !== Boolean(settings.enforce_teacher_time_window)) enabledInput.checked = Boolean(settings.enforce_teacher_time_window);
  const startValue = inputClockValue(settings.teacher_start_time, '16:40');
  const endValue = inputClockValue(settings.teacher_end_time, '17:15');
  if (startInput && document.activeElement !== startInput && startInput.value !== startValue) startInput.value = startValue;
  if (endInput && document.activeElement !== endInput && endInput.value !== endValue) endInput.value = endValue;
}

function serverDecisionKey(classRow, teacherName) {
  return [
    runtimeSnapshot?.profile?.id || '',
    classRow?.id || '',
    lower(teacherName),
    settings.enforce_teacher_time_window ? '1' : '0',
    settings.teacher_start_time || '',
    settings.teacher_end_time || '',
  ].join('|');
}

function requestServerDecision(classRow, teacherName) {
  if (!client || !classRow?.id || !settings.enforce_teacher_time_window) return;
  const key = serverDecisionKey(classRow, teacherName);
  if (serverDecision.key === key) return;
  serverDecision = { key, data: null, pending: true };
  client.rpc('bes_get_extra_class_attendance_access', {
    p_class_id: classRow.id,
    p_teacher_name: teacherName || null,
  }).then(({ data, error }) => {
    if (serverDecision.key !== key) return;
    serverDecision = { key, data: error ? null : data, pending: false };
    queueRender();
  }).catch(() => {
    if (serverDecision.key === key) serverDecision = { key, data: null, pending: false };
  });
}

function renderAccessState() {
  renderQueued = false;
  const shell = document.querySelector('.attendance-shell');
  if (!shell) return;

  ensureAdminSettingsPanel();
  document.querySelectorAll('.attendance-class-list > div > button').forEach((button) => {
    const classRow = classByName(button.querySelector('b')?.textContent || '');
    if (!classRow) return;
    setClassButtonDecoration(button, classRow, evaluateClass(classRow));
  });

  const classRow = selectedClassRow();
  if (!classRow) {
    lockRollcallControls(false);
    ensureStatusBanner(null, null);
    return;
  }

  const teacherName = selectedTeacherValue();
  let result = evaluateClass(classRow, teacherName);
  const key = serverDecisionKey(classRow, teacherName);
  if (settings.enforce_teacher_time_window) requestServerDecision(classRow, teacherName);
  if (settings.enforce_teacher_time_window && serverDecision.key === key && serverDecision.data) result = serverDecision.data;

  const locked = Boolean(settings.enforce_teacher_time_window && !result?.allowed && !result?.bypass);
  applyTeacherOptionGuard(classRow, locked);
  lockRollcallControls(locked);
  ensureStatusBanner(result, classRow);
}

function queueRender() {
  if (renderQueued || typeof window === 'undefined') return;
  renderQueued = true;
  window.requestAnimationFrame(renderAccessState);
}

async function refreshAccessMetadata({ force = false } = {}) {
  if (refreshPromise && !force) return refreshPromise;
  refreshPromise = (async () => {
    try {
      runtimeSnapshot = await ensureRuntimeReady();
      client = getRuntimeClient();
      const userId = String(runtimeSnapshot?.profile?.id || runtimeSnapshot?.user?.id || '');
      if (!client || !userId) {
        classes = [];
        classTeachers = [];
        metadataLoadedForUser = '';
        return;
      }
      if (!force && metadataLoadedForUser === userId && classes.length) return;

      const [settingsResult, classesResult, teachersResult] = await Promise.all([
        client.rpc('bes_get_attendance_access_settings'),
        client.from('bes_extra_classes').select(CLASS_SELECT).eq('active', true).order('class_name'),
        client.from('bes_extra_class_teachers').select(TEACHER_SELECT).order('position'),
      ]);

      if (!settingsResult.error && settingsResult.data) {
        settings = { ...settings, ...settingsResult.data };
        if (settingsResult.data.server_now) serverClockOffsetMs = new Date(settingsResult.data.server_now).getTime() - Date.now();
      }
      if (!classesResult.error) classes = classesResult.data || [];
      if (!teachersResult.error) classTeachers = teachersResult.data || [];
      metadataLoadedForUser = userId;
    } catch (error) {
      console.warn('[AttendanceTimeAccess] Could not refresh access metadata.', error);
    } finally {
      refreshPromise = null;
      queueRender();
    }
  })();
  return refreshPromise;
}

function installObserver() {
  if (observer || typeof document === 'undefined') return;
  const start = () => {
    if (!document.body || observer) return;
    observer = new MutationObserver(() => queueRender());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'value', 'disabled'] });
    document.addEventListener('change', (event) => {
      if (event.target?.closest?.('.attendance-shell')) {
        serverDecision = { key: '', data: null, pending: false };
        queueRender();
      }
    }, true);
    timer = window.setInterval(() => {
      if (document.querySelector('.attendance-shell')) queueRender();
    }, 10000);
    refreshAccessMetadata().catch(() => {});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

export function installAttendanceTimeAccessControl() {
  if (typeof window === 'undefined' || window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;
  runtimeSnapshot = getRuntimeState();
  subscribeRuntime((next) => {
    const previousUserId = String(runtimeSnapshot?.profile?.id || runtimeSnapshot?.user?.id || '');
    const nextUserId = String(next?.profile?.id || next?.user?.id || '');
    runtimeSnapshot = next;
    if (previousUserId !== nextUserId) {
      metadataLoadedForUser = '';
      serverDecision = { key: '', data: null, pending: false };
      refreshAccessMetadata({ force: true }).catch(() => {});
    } else {
      queueRender();
    }
  });
  window.addEventListener('bes-attendance-classes-updated', () => refreshAccessMetadata({ force: true }).catch(() => {}));
  window.addEventListener('bes-auth-users-updated', () => refreshAccessMetadata({ force: true }).catch(() => {}));
  installObserver();
}

installAttendanceTimeAccessControl();
