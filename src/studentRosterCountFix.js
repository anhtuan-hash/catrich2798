import './studentBulkDeleteRuntime.js';

const CURRENT_PREFIX = 'bes-homeroom-current-workspace-v3:';
const WORKSPACE_PREFIX = 'bes-homeroom-workspace-v1:';

function safeText(value) {
  return String(value ?? '').trim();
}

function parseJson(raw) {
  try {
    const value = JSON.parse(raw || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function isDeleted(student) {
  return student?.lifecycleStatus === 'deleted' || Boolean(student?.deletedAt);
}

function visibleClassName() {
  const text = safeText(
    document.querySelector('.hr-hero-copy span, .hr-class-switcher strong, .hr-workspace-current strong')?.textContent,
  );
  const match = text.match(/(?:^|\s|·)(\d{1,2}[.\-]\d{1,2})(?:\s|·|$)/);
  return safeText(match?.[1]).replace('-', '.');
}

function workspaceCandidates() {
  const candidates = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(WORKSPACE_PREFIX)) continue;
      const workspace = parseJson(localStorage.getItem(key));
      if (workspace) candidates.push(workspace);
    }
  } catch {
    return [];
  }
  return candidates;
}

function currentWorkspace() {
  const candidates = workspaceCandidates();
  if (!candidates.length) return null;

  const className = visibleClassName().toLowerCase();
  const matching = className
    ? candidates.filter((item) => safeText(item.classProfile?.className).toLowerCase() === className)
    : [];

  return [...(matching.length ? matching : candidates)].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || a.lastOpenedAt || 0) || 0;
    const bTime = Date.parse(b.updatedAt || b.lastOpenedAt || 0) || 0;
    return bTime - aTime;
  })[0] || null;
}

function rosterHeaderSmall() {
  return [...document.querySelectorAll('.hr-panel-head')].find((head) => (
    safeText(head.querySelector('h2')?.textContent) === 'Danh sách lớp'
  ))?.querySelector('small') || null;
}

function updateRosterCount() {
  const target = rosterHeaderSmall();
  if (!target) return;

  const workspace = currentWorkspace();
  if (!workspace) return;

  const students = Array.isArray(workspace.students) ? workspace.students : [];
  const active = students.filter((student) => student?.active !== false && !isDeleted(student)).length;
  const archived = students.filter((student) => student?.active === false && !isDeleted(student)).length;
  const deleted = students.filter(isDeleted).length;
  const label = `${active} học sinh đang học · ${archived} lưu trữ · ${deleted} đã xóa`;

  if (safeText(target.textContent).toLowerCase() !== label.toLowerCase()) {
    target.textContent = label;
    target.title = archived
      ? 'Sĩ số chỉ tính học sinh đang học. Hồ sơ lưu trữ là dữ liệu cũ được giữ lại để bảo toàn điểm, rèn luyện và điểm danh.'
      : 'Sĩ số chỉ tính học sinh đang học.';
  }
}

let scheduled = false;
function scheduleUpdate() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    updateRosterCount();
  });
}

const observer = new MutationObserver((mutations) => {
  const relevant = mutations.some((mutation) => (
    [...mutation.addedNodes].some((node) => node.nodeType === 1)
  ));
  if (relevant) scheduleUpdate();
});

observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('hashchange', scheduleUpdate);
window.addEventListener('bes-homeroom-store-updated', scheduleUpdate);
window.addEventListener('storage', scheduleUpdate);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleUpdate, { once: true });
} else {
  scheduleUpdate();
}
