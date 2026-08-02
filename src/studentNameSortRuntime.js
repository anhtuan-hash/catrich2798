import { getCurrentUser } from './utils/auth.js';
import { getCurrentHomeroomWorkspaceId } from './utils/homeroomClassWorkspaceStore.js';
import './styles/StudentNameSort.css';

const CONTROL_CLASS = 'bes-student-name-sort';
const STORAGE_PREFIX = 'bes-student-name-sort-v1';
const DEFAULT_MODE = 'given-asc';
const COLLATOR = new Intl.Collator('vi', {
  sensitivity: 'base',
  numeric: true,
  ignorePunctuation: true,
});

let scheduled = false;
let currentUser = null;
let userPromise = null;

function safeText(value, fallback = '') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

async function loadUser() {
  if (currentUser) return currentUser;
  if (!userPromise) {
    userPromise = getCurrentUser()
      .then((user) => {
        currentUser = user || null;
        return currentUser;
      })
      .finally(() => { userPromise = null; });
  }
  return userPromise;
}

function userScope(user) {
  return safeText(user?.id || user?.authId || user?.email, 'guest').toLowerCase();
}

function preferenceKey(user) {
  const workspaceId = getCurrentHomeroomWorkspaceId(user) || 'default';
  return `${STORAGE_PREFIX}:${userScope(user)}:${workspaceId}`;
}

function readMode(user) {
  try {
    const value = localStorage.getItem(preferenceKey(user));
    return ['given-asc', 'given-desc', 'fullname-asc', 'original'].includes(value)
      ? value
      : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

function writeMode(user, mode) {
  try { localStorage.setItem(preferenceKey(user), mode); }
  catch { /* preference is optional */ }
}

function rosterPanels() {
  return [...document.querySelectorAll('.hr-panel')].filter((panel) => {
    const title = safeText(panel.querySelector(':scope > .hr-panel-head h2')?.textContent);
    return title === 'Danh sách lớp' || title === 'Danh sách lớp bộ môn';
  });
}

function studentName(row) {
  return safeText(row.querySelector('.hr-person-cell b')?.textContent);
}

function givenName(fullName) {
  const parts = safeText(fullName).split(' ').filter(Boolean);
  return parts.at(-1) || '';
}

function middleAndFamily(fullName) {
  const parts = safeText(fullName).split(' ').filter(Boolean);
  return parts.slice(0, -1).join(' ');
}

function compareRows(left, right, mode) {
  const leftName = studentName(left);
  const rightName = studentName(right);

  if (mode === 'original') {
    return Number(left.dataset.besOriginalOrder || 0) - Number(right.dataset.besOriginalOrder || 0);
  }

  if (mode === 'fullname-asc') {
    return COLLATOR.compare(leftName, rightName)
      || Number(left.dataset.besOriginalOrder || 0) - Number(right.dataset.besOriginalOrder || 0);
  }

  const direction = mode === 'given-desc' ? -1 : 1;
  return direction * (
    COLLATOR.compare(givenName(leftName), givenName(rightName))
    || COLLATOR.compare(middleAndFamily(leftName), middleAndFamily(rightName))
  ) || Number(left.dataset.besOriginalOrder || 0) - Number(right.dataset.besOriginalOrder || 0);
}

function renumberRows(rows) {
  rows.forEach((row, index) => {
    const badge = row.querySelector('.hr-person-cell > span');
    if (badge) badge.textContent = String(index + 1).padStart(2, '0');
  });
}

function applySort(panel, mode) {
  const body = panel.querySelector('.hr-table tbody');
  if (!body) return;

  const rows = [...body.querySelectorAll(':scope > tr')];
  rows.forEach((row, index) => {
    if (!row.dataset.besOriginalOrder) row.dataset.besOriginalOrder = String(index + 1);
  });

  const sorted = [...rows].sort((left, right) => compareRows(left, right, mode));
  const changed = sorted.some((row, index) => row !== rows[index]);
  if (changed) sorted.forEach((row) => body.appendChild(row));
  renumberRows(sorted);
}

function sortAnchor(panel) {
  const tabs = panel.querySelector('.bes-roster-filter-tabs');
  if (tabs) return { type: 'tabs', node: tabs };
  const head = panel.querySelector(':scope > .hr-panel-head');
  return head ? { type: 'head', node: head } : null;
}

function createControl(panel, user) {
  let control = panel.querySelector(`.${CONTROL_CLASS}`);
  if (control) return control;

  const anchor = sortAnchor(panel);
  if (!anchor) return null;

  control = document.createElement('label');
  control.className = CONTROL_CLASS;
  control.innerHTML = `
    <span>Sắp xếp danh sách</span>
    <select aria-label="Sắp xếp danh sách học sinh">
      <option value="given-asc">Tên A → Z</option>
      <option value="given-desc">Tên Z → A</option>
      <option value="fullname-asc">Họ và tên A → Z</option>
      <option value="original">Thứ tự ban đầu</option>
    </select>`;

  if (anchor.type === 'tabs') {
    const help = anchor.node.querySelector(':scope > small');
    if (help) help.insertAdjacentElement('beforebegin', control);
    else anchor.node.appendChild(control);
  } else {
    anchor.node.insertAdjacentElement('afterend', control);
  }

  const select = control.querySelector('select');
  select.value = readMode(user);
  select.addEventListener('change', () => {
    writeMode(user, select.value);
    applySort(panel, select.value);
    window.dispatchEvent(new CustomEvent('bes-student-roster-sorted', {
      detail: { mode: select.value },
    }));
  });
  return control;
}

async function enhance() {
  if (!/homeroom|chu-nhiem|gvcn/i.test(window.location.hash || '')) return;
  const panels = rosterPanels();
  if (!panels.length) return;
  const user = await loadUser();

  panels.forEach((panel) => {
    const control = createControl(panel, user);
    const select = control?.querySelector('select');
    const savedMode = readMode(user);
    if (select && select.value !== savedMode) select.value = savedMode;
    applySort(panel, select?.value || savedMode);
  });
}

function scheduleEnhance() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    enhance().catch((error) => console.warn('[StudentNameSort] Không thể sắp xếp danh sách học sinh.', error));
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
document.addEventListener('input', (event) => {
  if (event.target.closest('.hr-filter-row')) window.setTimeout(scheduleEnhance, 0);
}, true);
document.addEventListener('change', (event) => {
  if (event.target.closest('.hr-filter-row') && !event.target.closest(`.${CONTROL_CLASS}`)) {
    window.setTimeout(scheduleEnhance, 0);
  }
}, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleEnhance, { once: true });
} else {
  scheduleEnhance();
}
