import { getCurrentUser } from './utils/auth.js';
import { isDepartmentLeaderRole } from './utils/roles.js';
import { listTeamTeacherAccounts } from './utils/personnelHub.js';
import {
  SCHOOL_CLASS_REGISTRY_TABLE,
  normalizeSchoolClassName,
  normalizeSchoolClassRegistry,
  schoolClassRegistryStorageKey,
} from './utils/schoolClassRegistry.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';
import './styles/TeacherClassFilter.css';

const FILTER_CLASS = 'bes-teacher-class-filter';
const EMPTY_CLASS = 'bes-teacher-class-filter-empty';
const STORAGE_PREFIX = 'bes-teacher-class-filter-v1';

let cache = null;
let loadPromise = null;
let scheduled = false;

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeIdentity(value) {
  return safeText(value).toLowerCase();
}

function storageKey(user) {
  return `${STORAGE_PREFIX}:${normalizeIdentity(user?.id || user?.email || 'ttcm')}`;
}

function readSelectedTeacher(user) {
  try { return localStorage.getItem(storageKey(user)) || 'all'; }
  catch { return 'all'; }
}

function writeSelectedTeacher(user, value) {
  try { localStorage.setItem(storageKey(user), value); }
  catch { /* local preference is optional */ }
}

function readLocalRegistry(user) {
  try {
    const raw = localStorage.getItem(schoolClassRegistryStorageKey(user));
    return normalizeSchoolClassRegistry(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeSchoolClassRegistry(null);
  }
}

async function readCloudRegistry(user) {
  if (!isSupabaseConfigured || !supabase || !user?.id) return null;
  const { data, error } = await supabase
    .from(SCHOOL_CLASS_REGISTRY_TABLE)
    .select('payload,updated_at')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (error || !data?.payload) return null;
  return normalizeSchoolClassRegistry(data.payload);
}

function accountAliases(account) {
  return new Set([
    normalizeIdentity(account?.id),
    normalizeIdentity(account?.email),
  ].filter(Boolean));
}

function assignmentValues(classItem) {
  return [
    safeText(classItem?.assignment?.homeroomTeacherId),
    ...(classItem?.assignment?.subjectTeacherIds || []),
  ].map(normalizeIdentity).filter(Boolean);
}

function accountMatchesClass(account, classItem) {
  const aliases = accountAliases(account);
  return assignmentValues(classItem).some((value) => aliases.has(value));
}

function classIsUnassigned(classItem) {
  return assignmentValues(classItem).length === 0;
}

function teacherLabel(account) {
  return safeText(account?.name || account?.email, 'Giáo viên');
}

async function loadData(force = false) {
  if (!force && cache) return cache;
  if (!force && loadPromise) return loadPromise;

  loadPromise = (async () => {
    const user = await getCurrentUser();
    if (!user || !isDepartmentLeaderRole(user.role)) {
      cache = { user, allowed: false, registry: null, accounts: [] };
      return cache;
    }

    const local = readLocalRegistry(user);
    const [cloud, accounts] = await Promise.all([
      readCloudRegistry(user).catch(() => null),
      listTeamTeacherAccounts(user).catch(() => []),
    ]);
    const localTime = Date.parse(local?.updatedAt || 0) || 0;
    const cloudTime = Date.parse(cloud?.updatedAt || 0) || 0;
    const registry = cloud && cloudTime >= localTime ? cloud : local;
    cache = { user, allowed: true, registry, accounts };
    return cache;
  })().finally(() => { loadPromise = null; });

  return loadPromise;
}

function findCatalogPanel() {
  const catalog = document.querySelector('.hr-class-catalog');
  if (!catalog) return null;
  const panel = catalog.closest('.hr-panel');
  const heading = safeText(panel?.querySelector('.hr-panel-head h2')?.textContent);
  return /Chuyển nhanh giữa các lớp/i.test(heading) ? { panel, catalog } : null;
}

function accountByAssignment(accounts, value) {
  const normalized = normalizeIdentity(value);
  return accounts.find((account) => accountAliases(account).has(normalized)) || null;
}

function assignmentDescription(classItem, accounts) {
  const homeroomValue = safeText(classItem?.assignment?.homeroomTeacherId);
  const subjectValues = classItem?.assignment?.subjectTeacherIds || [];
  const homeroom = homeroomValue
    ? teacherLabel(accountByAssignment(accounts, homeroomValue) || { name: homeroomValue })
    : '';
  const subjects = subjectValues.map((value) => (
    teacherLabel(accountByAssignment(accounts, value) || { name: value })
  )).filter(Boolean);
  return { homeroom, subjects: [...new Set(subjects)] };
}

function decorateCard(card, classItem, accounts) {
  let note = card.querySelector('.bes-class-teacher-assignment');
  if (!note) {
    note = document.createElement('div');
    note.className = 'bes-class-teacher-assignment';
    const stats = card.querySelector('.hr-class-card-stats');
    if (stats) stats.insertAdjacentElement('beforebegin', note);
    else card.appendChild(note);
  }

  const assignment = assignmentDescription(classItem, accounts);
  const parts = [];
  if (assignment.homeroom) parts.push(`<span class="is-homeroom"><b>GVCN</b>${assignment.homeroom}</span>`);
  if (assignment.subjects.length) parts.push(`<span class="is-subject"><b>GVBM</b>${assignment.subjects.join(', ')}</span>`);
  if (!parts.length) parts.push('<span class="is-unassigned"><b>Chưa phân công</b></span>');
  const html = parts.join('');
  if (note.innerHTML !== html) note.innerHTML = html;
}

function optionData(registry, accounts) {
  const classes = registry?.classes || [];
  const assigned = accounts.map((account) => ({
    value: account.id,
    label: teacherLabel(account),
    count: classes.filter((item) => accountMatchesClass(account, item)).length,
  })).filter((item) => item.count > 0)
    .sort((left, right) => left.label.localeCompare(right.label, 'vi'));
  const unassignedCount = classes.filter(classIsUnassigned).length;
  return { assigned, unassignedCount };
}

function createFilter(panel, data) {
  let host = panel.querySelector(`.${FILTER_CLASS}`);
  if (!host) {
    host = document.createElement('div');
    host.className = FILTER_CLASS;
    host.innerHTML = `
      <div class="bes-teacher-class-filter-copy">
        <small>PHÂN LOẠI THEO GIÁO VIÊN</small>
        <strong>Chọn giáo viên để chỉ hiện các lớp được phân công</strong>
      </div>
      <label><span>Giáo viên</span><select data-teacher-filter></select></label>
      <div class="bes-teacher-class-filter-result" data-filter-result></div>`;
    const heading = panel.querySelector('.hr-panel-head');
    heading?.insertAdjacentElement('afterend', host);

    host.querySelector('[data-teacher-filter]')?.addEventListener('change', (event) => {
      const currentData = host.__besTeacherClassFilterData;
      if (!currentData) return;
      writeSelectedTeacher(currentData.user, event.target.value);
      applyFilter(panel, currentData, event.target.value);
    });
  }
  host.__besTeacherClassFilterData = data;
  return host;
}

function populateSelect(select, data) {
  const { assigned, unassignedCount } = optionData(data.registry, data.accounts);
  const current = readSelectedTeacher(data.user);
  const values = new Set(['all', ...assigned.map((item) => item.value)]);
  if (unassignedCount) values.add('unassigned');
  const selected = values.has(current) ? current : 'all';
  const options = [
    { value: 'all', label: `Tất cả giáo viên (${data.registry?.classes?.length || 0} lớp)` },
    ...assigned.map((item) => ({ value: item.value, label: `${item.label} · ${item.count} lớp` })),
    ...(unassignedCount ? [{ value: 'unassigned', label: `Chưa phân công · ${unassignedCount} lớp` }] : []),
  ];
  const signature = JSON.stringify(options);

  if (select.dataset.optionsSignature !== signature) {
    select.innerHTML = '';
    options.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      select.appendChild(option);
    });
    select.dataset.optionsSignature = signature;
  }
  if (select.value !== selected) select.value = selected;
  return selected;
}

function applyFilter(panel, data, selectedTeacher) {
  const catalog = panel.querySelector('.hr-class-catalog');
  if (!catalog) return;
  const classes = data.registry?.classes || [];
  const classByName = new Map(classes.map((item) => [normalizeSchoolClassName(item.className), item]));
  const selectedAccount = data.accounts.find((account) => account.id === selectedTeacher) || null;
  const cards = [...catalog.querySelectorAll(':scope > article')];
  let visibleCount = 0;

  cards.forEach((card) => {
    const className = normalizeSchoolClassName(card.querySelector('h3')?.textContent);
    const classItem = classByName.get(className) || null;
    if (classItem) decorateCard(card, classItem, data.accounts);

    const visible = selectedTeacher === 'all'
      || (selectedTeacher === 'unassigned' ? classIsUnassigned(classItem) : accountMatchesClass(selectedAccount, classItem));
    card.hidden = !visible;
    card.classList.toggle('is-teacher-filtered-out', !visible);
    if (visible) visibleCount += 1;
  });

  const result = panel.querySelector('[data-filter-result]');
  if (result) {
    const label = selectedTeacher === 'all'
      ? 'Tất cả giáo viên'
      : selectedTeacher === 'unassigned'
        ? 'Chưa phân công'
        : teacherLabel(selectedAccount);
    const html = `<b>${visibleCount}</b><span>lớp của ${label}</span>`;
    if (result.innerHTML !== html) result.innerHTML = html;
  }

  let empty = panel.querySelector(`.${EMPTY_CLASS}`);
  if (!empty) {
    empty = document.createElement('div');
    empty.className = EMPTY_CLASS;
    empty.textContent = 'Giáo viên này chưa được phân công lớp nào.';
    catalog.insertAdjacentElement('afterend', empty);
  }
  empty.hidden = visibleCount > 0;
}

async function enhance() {
  if (!/homeroom|chu-nhiem|gvcn/i.test(window.location.hash || '')) return;
  const found = findCatalogPanel();
  if (!found) return;
  const data = await loadData();
  if (!data.allowed || !data.registry) return;

  const host = createFilter(found.panel, data);
  const select = host.querySelector('[data-teacher-filter]');
  const selected = populateSelect(select, data);
  applyFilter(found.panel, data, selected);
}

function scheduleEnhance() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    enhance().catch((error) => console.warn('[TeacherClassFilter] Không thể tải bộ lọc giáo viên.', error));
  });
}

function invalidateAndRefresh() {
  cache = null;
  scheduleEnhance();
}

const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => [...mutation.addedNodes].some((node) => node.nodeType === 1))) scheduleEnhance();
});
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener('hashchange', scheduleEnhance);
window.addEventListener('bes-homeroom-store-updated', scheduleEnhance);
window.addEventListener('bes-school-class-registry-updated', invalidateAndRefresh);
document.addEventListener('click', () => window.setTimeout(scheduleEnhance, 0), true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleEnhance, { once: true });
} else {
  scheduleEnhance();
}
