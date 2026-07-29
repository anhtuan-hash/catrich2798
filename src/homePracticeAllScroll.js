import './styles/HomePracticeAllScroll.css';
import {
  getWeeklyPracticeAvailability,
  listPublicWeeklyPractices,
  readWeeklyPracticeProgress,
} from './utils/weeklyPractice.js';

const HOME_HUB = ".metro-clean-system[data-route='home'] .bha-practice";
const LEGACY_ROOT = '#bes-weekly-practice-root';
const BROWSER_CLASS = 'bha-uploaded-browser';
let cachedItems = [];
let loadingPromise = null;
let scanFrame = 0;

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function inferGrade(item) {
  const explicit = String(item?.grade || '').match(/(?:^|\D)(10|11|12)(?:\D|$)/)?.[1];
  if (explicit) return Number(explicit);
  return Number(String(item?.title || '').match(/(?:tiếng\s*anh|english)\s*(10|11|12)/i)?.[1] || 10);
}

function palette(grade) {
  if (grade === 10) return { accent: '#1a73e8', soft: '#eaf3ff' };
  if (grade === 11) return { accent: '#7e42d3', soft: '#f3edff' };
  return { accent: '#24963b', soft: '#edf8ef' };
}

function safeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function shortDate(value) {
  const date = safeDate(value);
  return date ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date) : '';
}

function scheduleLabel(item) {
  const weekMatch = cleanText(item?.week_key).match(/W(?:eek)?[-_ ]?(\d+)/i) || cleanText(item?.week_key).match(/(\d+)/);
  const week = weekMatch?.[1] || cleanText(item?.week_key) || '—';
  const opens = safeDate(item?.opens_at);
  const month = opens ? opens.getMonth() + 1 : 8;
  const semester = month >= 7 ? 'Học kì 1' : month <= 5 ? 'Học kì 2' : 'Hè';
  const range = [shortDate(item?.opens_at), shortDate(item?.closes_at)].filter(Boolean).join(' - ');
  return [`Tuần ${week}`, semester, range].filter(Boolean).join(' | ');
}

function progressLabel(item) {
  const progress = readWeeklyPracticeProgress(item?.id) || {};
  if (progress.submitted) return '✓ Đã gửi TTCM';
  if (progress.identity) return 'Đang làm';
  return 'Chưa bắt đầu';
}

function actionLabel(item) {
  const availability = getWeeklyPracticeAvailability(item);
  const progress = readWeeklyPracticeProgress(item?.id) || {};
  if (availability.state === 'upcoming') return 'Xem lịch';
  if (progress.submitted) return 'Xem lại';
  if (progress.identity) return 'Tiếp tục';
  return 'Mở bài';
}

function findLegacyButton(item) {
  const root = document.querySelector(LEGACY_ROOT);
  if (!root || !item) return null;
  const card = [...root.querySelectorAll('[data-practice-id]')]
    .find((node) => String(node.dataset.practiceId || '') === String(item.id || ''));
  if (card) return card.querySelector('.bes-weekly-grade-card__action > button, button:not([disabled])');
  const article = [...root.querySelectorAll('.bes-weekly-featured, .bes-weekly-list article')]
    .find((node) => cleanText(node.querySelector('h3, strong')?.textContent) === cleanText(item.title));
  return article?.querySelector('button:not([disabled])') || null;
}

function openPractice(item, attempt = 0) {
  const availability = getWeeklyPracticeAvailability(item);
  if (availability.state === 'upcoming') {
    const date = safeDate(item.opens_at);
    const label = date ? new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(date) : 'thời điểm đã đặt lịch';
    window.alert(`Bài sẽ mở vào ${label}.`);
    return;
  }
  if (!availability.canOpen) {
    window.alert(availability.label || 'Bài hiện chưa thể mở.');
    return;
  }
  const button = findLegacyButton(item);
  if (button) {
    button.click();
    return;
  }
  if (attempt < 10) {
    window.setTimeout(() => openPractice(item, attempt + 1), 180);
    return;
  }
  window.alert('Bài đang được đồng bộ. Hãy thử lại sau vài giây.');
}

function createCard(item) {
  const grade = inferGrade(item);
  const colors = palette(grade);
  const availability = getWeeklyPracticeAvailability(item);
  const duration = Math.max(45, Number(item?.duration_minutes || 45));
  const card = document.createElement('article');
  card.className = 'bha-uploaded-card';
  card.style.setProperty('--accent', colors.accent);
  card.style.setProperty('--soft', colors.soft);

  const top = document.createElement('header');
  const gradeLabel = document.createElement('span');
  gradeLabel.textContent = `KHỐI ${grade}`;
  const status = document.createElement('b');
  status.className = `is-${availability.state}`;
  status.innerHTML = '<i></i>';
  status.append(document.createTextNode(availability.label || 'Chưa sẵn sàng'));
  top.append(gradeLabel, status);

  const title = document.createElement('h4');
  title.textContent = cleanText(item.title) || `Tiếng Anh ${grade}`;
  const schedule = document.createElement('p');
  schedule.textContent = scheduleLabel(item);

  const meta = document.createElement('div');
  meta.className = 'bha-uploaded-card__meta';
  const time = document.createElement('span');
  time.textContent = `◷ ${duration} phút`;
  const progress = document.createElement('strong');
  progress.textContent = progressLabel(item);
  meta.append(time, progress);

  const button = document.createElement('button');
  button.type = 'button';
  button.innerHTML = `<span>${actionLabel(item)}</span><b aria-hidden="true">→</b>`;
  button.addEventListener('click', () => openPractice(item));
  card.append(top, title, schedule, meta, button);
  return card;
}

function expandedFromHub(hub) {
  const button = hub.querySelector('.bha-practice-header-actions > button:last-child');
  const label = cleanText(button?.textContent).toLowerCase();
  return label.includes('thu gọn') || label.includes('hide');
}

function syncBrowserVisibility(hub, browser) {
  const expanded = expandedFromHub(hub);
  browser.hidden = !expanded;
  browser.setAttribute('aria-hidden', expanded ? 'false' : 'true');
}

function renderBrowser(hub, items) {
  let browser = hub.querySelector(`:scope > .${BROWSER_CLASS}`);
  if (!browser) {
    browser = document.createElement('section');
    browser.className = BROWSER_CLASS;
    browser.innerHTML = `
      <header>
        <div><h3>Tất cả bài đã được đưa lên</h3><p>Kéo ngang hoặc dùng thanh cuộn để xem toàn bộ bài tập.</p></div>
        <span data-uploaded-count></span>
      </header>
      <div class="bha-uploaded-track" tabindex="0" aria-label="Danh sách toàn bộ bài luyện tập"></div>`;
    hub.appendChild(browser);
  }

  browser.querySelector('[data-uploaded-count]').textContent = `${items.length} bài`;
  const track = browser.querySelector('.bha-uploaded-track');
  track.replaceChildren(...items.map(createCard));
  syncBrowserVisibility(hub, browser);
}

async function loadItems(force = false) {
  if (!force && cachedItems.length) return cachedItems;
  if (!force && loadingPromise) return loadingPromise;
  loadingPromise = listPublicWeeklyPractices()
    .then((items) => {
      const rank = (item) => ({ open: 0, upcoming: 1, closed: 2 }[getWeeklyPracticeAvailability(item).state] ?? 3);
      cachedItems = [...(items || [])].sort((a, b) => rank(a) - rank(b)
        || Number(b.is_featured) - Number(a.is_featured)
        || new Date(b.opens_at || 0) - new Date(a.opens_at || 0));
      return cachedItems;
    })
    .catch(() => cachedItems)
    .finally(() => { loadingPromise = null; });
  return loadingPromise;
}

async function scan(force = false) {
  scanFrame = 0;
  const hub = document.querySelector(HOME_HUB);
  if (!hub) return;
  const items = await loadItems(force);
  renderBrowser(hub, items);
  const toggle = hub.querySelector('.bha-practice-header-actions > button:last-child');
  if (toggle && toggle.dataset.uploadedScrollBound !== '1') {
    toggle.dataset.uploadedScrollBound = '1';
    toggle.addEventListener('click', () => window.setTimeout(() => {
      const browser = hub.querySelector(`:scope > .${BROWSER_CLASS}`);
      if (browser) syncBrowserVisibility(hub, browser);
    }, 30));
  }
}

function queueScan(force = false) {
  if (scanFrame) cancelAnimationFrame(scanFrame);
  scanFrame = requestAnimationFrame(() => scan(force));
}

const observer = new MutationObserver(() => queueScan(false));
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
window.addEventListener('focus', () => queueScan(true));
window.addEventListener('storage', () => queueScan(false));
window.addEventListener('hashchange', () => queueScan(true));
window.setInterval(() => queueScan(true), 30000);
window.addEventListener('DOMContentLoaded', () => queueScan(true), { once: true });
queueScan(true);
