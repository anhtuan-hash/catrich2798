import { listManagedWeeklyPractices } from './utils/weeklyPractice.js';
import './styles/WeeklyManagerGradeFilter.css';

const FILTERS = ['all', '10', '11', '12'];
const contextState = new WeakMap();
let itemsCache = null;
let itemsPromise = null;
let scanFrame = 0;

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizedText(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isCreatedHeading(node) {
  const text = normalizedText(node?.textContent);
  return text === 'cac bai da tao'
    || text.includes('cac bai da tao')
    || text === 'created practices'
    || text.includes('created practices');
}

function inferGrade(item, article = null) {
  const sources = [
    item?.grade,
    item?.category,
    item?.title,
    article?.dataset?.grade,
    article?.dataset?.weeklyGrade,
    article?.textContent,
  ];
  for (const source of sources) {
    const explicit = String(source || '').match(/(?:^|\D)(10|11|12)(?:\D|$)/)?.[1];
    if (explicit) return explicit;
  }
  return '';
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
  const candidates = [...(article?.querySelectorAll?.('strong, h3, h4') || [])];
  const titleNode = candidates.find((node) => {
    const text = cleanText(node.textContent);
    return text && !/^(Công bố ngay|Chưa công bố|Chờ công bố|Lịch công bố|Bảo trì|Xóa)$/i.test(text);
  });
  return cleanText(titleNode?.textContent);
}

function directArticles(container) {
  if (!container) return [];
  const direct = [...container.children].filter((child) => child.matches?.('article'));
  if (direct.length) return direct;
  return [...container.querySelectorAll(':scope > div > article, :scope > section > article')];
}

function findArticleContainer(root) {
  if (!root) return null;
  const known = root.querySelector(
    '.bes-weekly-manage-list, [data-weekly-manage-list], [class*="weekly-manage-list"], [class*="manage-list"]',
  );
  if (known && directArticles(known).length) return known;

  const candidates = [root, ...root.querySelectorAll('div, section, main')]
    .filter((node) => directArticles(node).length);
  candidates.sort((a, b) => directArticles(b).length - directArticles(a).length);
  return candidates[0] || null;
}

function findContextForHeading(heading) {
  let scope = heading?.parentElement || null;
  for (let level = 0; scope && level < 7; level += 1, scope = scope.parentElement) {
    const list = findArticleContainer(scope);
    if (list) return { heading, list };
    if (scope.matches?.('.bes-weekly-manager--simple, .bes-weekly-manager, [role="dialog"]')) break;
  }
  return null;
}

function discoverContexts() {
  const found = [];
  const seenLists = new Set();

  document.querySelectorAll('h1, h2, h3, h4, strong').forEach((heading) => {
    if (!isCreatedHeading(heading)) return;
    const context = findContextForHeading(heading);
    if (!context || seenLists.has(context.list)) return;
    seenLists.add(context.list);
    found.push(context);
  });

  document.querySelectorAll(
    '.bes-weekly-manage-list, [data-weekly-manage-list], [class*="weekly-manage-list"]',
  ).forEach((list) => {
    if (seenLists.has(list) || !directArticles(list).length) return;
    const manager = list.closest('.bes-weekly-manager--simple, .bes-weekly-manager, [role="dialog"]') || list.parentElement;
    const heading = [...(manager?.querySelectorAll?.('h1, h2, h3, h4, strong') || [])].find(isCreatedHeading);
    if (!heading) return;
    seenLists.add(list);
    found.push({ heading, list });
  });

  return found;
}

function buildToolbar(context, state) {
  const { heading } = context;
  const existing = heading.parentElement?.querySelector(':scope > .bes-weekly-grade-filter');
  if (existing) {
    state.toolbar = existing;
    return existing;
  }

  const toolbar = document.createElement('section');
  toolbar.className = 'bes-weekly-grade-filter';
  toolbar.setAttribute('aria-label', 'Phân loại bài đã tạo theo khối');
  toolbar.innerHTML = `
    <div class="bes-weekly-grade-filter__heading">
      <strong>Phân loại theo khối</strong>
      <small>Chọn một khối để tra cứu nhanh các bài đã tạo.</small>
    </div>
    <div class="bes-weekly-grade-filter__buttons"></div>`;

  const buttons = toolbar.querySelector('.bes-weekly-grade-filter__buttons');
  FILTERS.forEach((filter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.gradeFilter = filter;
    button.innerHTML = `<span>${filter === 'all' ? 'Tất cả' : `Khối ${filter}`}</span><b>0</b>`;
    button.addEventListener('click', () => {
      state.active = filter;
      state.list.dataset.activeGradeFilter = filter;
      applyFilter(state);
    });
    buttons.appendChild(button);
  });

  heading.insertAdjacentElement('afterend', toolbar);
  state.toolbar = toolbar;
  return toolbar;
}

function matchArticles(articles, items) {
  const byId = new Map(items.map((item) => [String(item.id), item]));
  const byTitle = new Map();
  items.forEach((item) => {
    const key = normalizedText(item.title);
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(item);
  });

  return articles.map((article) => {
    const id = articleId(article);
    let item = id ? byId.get(String(id)) : null;
    if (!item) {
      const queue = byTitle.get(normalizedText(articleTitle(article))) || [];
      item = queue.shift() || null;
    }
    return { article, item, grade: inferGrade(item, article) };
  });
}

function updateToolbar(state) {
  if (!state.toolbar?.isConnected) return;
  const counts = { all: state.entries.length, 10: 0, 11: 0, 12: 0 };
  state.entries.forEach(({ grade }) => {
    if (grade && Object.prototype.hasOwnProperty.call(counts, grade)) counts[grade] += 1;
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

function applyFilter(state) {
  const { list } = state;
  const previousScrollTop = list.scrollTop;
  let visibleCount = 0;

  state.entries.forEach(({ article, grade }) => {
    const visible = state.active === 'all' || grade === state.active;
    article.hidden = !visible;
    article.classList.toggle('is-grade-filtered-out', !visible);
    article.dataset.weeklyGrade = grade || 'unclassified';
    if (visible) visibleCount += 1;
  });

  if (!state.empty?.isConnected) {
    const empty = document.createElement('div');
    empty.className = 'bes-weekly-grade-filter__empty';
    list.appendChild(empty);
    state.empty = empty;
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

async function enhanceContext(context, force = false) {
  const { list } = context;
  if (!list || list.dataset.gradeFilterLoading === '1') return;
  list.dataset.gradeFilterLoading = '1';

  let state = contextState.get(list);
  if (!state) {
    state = {
      list,
      heading: context.heading,
      active: list.dataset.activeGradeFilter || 'all',
      toolbar: null,
      entries: [],
      empty: null,
      signature: '',
    };
    contextState.set(list, state);
  } else {
    state.heading = context.heading;
  }

  try {
    if (!state.toolbar?.isConnected) buildToolbar(context, state);
    const articles = directArticles(list);
    const items = await loadItems(force).catch((error) => {
      console.warn('[WeeklyManagerGradeFilter] Không tải được dữ liệu quản trị; vẫn hiển thị bộ lọc.', error);
      return [];
    });
    const entries = matchArticles(articles, items);
    const signature = entries
      .map(({ article, item, grade }) => `${articleId(article)}|${articleTitle(article)}|${item?.id || ''}|${grade}`)
      .join('::');

    if (signature !== state.signature || force) {
      state.signature = signature;
      state.entries = entries;
      applyFilter(state);
    } else {
      updateToolbar(state);
    }
  } finally {
    list.dataset.gradeFilterLoading = '0';
  }
}

function scan(force = false) {
  discoverContexts().forEach((context) => enhanceContext(context, force));
}

function queueScan(force = false) {
  if (scanFrame) window.cancelAnimationFrame(scanFrame);
  scanFrame = window.requestAnimationFrame(() => {
    scanFrame = 0;
    scan(force);
  });
}

if (!window.__brianWeeklyManagerGradeFilterInstalledV2) {
  window.__brianWeeklyManagerGradeFilterInstalledV2 = true;
  const observer = new MutationObserver(() => queueScan(false));
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('bes-weekly-practice-updated', () => {
    itemsCache = null;
    queueScan(true);
  });
  window.addEventListener('DOMContentLoaded', () => queueScan(true), { once: true });
  queueScan(true);
}
