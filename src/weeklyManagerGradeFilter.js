import { listManagedWeeklyPractices } from './utils/weeklyPractice.js';
import './styles/WeeklyManagerGradeFilter.css';

const LIST_SELECTOR = '.bes-weekly-manager--simple .bes-weekly-manage-list';
const FILTERS = ['all', '10', '11', '12'];
const listState = new WeakMap();
let itemsCache = null;
let itemsPromise = null;
let scanFrame = 0;

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function inferGrade(item) {
  const explicit = String(item?.grade || '').match(/(?:^|\D)(10|11|12)(?:\D|$)/)?.[1];
  if (explicit) return explicit;
  const source = `${item?.category || ''} ${item?.title || ''}`;
  return source.match(/(?:tiếng\s*anh|english|khối|grade)\s*(10|11|12)/i)?.[1] || '';
}

async function loadItems(force = false) {
  if (!force && itemsCache) return itemsCache;
  if (itemsPromise) return itemsPromise;
  itemsPromise = listManagedWeeklyPractices()
    .then((items) => {
      itemsCache = Array.isArray(items) ? items : [];
      return itemsCache;
    })
    .finally(() => { itemsPromise = null; });
  return itemsPromise;
}

function articleId(article) {
  return article?.dataset?.practiceId
    || article?.getAttribute?.('data-item-id')
    || article?.getAttribute?.('data-id')
    || '';
}

function articleTitle(article) {
  return cleanText(article?.querySelector('strong, h3')?.textContent);
}

function matchArticles(articles, items) {
  const byId = new Map(items.map((item) => [String(item.id), item]));
  const byTitle = new Map();
  items.forEach((item) => {
    const key = cleanText(item.title);
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(item);
  });

  return articles.map((article) => {
    const id = articleId(article);
    let item = id ? byId.get(String(id)) : null;
    if (!item) {
      const queue = byTitle.get(articleTitle(article)) || [];
      item = queue.shift() || null;
    }
    return { article, item, grade: inferGrade(item) };
  });
}

function buildToolbar(list, state) {
  const toolbar = document.createElement('section');
  toolbar.className = 'bes-weekly-grade-filter';
  toolbar.setAttribute('aria-label', 'Phân loại bài đã tạo theo khối');

  const heading = document.createElement('div');
  heading.className = 'bes-weekly-grade-filter__heading';
  heading.innerHTML = '<strong>Phân loại theo khối</strong><small>Chọn một khối để tra cứu nhanh các bài đã tạo.</small>';

  const buttons = document.createElement('div');
  buttons.className = 'bes-weekly-grade-filter__buttons';
  FILTERS.forEach((filter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.gradeFilter = filter;
    button.innerHTML = `<span>${filter === 'all' ? 'Tất cả' : `Khối ${filter}`}</span><b>0</b>`;
    button.addEventListener('click', () => {
      state.active = filter;
      list.dataset.activeGradeFilter = filter;
      applyFilter(list, state);
    });
    buttons.appendChild(button);
  });

  toolbar.append(heading, buttons);
  list.insertAdjacentElement('beforebegin', toolbar);
  state.toolbar = toolbar;
  return toolbar;
}

function updateToolbar(state) {
  if (!state.toolbar) return;
  const counts = { all: state.entries.length, 10: 0, 11: 0, 12: 0 };
  state.entries.forEach(({ grade }) => {
    if (grade && counts[grade] !== undefined) counts[grade] += 1;
  });

  state.toolbar.querySelectorAll('button[data-grade-filter]').forEach((button) => {
    const filter = button.dataset.gradeFilter;
    const count = counts[filter] || 0;
    const badge = button.querySelector('b');
    if (badge) badge.textContent = String(count);
    const active = filter === state.active;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.disabled = filter !== 'all' && count === 0;
  });
}

function applyFilter(list, state) {
  const previousScrollTop = list.scrollTop;
  let visibleCount = 0;
  state.entries.forEach(({ article, grade }) => {
    const visible = state.active === 'all' || grade === state.active;
    article.hidden = !visible;
    article.classList.toggle('is-grade-filtered-out', !visible);
    article.dataset.weeklyGrade = grade || 'unclassified';
    if (visible) visibleCount += 1;
  });

  if (!state.empty) {
    state.empty = document.createElement('div');
    state.empty.className = 'bes-weekly-grade-filter__empty';
    list.appendChild(state.empty);
  }
  state.empty.hidden = visibleCount > 0;
  state.empty.textContent = state.active === 'all'
    ? 'Chưa có bài luyện tập nào.'
    : `Chưa có bài thuộc Khối ${state.active}.`;

  updateToolbar(state);
  window.requestAnimationFrame(() => {
    if (list.isConnected) list.scrollTop = previousScrollTop;
  });
}

async function enhanceList(list, force = false) {
  if (!list || list.dataset.gradeFilterLoading === '1') return;
  list.dataset.gradeFilterLoading = '1';
  try {
    const articles = [...list.querySelectorAll(':scope > article')];
    let state = listState.get(list);
    if (!state) {
      state = {
        active: list.dataset.activeGradeFilter || 'all',
        toolbar: null,
        entries: [],
        empty: null,
        signature: '',
      };
      listState.set(list, state);
    }

    if (!state.toolbar?.isConnected) buildToolbar(list, state);
    const items = await loadItems(force);
    const entries = matchArticles(articles, items);
    const signature = entries.map(({ article, item, grade }) => `${articleId(article)}|${articleTitle(article)}|${item?.id || ''}|${grade}`).join('::');
    if (signature !== state.signature || force) {
      state.signature = signature;
      state.entries = entries;
      applyFilter(list, state);
    } else {
      updateToolbar(state);
    }
  } catch (error) {
    console.warn('[WeeklyManagerGradeFilter] Không thể phân loại danh sách bài.', error);
  } finally {
    list.dataset.gradeFilterLoading = '0';
  }
}

function scan(force = false) {
  document.querySelectorAll(LIST_SELECTOR).forEach((list) => enhanceList(list, force));
}

function queueScan(force = false) {
  if (scanFrame) window.cancelAnimationFrame(scanFrame);
  scanFrame = window.requestAnimationFrame(() => {
    scanFrame = 0;
    scan(force);
  });
}

if (!window.__brianWeeklyManagerGradeFilterInstalled) {
  window.__brianWeeklyManagerGradeFilterInstalled = true;
  const observer = new MutationObserver(() => queueScan(false));
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('bes-weekly-practice-updated', () => {
    itemsCache = null;
    queueScan(true);
  });
  window.addEventListener('DOMContentLoaded', () => queueScan(true), { once: true });
  queueScan(true);
}
