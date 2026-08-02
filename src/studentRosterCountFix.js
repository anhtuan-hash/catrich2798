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
  const candidates = [
    '.hr-hero-copy span',
    '.hr-class-switcher strong',
    '.hr-workspace-current strong',
    '.hr-class-title',
    '[data-class-name]',
  ];
  for (const selector of candidates) {
    const nodes = [...document.querySelectorAll(selector)];
    for (const node of nodes) {
      const text = safeText(node.dataset?.className || node.textContent);
      const match = text.match(/(?:^|\s|·|lớp\s*)(\d{1,2}[.\-]\d{1,2})(?:\s|·|$)/i);
      if (match?.[1]) return safeText(match[1]).replace('-', '.');
    }
  }
  return '';
}

function currentWorkspaceIds() {
  const ids = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(CURRENT_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      const parsed = parseJson(raw);
      const value = typeof parsed === 'string'
        ? parsed
        : safeText(parsed?.workspaceId || parsed?.id || raw).replace(/^"|"$/g, '');
      if (value) ids.push(value);
    }
  } catch {
    return [];
  }
  return [...new Set(ids)];
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

function newest(items = []) {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || a.lastOpenedAt || 0) || 0;
    const bTime = Date.parse(b.updatedAt || b.lastOpenedAt || 0) || 0;
    return bTime - aTime;
  })[0] || null;
}

function currentWorkspace() {
  const candidates = workspaceCandidates();
  if (!candidates.length) return null;

  const className = visibleClassName().toLowerCase();
  if (className) {
    const matching = candidates.filter((item) => safeText(item.classProfile?.className).toLowerCase() === className);
    if (matching.length) return newest(matching);
  }

  const selectedIds = new Set(currentWorkspaceIds());
  const selected = candidates.filter((item) => selectedIds.has(item.id));
  return newest(selected.length ? selected : candidates);
}

function rosterHeaderInfo() {
  for (const head of document.querySelectorAll('.hr-panel-head')) {
    const title = safeText(head.querySelector('h2')?.textContent);
    if (!/^Danh sách lớp(?:\s+bộ môn)?$/i.test(title)) continue;
    const target = head.querySelector('small');
    if (target) return { target, title, subjectClass: /bộ môn/i.test(title) };
  }
  return null;
}

function updateRosterCount() {
  const header = rosterHeaderInfo();
  if (!header) return;

  const workspace = currentWorkspace();
  if (!workspace) return;

  const students = Array.isArray(workspace.students) ? workspace.students : [];
  const active = students.filter((student) => student?.active !== false && !isDeleted(student)).length;
  const archived = students.filter((student) => student?.active === false && !isDeleted(student)).length;
  const deleted = students.filter(isDeleted).length;
  const label = header.subjectClass
    ? `${active} học sinh`
    : `${active} học sinh đang học · ${archived} lưu trữ · ${deleted} đã xóa`;

  if (safeText(header.target.textContent).toLowerCase() !== label.toLowerCase()) {
    header.target.textContent = label;
    header.target.title = header.subjectClass
      ? `Sĩ số lớp bộ môn chỉ tính học sinh đang học. ${archived + deleted} hồ sơ cũ được giữ riêng để bảo toàn dữ liệu.`
      : archived
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

document.addEventListener('click', () => window.setTimeout(scheduleUpdate, 0), true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleUpdate, { once: true });
} else {
  scheduleUpdate();
}
