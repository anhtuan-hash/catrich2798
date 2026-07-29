import { listManagedWeeklyPractices, WEEKLY_PRACTICE_TABLE } from './utils/weeklyPractice.js';
import { invalidateSupabaseReadCacheForTable, supabase } from './utils/supabase.js';
import './styles/WeeklyManagerBulkActions.css';

const LIST_SELECTOR = '.bes-weekly-manager--simple .bes-weekly-manage-list';
const stateByList = new WeakMap();
let cachedItems = null;
let cachedItemsPromise = null;
let scanFrame = 0;

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeForSort(value) {
  return cleanText(value).toLocaleLowerCase('vi');
}

function localParts(value = new Date(Date.now() + 60 * 60 * 1000)) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  const iso = date.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function combineLocalDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function publicationLabel(mode) {
  return {
    keep: 'Giữ nguyên trạng thái',
    published: 'Công bố ngay',
    draft: 'Chưa công bố',
    pending: 'Chờ công bố',
    scheduled: 'Lịch công bố',
  }[mode] || 'Giữ nguyên trạng thái';
}

function databaseStatusForMode(mode) {
  if (mode === 'pending') return 'archived';
  if (mode === 'scheduled') return 'published';
  return mode;
}

function managerMessage(manager, text, isError = false) {
  if (!manager) return;
  let message = manager.querySelector('.bes-weekly-manager__message');
  if (!message && manager.querySelector('header')) {
    message = document.createElement('div');
    message.className = 'bes-weekly-manager__message';
    manager.querySelector('header').insertAdjacentElement('afterend', message);
  }
  if (!message) return;
  message.textContent = text;
  message.classList.toggle('is-error', isError);
}

async function loadItems(force = false) {
  if (!force && cachedItems) return cachedItems;
  if (!force && cachedItemsPromise) return cachedItemsPromise;
  cachedItemsPromise = listManagedWeeklyPractices()
    .then((items) => {
      cachedItems = Array.isArray(items) ? items : [];
      return cachedItems;
    })
    .finally(() => { cachedItemsPromise = null; });
  return cachedItemsPromise;
}

function articleTitle(article) {
  return cleanText(article?.querySelector(':scope > div > strong, :scope strong')?.textContent);
}

function directArticles(list) {
  return [...list.querySelectorAll(':scope > article')];
}

function visibleArticles(list) {
  return directArticles(list).filter((article) => !article.hidden && !article.classList.contains('is-grade-filtered-out'));
}

function updateSelectionUi(state) {
  const articles = directArticles(state.list);
  let selectedVisible = 0;
  let visibleCount = 0;
  articles.forEach((article) => {
    const id = article.dataset.practiceId || '';
    const visible = !article.hidden && !article.classList.contains('is-grade-filtered-out');
    const checkbox = article.querySelector('.bes-weekly-bulk-check input');
    const selected = Boolean(id && state.selected.has(id));
    if (checkbox) checkbox.checked = selected;
    article.classList.toggle('is-bulk-selected', selected);
    if (visible) {
      visibleCount += 1;
      if (selected) selectedVisible += 1;
    }
  });

  if (state.selectedCount) state.selectedCount.textContent = `${state.selected.size} bài đã chọn`;
  if (state.selectAll) {
    state.selectAll.disabled = visibleCount === 0;
    state.selectAll.textContent = visibleCount > 0 && selectedVisible === visibleCount
      ? 'Bỏ chọn bài đang hiện'
      : 'Chọn tất cả bài đang hiện';
  }
  if (state.clearSelection) state.clearSelection.disabled = state.selected.size === 0;
  if (state.applyButton) state.applyButton.disabled = state.selected.size === 0 || state.applying;
}

function applySort(state) {
  const articles = directArticles(state.list);
  const sorted = [...articles].sort((left, right) => {
    const result = normalizeForSort(articleTitle(left)).localeCompare(
      normalizeForSort(articleTitle(right)),
      'vi',
      { numeric: true, sensitivity: 'base' },
    );
    return state.sortDirection === 'az' ? result : -result;
  });

  const currentIds = articles.map((article) => article.dataset.practiceId || articleTitle(article)).join('|');
  const sortedIds = sorted.map((article) => article.dataset.practiceId || articleTitle(article)).join('|');
  if (currentIds !== sortedIds) sorted.forEach((article) => state.list.appendChild(article));
  if (state.sortButton) state.sortButton.textContent = state.sortDirection === 'az' ? 'A → Z' : 'Z → A';
}

function ensureArticleCheckbox(article, state) {
  const id = article.dataset.practiceId || '';
  if (!id || article.querySelector('.bes-weekly-bulk-check')) return;
  const label = document.createElement('label');
  label.className = 'bes-weekly-bulk-check';
  label.title = `Chọn ${articleTitle(article)}`;
  label.innerHTML = '<input type="checkbox"><span aria-hidden="true"></span>';
  const input = label.querySelector('input');
  input.setAttribute('aria-label', `Chọn ${articleTitle(article)}`);
  input.checked = state.selected.has(id);
  input.addEventListener('change', () => {
    if (input.checked) state.selected.add(id);
    else state.selected.delete(id);
    updateSelectionUi(state);
  });
  article.insertAdjacentElement('afterbegin', label);
}

function buildToolbar(list, state) {
  const nativeFilter = list.querySelector(':scope > .bes-weekly-grade-filter--native');
  const toolbar = document.createElement('section');
  toolbar.className = 'bes-weekly-bulk-toolbar';
  toolbar.setAttribute('aria-label', 'Sắp xếp và cài đặt nhanh nhiều bài');
  const defaults = localParts();
  toolbar.innerHTML = `
    <div class="bes-weekly-bulk-toolbar__top">
      <div class="bes-weekly-bulk-toolbar__selection">
        <button type="button" data-action="select-all">Chọn tất cả bài đang hiện</button>
        <button type="button" data-action="clear-selection" disabled>Bỏ chọn</button>
        <strong data-role="selected-count">0 bài đã chọn</strong>
      </div>
      <button class="bes-weekly-bulk-toolbar__sort" type="button" data-action="sort">A → Z</button>
    </div>
    <div class="bes-weekly-bulk-toolbar__settings">
      <label><span>Chuyển khối</span><select data-role="grade"><option value="keep">Giữ nguyên</option><option value="10">Tiếng Anh 10</option><option value="11">Tiếng Anh 11</option><option value="12">Tiếng Anh 12</option></select></label>
      <label><span>Trạng thái chung</span><select data-role="mode"><option value="keep">Giữ nguyên</option><option value="published">Công bố ngay</option><option value="draft">Chưa công bố</option><option value="pending">Chờ công bố</option><option value="scheduled">Lịch công bố</option></select></label>
      <div class="bes-weekly-bulk-toolbar__schedule" data-role="schedule" hidden><label><span>Ngày</span><input data-role="date" type="date" value="${defaults.date}" min="${localParts(new Date()).date}"></label><label><span>Giờ</span><input data-role="time" type="time" value="${defaults.time}" step="60"></label></div>
      <button class="bes-weekly-bulk-toolbar__apply" type="button" data-action="apply" disabled>Áp dụng cho bài đã chọn</button>
    </div>`;

  if (nativeFilter) nativeFilter.insertAdjacentElement('afterend', toolbar);
  else list.querySelector(':scope > h3')?.insertAdjacentElement('afterend', toolbar);

  state.toolbar = toolbar;
  state.selectAll = toolbar.querySelector('[data-action="select-all"]');
  state.clearSelection = toolbar.querySelector('[data-action="clear-selection"]');
  state.selectedCount = toolbar.querySelector('[data-role="selected-count"]');
  state.sortButton = toolbar.querySelector('[data-action="sort"]');
  state.gradeSelect = toolbar.querySelector('[data-role="grade"]');
  state.modeSelect = toolbar.querySelector('[data-role="mode"]');
  state.schedule = toolbar.querySelector('[data-role="schedule"]');
  state.dateInput = toolbar.querySelector('[data-role="date"]');
  state.timeInput = toolbar.querySelector('[data-role="time"]');
  state.applyButton = toolbar.querySelector('[data-action="apply"]');

  state.selectAll.addEventListener('click', () => {
    const articles = visibleArticles(list);
    const ids = articles.map((article) => article.dataset.practiceId).filter(Boolean);
    const allSelected = ids.length > 0 && ids.every((id) => state.selected.has(id));
    ids.forEach((id) => {
      if (allSelected) state.selected.delete(id);
      else state.selected.add(id);
    });
    updateSelectionUi(state);
  });

  state.clearSelection.addEventListener('click', () => {
    state.selected.clear();
    updateSelectionUi(state);
  });

  state.sortButton.addEventListener('click', () => {
    state.sortDirection = state.sortDirection === 'az' ? 'za' : 'az';
    applySort(state);
  });

  state.modeSelect.addEventListener('change', () => {
    state.schedule.hidden = state.modeSelect.value !== 'scheduled';
  });

  state.applyButton.addEventListener('click', () => applyBulkSettings(state));
  return toolbar;
}

async function applyBulkSettings(state) {
  if (state.applying || state.selected.size === 0) return;
  const grade = state.gradeSelect?.value || 'keep';
  const mode = state.modeSelect?.value || 'keep';
  if (grade === 'keep' && mode === 'keep') {
    managerMessage(state.manager, 'Hãy chọn khối hoặc trạng thái cần áp dụng.', true);
    return;
  }

  const ids = [...state.selected];
  const patch = { updated_at: new Date().toISOString() };
  if (grade !== 'keep') patch.grade = grade;

  if (mode !== 'keep') {
    patch.status = databaseStatusForMode(mode);
    patch.is_featured = mode === 'published' || mode === 'scheduled';
    if (mode === 'published') {
      patch.opens_at = new Date().toISOString();
      patch.published_at = patch.opens_at;
    } else if (mode === 'scheduled') {
      const scheduledAt = combineLocalDateTime(state.dateInput?.value, state.timeInput?.value);
      if (!scheduledAt || scheduledAt.getTime() <= Date.now()) {
        managerMessage(state.manager, 'Lịch công bố phải là một thời điểm trong tương lai.', true);
        return;
      }
      patch.opens_at = scheduledAt.toISOString();
      patch.published_at = scheduledAt.toISOString();
    } else {
      patch.published_at = null;
    }
  }

  state.applying = true;
  state.applyButton.disabled = true;
  state.applyButton.textContent = `Đang áp dụng cho ${ids.length} bài…`;
  managerMessage(state.manager, `Đang cập nhật ${ids.length} bài đã chọn…`);

  try {
    const { error } = await supabase
      .from(WEEKLY_PRACTICE_TABLE)
      .update(patch)
      .in('id', ids);
    if (error) throw error;

    invalidateSupabaseReadCacheForTable(WEEKLY_PRACTICE_TABLE);
    cachedItems = null;
    state.selected.clear();
    managerMessage(
      state.manager,
      `Đã cập nhật ${ids.length} bài${grade !== 'keep' ? ` · Tiếng Anh ${grade}` : ''}${mode !== 'keep' ? ` · ${publicationLabel(mode)}` : ''}. Bảng quản lý vẫn được giữ mở.`,
    );
    window.dispatchEvent(new CustomEvent('bes-weekly-manager-refresh', { detail: { ids, grade, mode } }));
    window.dispatchEvent(new CustomEvent('bes-weekly-practice-updated', { detail: { ids, grade, mode, source: 'manager-bulk-settings' } }));
  } catch (error) {
    managerMessage(state.manager, error?.message || 'Không thể áp dụng cài đặt cho các bài đã chọn.', true);
  } finally {
    state.applying = false;
    state.applyButton.textContent = 'Áp dụng cho bài đã chọn';
    updateSelectionUi(state);
  }
}

async function enhanceList(list) {
  if (!list?.isConnected) return;
  let state = stateByList.get(list);
  if (!state) {
    state = {
      list,
      manager: list.closest('.bes-weekly-manager--simple'),
      selected: new Set(),
      sortDirection: 'az',
      applying: false,
      toolbar: null,
    };
    stateByList.set(list, state);
  }

  if (!state.toolbar?.isConnected) buildToolbar(list, state);

  const items = await loadItems().catch((error) => {
    managerMessage(state.manager, error?.message || 'Không thể tải danh sách bài để cài đặt nhanh.', true);
    return [];
  });
  const byId = new Map(items.map((item) => [String(item.id), item]));
  const titleQueues = new Map();
  items.forEach((item) => {
    const title = cleanText(item.title);
    if (!titleQueues.has(title)) titleQueues.set(title, []);
    titleQueues.get(title).push(item);
  });

  directArticles(list).forEach((article) => {
    let id = article.dataset.practiceId || '';
    if (!id || !byId.has(String(id))) {
      const queue = titleQueues.get(articleTitle(article)) || [];
      const item = queue.shift();
      if (item) {
        id = String(item.id);
        article.dataset.practiceId = id;
      }
    }
    if (id) ensureArticleCheckbox(article, state);
  });

  applySort(state);
  updateSelectionUi(state);
}

function scan() {
  document.querySelectorAll(LIST_SELECTOR).forEach((list) => enhanceList(list));
}

function queueScan() {
  if (scanFrame) return;
  scanFrame = window.requestAnimationFrame(() => {
    scanFrame = 0;
    scan();
  });
}

if (!window.__brianWeeklyManagerBulkActionsInstalled) {
  window.__brianWeeklyManagerBulkActionsInstalled = true;
  const observer = new MutationObserver(queueScan);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('bes-weekly-manager-refresh', () => {
    cachedItems = null;
    queueScan();
  });
  window.addEventListener('DOMContentLoaded', queueScan, { once: true });
  queueScan();
}
